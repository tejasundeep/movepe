/**
 * Advanced Moving Cost Estimator Engine
 * 
 * A sophisticated system for accurately estimating moving costs with:
 * - Comprehensive factor analysis including time-based pricing
 * - Real-world route calculations
 * - Dynamic market adjustments
 * - Vendor-specific calibration
 */

import { default as nodeFetch } from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const fetch = (...args) => nodeFetch(...args);

// ---------------- Configuration ---------------- //

const CONFIG = {
  // API Configuration
  CACHE_TTL: 3600000, // 1 hour TTL for caching
  RETRY_ATTEMPTS: 3,
  INITIAL_BACKOFF: 300,
  USER_AGENT: 'MovingCostEstimator/2.0 (contact@example.com)',
  MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
  
  // Tax Configuration
  GST_RATE: 0.18,
  
  // Cost Adjustment Factors
  PEAK_SEASON_MONTHS: [5, 6, 7, 8], // May through August
  WEEKEND_SURCHARGE: 0.15, // 15% extra on weekends
  FLOOR_COST_PER_LEVEL: 500, // Additional cost per floor
  ELEVATOR_DISCOUNT: 0.7, // 30% discount on floor charges when elevator is available
  PARKING_DISTANCE_RATES: [0, 500, 1000, 1500], // Rates for 0-50m, 50-100m, 100-150m, 150m+
  FUEL_PRICE_BASE: 100, // Base fuel price used in original calculation
  SPECIAL_ITEM_CATEGORIES: {
    'standard': 1000,
    'fragile': 1800,
    'valuable': 2500,
    'oversized': 3000
  },
  
  // Defaults
  DEFAULT_DISTANCE: 50,
  MIN_DISTANCE: 5, // Minimum distance to charge for local moves
};

// Base moving cost by home size and location tier
const movingCostTable = {
  "1RK": { "Metro": 4500, "Normal City": 4000, "Town": 3500, "Village": 3800 },
  "1BHK": { "Metro": 6000, "Normal City": 5300, "Town": 4500, "Village": 4900 },
  "2BHK": { "Metro": 9000, "Normal City": 7700, "Town": 6900, "Village": 7400 },
  "3BHK": { "Metro": 14000, "Normal City": 12500, "Town": 11200, "Village": 11900 },
  "4BHK": { "Metro": 20000, "Normal City": 17500, "Town": 16000, "Village": 16700 },
  "5BHK": { "Metro": 23000, "Normal City": 20000, "Town": 18500, "Village": 19500 },
  "Villa": { "Metro": 26000, "Normal City": 23500, "Town": 21000, "Village": 22200 }
};

// Per-km rate based on move type, expanded with more combinations
const perKmRate = {
  "Metro-Metro": 40, "Metro-Normal": 45, "Metro-Town": 50, "Metro-Village": 55,
  "Normal-Metro": 45, "Normal-Normal": 42, "Normal-Town": 47, "Normal-Village": 52,
  "Town-Metro": 50, "Town-Normal": 47, "Town-Town": 42, "Town-Village": 48,
  "Village-Metro": 55, "Village-Normal": 52, "Village-Town": 48, "Village-Village": 52
};

// Time-based adjustment factors
const timeFactors = {
  // Month-based factors (1=January)
  months: {
    1: 0.9, 2: 0.9, 3: 0.95, 4: 1.0,
    5: 1.15, 6: 1.25, 7: 1.25, 8: 1.15,
    9: 1.05, 10: 1.0, 11: 0.95, 12: 0.9
  },
  // Day of week factors (0=Sunday)
  daysOfWeek: {
    0: 1.1, 1: 0.9, 2: 0.9, 3: 0.9,
    4: 0.95, 5: 1.1, 6: 1.2
  },
  // Public holidays (format: "MM-DD")
  publicHolidays: {
    "01-01": 1.3, // New Year
    "01-26": 1.3, // Republic Day
    "08-15": 1.3, // Independence Day
    "10-02": 1.3, // Gandhi Jayanti
    "12-25": 1.3  // Christmas
  }
};

// Premium vendor markup by region
const vendorMarkup = {
  "default": 1.0,  // No markup
  "premium": 1.25, // 25% markup for premium vendors
  "economy": 0.85, // 15% discount for economy vendors
  "regional": {
    // Region-specific vendor adjustments
    "delhi-ncr": { "premium": 1.3, "default": 1.05, "economy": 0.9 },
    "mumbai": { "premium": 1.35, "default": 1.1, "economy": 0.9 },
    "bangalore": { "premium": 1.28, "default": 1.05, "economy": 0.88 }
  }
};

// Road quality factor by region for transport cost adjustment
const roadQualityFactor = {
  "default": 1.0,
  "delhi-ncr": 0.95,
  "mumbai": 1.1,
  "bangalore": 1.0,
  "hilly-regions": 1.35
};

// Parcel delivery pricing configuration
const parcelPricingConfig = {
  // Base price per km for different distance categories (Rapido-style)
  baseRatePerKm: {
    intracity: 10,     // 0-30 km (within city)
    nearbyCity: 8,     // 31-100 km
    intercity: 7,      // 101-300 km
    longDistance: 6    // 300+ km
  },
  
  // Minimum charges by distance category
  minimumCharge: {
    intracity: 60,
    nearbyCity: 250,
    intercity: 700,
    longDistance: 1800
  },
  
  // Weight slabs (in kg) and their multipliers
  weightSlabs: {
    upto5: { max: 5, multiplier: 1.0 },
    upto10: { max: 10, multiplier: 1.5 },
    upto15: { max: 15, multiplier: 2.0 },
    upto20: { max: 20, multiplier: 2.5 },
    above20: { multiplier: 3.0 }
  },
  
  // Special handling multipliers
  specialHandlingMultipliers: {
    fragile: 1.3
  },
  
  // Volumetric weight calculation factor (L*W*H in cm / 5000)
  volumetricFactor: 5000,
  
  // Surge pricing factors
  surgePricing: {
    peakHours: 1.2,     // 6-9 AM and 5-8 PM
    weekends: 1.15,     // Weekends
    holidays: 1.25,     // Public holidays
    badWeather: 1.3     // Rain, storms, etc.
  },
  
  // Rider incentives
  riderIncentives: {
    longDistance: 0.1,  // 10% bonus for long distance deliveries
    badWeather: 0.15,   // 15% bonus for deliveries in bad weather
    lateHours: 0.2      // 20% bonus for late night deliveries (10 PM - 6 AM)
  },
  
  // GST rate
  gstRate: 0.18
};

// ---------------- Caching System ---------------- //

// Enhanced cache with multiple TTLs for different data types
const cache = {
  location: new Map(),
  distance: new Map(),
  fuel: new Map(),
  pricingHistory: new Map(),
  
  get: function(cacheType, key) {
    if (!this[cacheType].has(key)) return null;
    
    const { data, timestamp } = this[cacheType].get(key);
    const ttls = {
      location: CONFIG.CACHE_TTL,        // 1 hour for location data
      distance: CONFIG.CACHE_TTL * 24,   // 24 hours for distance data
      fuel: CONFIG.CACHE_TTL * 12,       // 12 hours for fuel prices
      pricingHistory: CONFIG.CACHE_TTL * 24 * 30  // 30 days for pricing history
    };
    
    if (Date.now() - timestamp < ttls[cacheType]) {
      return data;
    }
    return null;
  },
  
  set: function(cacheType, key, data) {
    this[cacheType].set(key, { data, timestamp: Date.now() });
  },
  
  clearCache: function(cacheType, key) {
    // If cacheType is specified, clear only that cache type
    if (cacheType) {
      if (this[cacheType]) {
        // If key is specified, clear only that key
        if (key) {
          this[cacheType].delete(key);
        } else {
          // Clear the entire cache type
          this[cacheType].clear();
        }
      }
    } else {
      // Clear all caches
      this.location.clear();
      this.distance.clear();
      this.fuel.clear();
      this.pricingHistory.clear();
    }
  }
};

// ---------------- Helper Functions ---------------- //

/**
 * Fetches data with retry capability and exponential backoff
 */
async function retryFetch(url, options = {}, retries = CONFIG.RETRY_ATTEMPTS, backoff = CONFIG.INITIAL_BACKOFF) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, backoff * (2 ** attempt)));
    }
  }
}

/**
 * Fetches location data using postal code
 */
async function fetchLocationData(zipCode) {
  // Validate zipCode
  if (!zipCode || typeof zipCode !== 'string' || zipCode.length < 4) {
    console.warn(`Invalid zipCode: ${zipCode}, using fallback location`);
    return {
      lat: '20.5937', // Central India fallback
      lon: '78.9629',
      region: 'unknown',
      tier: 'Town'
    };
  }
  
  const cacheKey = `location_${zipCode}`;
  const cachedData = cache.get('location', cacheKey);
  
  if (cachedData) return cachedData;
  
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=IN&format=json`;
  const headers = {
    'User-Agent': CONFIG.USER_AGENT,
    'Accept-Language': 'en-US'
  };
  
  try {
    const response = await retryFetch(url, { headers });
    const data = await response.json();
    
    // Enhance data with additional location information
    if (data && data.length > 0) {
      const enhancedData = {
        ...data[0],
        region: determineRegion(data[0]),
        tier: determineCityTier(data[0])
      };
      
      cache.set('location', cacheKey, enhancedData);
      return enhancedData;
    }
    
    // Default fallback if no data found
    const fallbackData = {
      lat: '20.5937', // Central India fallback
      lon: '78.9629',
      region: 'unknown',
      tier: 'Town'
    };
    
    cache.set('location', cacheKey, fallbackData);
    return fallbackData;
  } catch (error) {
    console.error(`Error fetching location data for zipCode ${zipCode}:`, error);
    return {
      lat: '20.5937',
      lon: '78.9629',
      region: 'unknown',
      tier: 'Town'
    };
  }
}

/**
 * Determines the region based on location data
 */
function determineRegion(locationData) {
  // Define major regions with common pricing models
  const regions = {
    'delhi-ncr': ['delhi', 'gurgaon', 'noida', 'ghaziabad', 'faridabad'],
    'mumbai': ['mumbai', 'thane', 'navi mumbai'],
    'bangalore': ['bangalore', 'bengaluru'],
    'chennai': ['chennai'],
    'kolkata': ['kolkata'],
    'hyderabad': ['hyderabad'],
    'pune': ['pune'],
    'hilly-regions': ['shimla', 'manali', 'darjeeling', 'nainital', 'mussoorie', 'ooty']
  };
  
  const displayName = (locationData.display_name || '').toLowerCase();
  
  for (const [region, cities] of Object.entries(regions)) {
    if (cities.some(city => displayName.includes(city))) {
      return region;
    }
  }
  
  return 'other';
}

/**
 * Determines city tier based on location data
 */
function determineCityTier(locationData) {
  // First check if it's explicitly a large city
  const metroCities = [
    'mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 
    'pune', 'ahmedabad', 'surat', 'jaipur'
  ];
  
  const displayName = (locationData.display_name || '').toLowerCase();
  
  if (metroCities.some(city => displayName.includes(city))) {
    return 'Metro';
  }
  
  // Otherwise use the type data
  const type = locationData.type || '';
  const importance = parseFloat(locationData.importance || 0);
  
  if (type === 'city' || importance > 0.7) return 'Metro';
  if (type === 'town' || importance > 0.5) return 'Normal City';
  if (type === 'village' || importance < 0.3) return 'Village';
  return 'Town';
}

/**
 * Calculate real-world driving distance using distance matrix API
 */
async function calculateRealDistance(fromLoc, toLoc) {
  const cacheKey = `distance_${fromLoc.lat}_${fromLoc.lon}_${toLoc.lat}_${toLoc.lon}`;
  const cachedDistance = cache.get('distance', cacheKey);
  
  if (cachedDistance) return cachedDistance;
  
  try {
    // Check if Google Maps API key is configured
    if (!CONFIG.MAPS_API_KEY || CONFIG.MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      // If no API key, silently fall back to haversine calculation without throwing an error
      console.warn('Google Maps API credentials missing - real distance calculation will be disabled');
      return calculateHaversineDistance(fromLoc, toLoc, cacheKey);
    }
    
    // Use Google Maps Distance Matrix API
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${fromLoc.lat},${fromLoc.lon}&destinations=${toLoc.lat},${toLoc.lon}&mode=driving&key=${CONFIG.MAPS_API_KEY}`;
    
    const response = await retryFetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
      const element = data.rows[0].elements[0];
      const distanceKm = Math.round(element.distance.value / 1000);
      const durationMinutes = Math.round(element.duration.value / 60);
      
      // Simulate road quality analysis
      const roadQuality = {
        highwayPercent: 60,
        localPercent: 30,
        unpavedPercent: 10
      };
      
      const result = {
        distance: Math.max(distanceKm, CONFIG.MIN_DISTANCE),
        duration: durationMinutes,
        roadQuality
      };
      
      cache.set('distance', cacheKey, result);
      return result;
    }
    
    throw new Error('Distance calculation failed');
  } catch (error) {
    console.error('Error calculating real distance:', error);
    
    // Fallback to haversine formula
    return calculateHaversineDistance(fromLoc, toLoc, cacheKey);
  }
}

// Helper function to calculate haversine distance
function calculateHaversineDistance(fromLoc, toLoc, cacheKey) {
  const R = 6371; // Earth radius in km
  const dLat = (parseFloat(toLoc.lat) - parseFloat(fromLoc.lat)) * (Math.PI / 180);
  const dLon = (parseFloat(toLoc.lon) - parseFloat(fromLoc.lon)) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(parseFloat(fromLoc.lat) * (Math.PI / 180)) * Math.cos(parseFloat(toLoc.lat) * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = Math.round(R * c);
  
  // Simulate duration and road quality
  const durationMinutes = Math.round(distance * 1.5); // Rough estimate: 1.5 min per km
  const roadQuality = {
    highwayPercent: 50,
    localPercent: 40,
    unpavedPercent: 10
  };
  
  const result = {
    distance: Math.max(distance, CONFIG.MIN_DISTANCE),
    duration: durationMinutes,
    roadQuality
  };
  
  if (cacheKey) {
    cache.set('distance', cacheKey, result);
  }
  
  return result;
}

/**
 * Get time-based adjustment factors
 */
function getTimeFactors(moveDate) {
  // Handle different date formats
  let date;
  if (moveDate) {
    if (typeof moveDate === 'string') {
      date = new Date(moveDate);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${moveDate}, using current date`);
        date = new Date();
      }
    } else if (moveDate instanceof Date) {
      date = moveDate;
    } else {
      console.warn(`Unexpected date format: ${typeof moveDate}, using current date`);
      date = new Date();
    }
  } else {
    date = new Date();
  }
  
  const month = date.getMonth() + 1; // JS months are 0-indexed
  const dayOfWeek = date.getDay();
  const dateString = `${String(month).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  // Base adjustment
  let factor = 1.0;
  
  // Apply month factor
  factor *= timeFactors.months[month] || 1.0;
  
  // Apply day of week factor
  factor *= timeFactors.daysOfWeek[dayOfWeek] || 1.0;
  
  // Apply holiday factor if applicable
  if (timeFactors.publicHolidays[dateString]) {
    factor *= timeFactors.publicHolidays[dateString];
  }
  
  return factor;
}

/**
 * Calculate fuel price adjustment
 */
async function getFuelPriceAdjustment() {
  const cacheKey = 'current_fuel_price';
  const cachedPrice = cache.get('fuel', cacheKey);
  
  if (cachedPrice) return cachedPrice;
  
  try {
    // Ideally, this would call a fuel price API
    // For now, we'll simulate with a random variation
    const currentFuelPrice = CONFIG.FUEL_PRICE_BASE * (1 + (Math.random() * 0.2 - 0.1));
    const adjustment = currentFuelPrice / CONFIG.FUEL_PRICE_BASE;
    
    cache.set('fuel', cacheKey, adjustment);
    return adjustment;
  } catch (error) {
    console.error('Error getting fuel price adjustment:', error);
    return 1.0; // No adjustment on error
  }
}

/**
 * Calculates the parking distance surcharge
 */
function calculateParkingDistanceCost(parkingDistance) {
  if (parkingDistance <= 0) return 0;
  if (parkingDistance <= 50) return CONFIG.PARKING_DISTANCE_RATES[0];
  if (parkingDistance <= 100) return CONFIG.PARKING_DISTANCE_RATES[1];
  if (parkingDistance <= 150) return CONFIG.PARKING_DISTANCE_RATES[2];
  return CONFIG.PARKING_DISTANCE_RATES[3];
}

/**
 * Apply data-driven adjustment based on historical data
 */
function applyDataDrivenAdjustment(estimate, inputs) {
  // This is a simplified version of what would be a machine learning model
  let adjustment = 1.0;
  
  // Adjust based on home size - larger homes often need more adjustment
  if (inputs.moveSize === '3BHK' || inputs.moveSize === '4BHK') {
    adjustment *= 1.05; // 5% increase for larger homes
  }
  
  // Adjust based on distance - very long and very short moves need adjustment
  if (estimate.distance > 1000) {
    adjustment *= 0.95; // 5% discount for very long moves
  } else if (estimate.distance < 20) {
    adjustment *= 1.1; // 10% increase for very short moves
  }
  
  return adjustment;
}

// ---------------- Main Calculation Function ---------------- //

/**
 * Calculate detailed moving cost with comprehensive factors
 */
async function calculateMovingCost(options) {
  // Destructure inputs with defaults
  const {
    fromZip,
    toZip,
    moveSize,
    moveDate,
    floorLevelOrigin = 0,
    floorLevelDestination = 0,
    hasElevatorOrigin = false,
    hasElevatorDestination = false,
    parkingDistanceOrigin = 0,
    parkingDistanceDestination = 0,
    premiumPacking = false,
    specialItems = [],
    storageMonths = 0,
    insuranceValue = 0,
    vendorType = 'default',
    additionalServices = []
  } = options;
  
  // Validate inputs
  if (!movingCostTable[moveSize]) {
    throw new Error(`Invalid move size provided. Available options: ${Object.keys(movingCostTable).join(", ")}`);
  }
  
  // Fetch location data
  const [fromLocation, toLocation] = await Promise.all([
    fetchLocationData(fromZip),
    fetchLocationData(toZip)
  ]);
  
  // Calculate real-world distance and duration
  const { distance, duration, roadQuality } = await calculateRealDistance(fromLocation, toLocation);
  
  // Determine move type for rate calculation
  const moveType = `${fromLocation.tier}-${toLocation.tier}`;
  const perKmCost = perKmRate[moveType] || 50;
  
  // Get base cost from table
  const baseCost = movingCostTable[moveSize][fromLocation.tier];
  
  // Calculate transportation cost with road quality factor
  const regionFactor = roadQualityFactor[fromLocation.region] || 
                      roadQualityFactor[toLocation.region] || 
                      roadQualityFactor.default;
  
  // Adjust for highway vs local road composition
  const roadCompositionFactor = 
    (roadQuality.highwayPercent * 0.9 + 
     roadQuality.localPercent * 1.0 + 
     roadQuality.unpavedPercent * 1.5) / 100;
  
  // Get fuel price adjustment
  const fuelAdjustment = await getFuelPriceAdjustment();
  
  // Calculate transport cost
  const transportCost = Math.round(distance * perKmCost * regionFactor * roadCompositionFactor * fuelAdjustment);
  
  // Calculate labor cost based on home size and duration
  const laborCost = Math.round(baseCost * 0.2 * (duration / 240 + 0.5)); // Adjust for estimated duration
  
  // Calculate packing cost
  const packingCost = premiumPacking ? Math.round(baseCost * 0.3) : Math.round(baseCost * 0.2);
  
  // Calculate floor-related costs
  const floorCostOrigin = floorLevelOrigin > 0 ? 
    Math.round(floorLevelOrigin * CONFIG.FLOOR_COST_PER_LEVEL * (hasElevatorOrigin ? CONFIG.ELEVATOR_DISCOUNT : 1)) : 0;
  
  const floorCostDestination = floorLevelDestination > 0 ? 
    Math.round(floorLevelDestination * CONFIG.FLOOR_COST_PER_LEVEL * (hasElevatorDestination ? CONFIG.ELEVATOR_DISCOUNT : 1)) : 0;
  
  // Calculate parking distance costs
  const parkingCostOrigin = calculateParkingDistanceCost(parkingDistanceOrigin);
  const parkingCostDestination = calculateParkingDistanceCost(parkingDistanceDestination);
  
  // Calculate special item handling cost
  let specialItemHandling = 0;
  specialItems.forEach(item => {
    const category = item.category || 'standard';
    const quantity = item.quantity || 1;
    specialItemHandling += (CONFIG.SPECIAL_ITEM_CATEGORIES[category] || CONFIG.SPECIAL_ITEM_CATEGORIES.standard) * quantity;
  });
  
  // Calculate storage cost
  const storageCost = storageMonths * 5000;
  
  // Calculate toll charges
  const tollCharges = Math.round(distance * 2.5);
  
  // Calculate insurance cost
  const insuranceCost = Math.round(insuranceValue * 0.03);
  
  // Calculate additional services cost
  const additionalServicesCost = additionalServices.reduce((total, service) => total + (service.cost || 0), 0);
  
  // Apply time-based factors
  const timeFactor = getTimeFactors(moveDate);
  
  // Apply vendor markup
  const vendorMarkupFactor = 
    (vendorMarkup.regional[fromLocation.region] || vendorMarkup.regional[toLocation.region] || vendorMarkup)[vendorType] || 
    vendorMarkup[vendorType] || 
    vendorMarkup.default;
  
  // Calculate subtotal before adjustments
  const rawSubtotal = 
    baseCost + 
    transportCost + 
    laborCost + 
    packingCost + 
    floorCostOrigin + 
    floorCostDestination + 
    parkingCostOrigin + 
    parkingCostDestination + 
    specialItemHandling + 
    storageCost + 
    tollCharges + 
    insuranceCost + 
    additionalServicesCost;
  
  // Apply time and vendor factors
  const subtotal = Math.round(rawSubtotal * timeFactor * vendorMarkupFactor);
  
  // Apply data-driven adjustment
  const dataAdjustment = applyDataDrivenAdjustment({ 
    subtotal, 
    distance,
    duration,
    fromRegion: fromLocation.region,
    toRegion: toLocation.region
  }, options);
  
  const adjustedSubtotal = Math.round(subtotal * dataAdjustment);
  
  // Calculate GST
  const GST = Math.round(adjustedSubtotal * CONFIG.GST_RATE);
  
  // Calculate total cost
  const totalCost = adjustedSubtotal + GST;
  
  // Generate detailed breakdown
  return {
    quoteId: uuidv4(),
    timestamp: new Date().toISOString(),
    
    // Location information
    fromTier: fromLocation.tier,
    toTier: toLocation.tier,
    fromRegion: fromLocation.region,
    toRegion: toLocation.region,
    
    // Distance and time
    distance,
    estimatedDuration: duration,
    
    // Base costs
    baseCost,
    transportCost,
    laborCost,
    packingCost,
    
    // Additional factors
    floorCostOrigin,
    floorCostDestination,
    parkingCostOrigin,
    parkingCostDestination,
    specialItemHandling,
    storageCost,
    tollCharges,
    insuranceCost,
    additionalServicesCost,
    
    // Adjustment factors
    timeFactor,
    vendorMarkupFactor,
    fuelAdjustment,
    dataAdjustment,
    
    // Totals
    rawSubtotal,
    subtotal,
    adjustedSubtotal,
    GST,
    totalCost,
    
    // Summary
    description: `Estimated cost for a ${moveSize} move from ${fromLocation.tier} (${fromZip}) to ${toLocation.tier} (${toZip}) covering ${distance} km is ₹${totalCost.toLocaleString('en-IN')}. This includes all applicable charges and GST.`
  };
}

/**
 * Get available move sizes
 */
function getAvailableMoveSizes() {
  return Object.keys(movingCostTable);
}

/**
 * Get quick estimate based on minimal information
 */
async function getQuickEstimate(fromZip, toZip, moveSize) {
  try {
    const estimate = await calculateMovingCost({
      fromZip,
      toZip,
      moveSize
    });
    
    return {
      quoteId: estimate.quoteId,
      moveSize,
      distance: estimate.distance,
      estimatedCost: estimate.totalCost,
      description: estimate.description
    };
  } catch (error) {
    console.error('Error generating quick estimate:', error);
    throw error;
  }
}

/**
 * Get detailed breakdown of cost factors
 */
function getCostFactors() {
  return {
    moveSizes: getAvailableMoveSizes(),
    locationTiers: ["Metro", "Normal City", "Town", "Village"],
    specialItemCategories: Object.keys(CONFIG.SPECIAL_ITEM_CATEGORIES),
    vendorTypes: Object.keys(vendorMarkup).filter(key => key !== 'regional'),
    peakSeasonMonths: CONFIG.PEAK_SEASON_MONTHS,
    additionalFactors: [
      { name: "Floor Level", description: "Additional cost per floor level", baseCost: CONFIG.FLOOR_COST_PER_LEVEL },
      { name: "Elevator Discount", description: "Discount when elevator is available", factor: 1 - CONFIG.ELEVATOR_DISCOUNT },
      { name: "Weekend Surcharge", description: "Additional cost for weekend moves", factor: CONFIG.WEEKEND_SURCHARGE },
      { name: "GST", description: "Goods and Services Tax", rate: CONFIG.GST_RATE }
    ]
  };
}

/**
 * Clear pricing service cache
 * @param {string} cacheType - Optional cache type to clear (location, distance, fuel, pricingHistory)
 * @param {string} key - Optional specific key to clear within the cache type
 */
function clearPricingCache(cacheType, key) {
  cache.clearCache(cacheType, key);
}

/**
 * Get cache statistics
 * @returns {Object} Object containing cache statistics
 */
function getCacheStats() {
  return {
    location: {
      size: cache.location.size,
      keys: Array.from(cache.location.keys())
    },
    distance: {
      size: cache.distance.size,
      keys: Array.from(cache.distance.keys())
    },
    fuel: {
      size: cache.fuel.size,
      keys: Array.from(cache.fuel.keys())
    },
    pricingHistory: {
      size: cache.pricingHistory.size,
      keys: Array.from(cache.pricingHistory.keys())
    }
  };
}

/**
 * Calculate parcel delivery cost using Rapido-style pricing
 * @param {Object} options - Parcel delivery options
 * @returns {Promise<Object>} - Detailed cost breakdown
 */
async function calculateParcelDeliveryCost(options) {
  // Destructure inputs with defaults
  const {
    fromZip,
    toZip,
    parcelWeight = 1,
    parcelDimensions = { length: 30, width: 20, height: 15 },
    packageType = 'documents'
  } = options;
  
  // Validate required inputs
  if (!fromZip || !toZip) {
    throw new Error('From and to zip codes are required');
  }
  
  // Get location data for origin and destination
  const [fromLocation, toLocation] = await Promise.all([
    fetchLocationData(fromZip),
    fetchLocationData(toZip)
  ]);
  
  // Calculate distance between locations
  const distanceData = await calculateRealDistance(fromLocation, toLocation);
  const distance = distanceData.distance;
  const duration = distanceData.duration;
  
  // Determine distance category (Rapido-style)
  let distanceCategory = 'intracity';
  if (distance > 300) {
    distanceCategory = 'longDistance';
  } else if (distance > 100) {
    distanceCategory = 'intercity';
  } else if (distance > 30) {
    distanceCategory = 'nearbyCity';
  }
  
  // Calculate volumetric weight
  const volumetricWeight = (parcelDimensions.length * parcelDimensions.width * parcelDimensions.height) / parcelPricingConfig.volumetricFactor;
  
  // Use the greater of actual weight and volumetric weight
  const chargableWeight = Math.max(parcelWeight, volumetricWeight);
  
  // Determine weight slab multiplier
  let weightMultiplier = parcelPricingConfig.weightSlabs.above20.multiplier;
  if (chargableWeight <= 5) {
    weightMultiplier = parcelPricingConfig.weightSlabs.upto5.multiplier;
  } else if (chargableWeight <= 10) {
    weightMultiplier = parcelPricingConfig.weightSlabs.upto10.multiplier;
  } else if (chargableWeight <= 15) {
    weightMultiplier = parcelPricingConfig.weightSlabs.upto15.multiplier;
  } else if (chargableWeight <= 20) {
    weightMultiplier = parcelPricingConfig.weightSlabs.upto20.multiplier;
  }
  
  // Calculate base cost (distance * rate per km * weight multiplier)
  let baseCost = distance * parcelPricingConfig.baseRatePerKm[distanceCategory] * weightMultiplier;
  
  // Apply minimum charge if applicable
  baseCost = Math.max(baseCost, parcelPricingConfig.minimumCharge[distanceCategory]);
  
  // Apply package type multiplier
  let packageTypeMultiplier = 1.0;
  if (packageType === 'electronics') {
    packageTypeMultiplier = 1.2; // 20% extra for electronics
  } else if (packageType === 'food') {
    packageTypeMultiplier = 1.15; // 15% extra for food
  } else if (packageType === 'medicine') {
    packageTypeMultiplier = 1.25; // 25% extra for medicine
  }
  
  const packageAdjustedCost = baseCost * packageTypeMultiplier;
  
  // Apply time-based factors and surge pricing
  let timeFactor = 1.0;
  let surgeFactor = 1.0;
  
  // Use current date for time-based factors
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const dayOfWeek = now.getDay(); // 0-6
  const hour = now.getHours();
  
  // Apply month factor
  timeFactor *= timeFactors.months[month] || 1.0;
  
  // Apply day of week factor
  timeFactor *= timeFactors.daysOfWeek[dayOfWeek] || 1.0;
  
  // Check if it's a public holiday
  const dateString = `${month.toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  if (timeFactors.publicHolidays[dateString]) {
    timeFactor *= timeFactors.publicHolidays[dateString];
    surgeFactor *= parcelPricingConfig.surgePricing.holidays;
  }
  
  // Check if it's a weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    surgeFactor *= parcelPricingConfig.surgePricing.weekends;
  }
  
  // Check if it's peak hours
  if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20)) {
    surgeFactor *= parcelPricingConfig.surgePricing.peakHours;
  }
  
  // Apply time factor and surge pricing
  const timeAdjustedCost = packageAdjustedCost * timeFactor * surgeFactor;
  
  // Calculate rider incentives (doesn't affect customer price)
  let riderIncentivePercentage = 0;
  
  if (distanceCategory === 'longDistance' || distanceCategory === 'intercity') {
    riderIncentivePercentage += parcelPricingConfig.riderIncentives.longDistance;
  }
  
  // Calculate GST
  const gst = Math.round(timeAdjustedCost * parcelPricingConfig.gstRate);
  
  // Calculate total cost
  const totalCost = Math.round(timeAdjustedCost + gst);
  
  // Calculate estimated delivery time based on distance
  let estimatedDeliveryTime = '';
  if (distanceCategory === 'intracity') {
    estimatedDeliveryTime = 'Within 24 hours';
  } else if (distanceCategory === 'nearbyCity') {
    estimatedDeliveryTime = 'Within 48 hours';
  } else if (distanceCategory === 'intercity') {
    estimatedDeliveryTime = 'Within 72 hours';
  } else {
    estimatedDeliveryTime = 'Within 96 hours';
  }
  
  // Generate detailed breakdown
  return {
    quoteId: uuidv4(),
    timestamp: new Date().toISOString(),
    
    // Location information
    fromTier: fromLocation.tier,
    toTier: toLocation.tier,
    fromRegion: fromLocation.region,
    toRegion: toLocation.region,
    
    // Distance and time
    distance,
    estimatedDuration: duration,
    estimatedDeliveryTime,
    distanceCategory,
    
    // Weight information
    actualWeight: parcelWeight,
    volumetricWeight: parseFloat(volumetricWeight.toFixed(2)),
    chargableWeight: parseFloat(chargableWeight.toFixed(2)),
    weightMultiplier,
    
    // Package information
    packageType,
    packageTypeMultiplier,
    
    // Cost breakdown
    baseCost: Math.round(baseCost),
    packageAdjustment: Math.round(packageAdjustedCost - baseCost),
    surgeAdjustment: Math.round(timeAdjustedCost - packageAdjustedCost),
    
    // Multipliers
    timeFactor,
    surgeFactor,
    
    // Rider incentives (for internal use)
    riderIncentivePercentage,
    
    // Totals
    subtotal: Math.round(timeAdjustedCost),
    GST: gst,
    totalCost,
    
    // Summary
    description: `Estimated cost for a ${chargableWeight.toFixed(2)} kg ${packageType} delivery from ${fromLocation.tier} (${fromZip}) to ${toLocation.tier} (${toZip}) covering ${distance} km is ₹${totalCost.toLocaleString('en-IN')}. ${estimatedDeliveryTime}. This includes all applicable charges and GST.`
  };
}

/**
 * Get a detailed price estimate
 * @param {Object} options - Pricing options
 * @returns {Promise<Object>} - Detailed price estimate
 */
async function getDetailedEstimate(options) {
  try {
    // Determine if this is a moving or parcel delivery request
    if (options.orderType === 'parcel') {
      return await calculateParcelDeliveryCost(options);
    } else {
      return await calculateMovingCost(options);
    }
  } catch (error) {
    console.error('Error calculating detailed estimate:', error);
    throw error;
  }
}

export {
  calculateMovingCost,
  getQuickEstimate,
  getAvailableMoveSizes,
  getCostFactors,
  clearPricingCache,
  getCacheStats,
  getDetailedEstimate
}; 