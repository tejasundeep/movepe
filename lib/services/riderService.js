import { storage, riderStorage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { notificationService } from './notificationService';
import { analyticsService } from './analyticsService';
import { orderStorage } from '../storage';

class RiderService {
  constructor() {
    // Initialize the geospatial index
    this.geoIndex = null;
    this.lastIndexUpdate = null;
    this.indexUpdateInterval = 5 * 60 * 1000; // Update index every 5 minutes
    this.gridPrecision = 0.01; // Approximately 1km grid cells
  }

  /**
   * Get all riders
   * @returns {Promise<Array>} - List of all riders
   */
  async getAllRiders() {
    return await riderStorage.getAll();
  }

  /**
   * Get rider by ID
   * @param {string} riderId - Rider ID
   * @returns {Promise<Object|null>} - Rider object or null if not found
   */
  async getRiderById(riderId) {
    return await riderStorage.getById(riderId);
  }

  /**
   * Get rider by email
   * @param {string} email - Rider email
   * @returns {Promise<Object|null>} - Rider object or null if not found
   */
  async getRiderByEmail(email) {
    const riders = await this.getAllRiders();
    return riders.find(rider => rider.email === email) || null;
  }

  /**
   * Create a new rider
   * @param {Object} riderData - Rider data
   * @returns {Promise<Object>} - Created rider
   */
  async createRider(riderData) {
    const { name, email, phone, whatsapp, vehicleDetails } = riderData;

    // Validate required fields
    if (!name || !email || !phone || !vehicleDetails) {
      throw new Error('Missing required fields');
    }

    // Check if rider already exists
    const existingRider = await this.getRiderByEmail(email);
    if (existingRider) {
      throw new Error('Rider with this email already exists');
    }

    // First, create or get the user
    const prisma = require('../prisma');
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Create a new user
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email,
          name,
          phone,
          role: 'rider',
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // Create the rider profile
    const serviceAreas = riderData.serviceAreas || [];
    const newRider = await riderStorage.create({
      id: uuidv4(),
      userId: user.id,
      vehicleType: vehicleDetails.type || 'motorcycle',
      vehicleNumber: vehicleDetails.licensePlate || 'Unknown',
      licenseNumber: vehicleDetails.drivingLicense || 'Unknown',
      serviceAreas,
      isAvailable: riderData.status === 'available' || true,
      isVerified: false,
      rating: 0,
      totalRatings: 0
    });

    // Track rider creation event
    await analyticsService.trackEvent('rider_created', {
      riderId: newRider.id,
      email: email
    });

    return newRider;
  }

  /**
   * Update rider location
   * @param {string} riderId - Rider ID
   * @param {Object} location - Location object with lat and lon
   * @returns {Promise<Object>} - Updated rider
   */
  async updateRiderLocation(riderId, location) {
    if (!riderId || !location || !location.lat || !location.lon) {
      throw new Error('Rider ID and location coordinates are required');
    }

    try {
      // Get the rider
      const rider = await riderStorage.getById(riderId);
      if (!rider) {
        throw new Error('Rider not found');
      }

      // Store the current location as a JSON string
      const currentLocation = JSON.stringify({
        lat: location.lat,
        lon: location.lon,
        lastUpdated: new Date().toISOString()
      });

      // Update the rider
      const prisma = require('../prisma');
      await prisma.rider.update({
        where: { id: riderId },
        data: {
          currentLocation,
          updatedAt: new Date()
        }
      });

      // Update the geospatial index
      await this._updateGeoIndex();

      return await riderStorage.getById(riderId);
    } catch (error) {
      console.error('Error updating rider location:', error);
      throw new Error('Failed to update rider location: ' + error.message);
    }
  }

  /**
   * Update rider status
   * @param {string} riderId - Rider ID
   * @param {string} status - New status ('available', 'busy', 'offline')
   * @returns {Promise<Object>} - Updated rider
   */
  async updateRiderStatus(riderId, status) {
    if (!riderId || !status) {
      throw new Error('Rider ID and status are required');
    }

    const validStatuses = ['available', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Get the rider
    const rider = await riderStorage.getById(riderId);
    if (!rider) {
      throw new Error('Rider not found');
    }

    // Update the rider status
    await riderStorage.update(riderId, {
      isAvailable: status === 'available'
    });

    return await riderStorage.getById(riderId);
  }

  /**
   * Update the geospatial index for faster rider lookup
   * @private
   * @returns {Promise<void>}
   */
  async _updateGeoIndex() {
    // Only update the index if it's null or the update interval has passed
    const now = Date.now();
    if (this.geoIndex && this.lastIndexUpdate && (now - this.lastIndexUpdate) < this.indexUpdateInterval) {
      return;
    }
    
    try {
      // Get all riders
      const riders = await riderStorage.getAll();
      
      // Create a new index
      const newIndex = {};
      
      for (const rider of riders) {
        // Skip riders without location
        if (!rider.currentLocation) continue;
        
        let currentLocation;
        try {
          // Parse the currentLocation if it's a string
          if (typeof rider.currentLocation === 'string') {
            currentLocation = JSON.parse(rider.currentLocation);
          } else {
            currentLocation = rider.currentLocation;
          }
          
          // Skip if location is invalid
          if (!currentLocation.lat || !currentLocation.lon) continue;
          
          // Get the cell key for this location
          const lat = parseFloat(currentLocation.lat);
          const lon = parseFloat(currentLocation.lon);
          
          if (isNaN(lat) || isNaN(lon)) continue;
          
          const cellLat = Math.floor(lat / this.gridPrecision) * this.gridPrecision;
          const cellLon = Math.floor(lon / this.gridPrecision) * this.gridPrecision;
          const cellKey = `${cellLat.toFixed(6)},${cellLon.toFixed(6)}`;
          
          // Add rider to this cell
          if (!newIndex[cellKey]) {
            newIndex[cellKey] = [];
          }
          
          newIndex[cellKey].push({
            ...rider,
            currentLocation
          });
        } catch (error) {
          console.error(`Error processing rider ${rider.id} for geo index:`, error);
          continue;
        }
      }
      
      // Update the index
      this.geoIndex = newIndex;
      this.lastIndexUpdate = now;
    } catch (error) {
      console.error('Error updating geospatial index:', error);
    }
  }
  
  /**
   * Get grid cells that might contain riders within a radius
   * @private
   * @param {Object} location - Location object with lat and lon
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Array} - Array of cell keys
   */
  _getCellsInRadius(location, radiusKm) {
    // Validate coordinates
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);
    
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.warn(`Invalid coordinates in location: ${lat}, ${lon}`);
      return [];
    }
    
    // Convert radius to approximate grid cells
    // 0.01 degrees is roughly 1km, so we calculate how many cells to check
    const cellsToCheck = Math.ceil(radiusKm / (this.gridPrecision * 111)); // 111km per degree
    
    // Get the center cell
    const centerX = Math.floor(lat / this.gridPrecision);
    const centerY = Math.floor(lon / this.gridPrecision);
    
    // Get all cells in the radius
    const cells = [];
    for (let x = centerX - cellsToCheck; x <= centerX + cellsToCheck; x++) {
      for (let y = centerY - cellsToCheck; y <= centerY + cellsToCheck; y++) {
        // Handle international date line crossing
        const adjustedY = ((y + 18000) % 36000) - 18000; // Normalize to -180 to 180
        cells.push(`${x}:${adjustedY}`);
      }
    }
    
    return cells;
  }

  /**
   * Find nearby riders within a specified radius using geospatial indexing
   * @param {Object} location - Location object with lat and lon
   * @param {number} radiusKm - Radius in kilometers
   * @param {boolean} availableOnly - Whether to return only available riders
   * @param {Object} filters - Additional filters for rider selection
   * @returns {Promise<Array>} - List of nearby riders with distance
   */
  async findNearbyRiders(location, radiusKm = 5, availableOnly = true, filters = {}) {
    if (!location || !location.lat || !location.lon) {
      throw new Error('Location coordinates are required');
    }
    
    // Validate radius
    if (isNaN(radiusKm) || radiusKm <= 0) {
      console.warn(`Invalid radius: ${radiusKm}, using default of 5km`);
      radiusKm = 5;
    }
    
    // Cap radius to a reasonable maximum to prevent excessive resource usage
    const maxRadius = 50; // 50km maximum radius
    if (radiusKm > maxRadius) {
      console.warn(`Radius ${radiusKm}km exceeds maximum of ${maxRadius}km, capping to ${maxRadius}km`);
      radiusKm = maxRadius;
    }

    try {
      // Update the geospatial index
      await this._updateGeoIndex();
      
      // If the index is not available, fall back to the original method
      if (!this.geoIndex) {
        console.warn('Geospatial index not available, falling back to original method');
        return this._findNearbyRidersOriginal(location, radiusKm, availableOnly, filters);
      }
      
      // Get cells that might contain riders within the radius
      const cells = this._getCellsInRadius(location, radiusKm);
      
      if (cells.length === 0) {
        console.warn('No cells found in radius, falling back to original method');
        return this._findNearbyRidersOriginal(location, radiusKm, availableOnly, filters);
      }
      
      // Collect riders from these cells
      let candidateRiders = [];
      for (const cellKey of cells) {
        if (this.geoIndex[cellKey]) {
          candidateRiders = candidateRiders.concat(this.geoIndex[cellKey]);
        }
      }
      
      // If no riders found in cells, fall back to original method
      if (candidateRiders.length === 0) {
        console.warn('No riders found in cells, falling back to original method');
        return this._findNearbyRidersOriginal(location, radiusKm, availableOnly, filters);
      }
      
      // Remove duplicates (a rider might be in multiple cells)
      candidateRiders = [...new Map(candidateRiders.map(rider => [rider.riderId, rider])).values()];
      
      // Filter riders by availability if needed
      if (availableOnly) {
        candidateRiders = candidateRiders.filter(rider => rider.status === 'available');
      }
      
      // Apply additional filters
      if (filters.minCompletedDeliveries) {
        candidateRiders = candidateRiders.filter(rider => 
          (rider.completedDeliveries || 0) >= filters.minCompletedDeliveries
        );
      }
      
      if (filters.minRating) {
        candidateRiders = candidateRiders.filter(rider => 
          (rider.rating || 0) >= filters.minRating
        );
      }
      
      if (filters.minWeightCapacity) {
        candidateRiders = candidateRiders.filter(rider => 
          (rider.deliveryCapacity?.maxWeight || 0) >= filters.minWeightCapacity
        );
      }
      
      // If no riders match filters, return empty array
      if (candidateRiders.length === 0) {
        return [];
      }

      // Calculate distance for each rider and filter by radius
      const nearbyRiders = candidateRiders
        .map(rider => {
          try {
            const distance = this.calculateDistance(
              parseFloat(location.lat),
              parseFloat(location.lon),
              parseFloat(rider.currentLocation.lat),
              parseFloat(rider.currentLocation.lon)
            );
            
            return {
              ...rider,
              distance: parseFloat(distance.toFixed(2))
            };
          } catch (error) {
            console.error(`Error calculating distance for rider ${rider.riderId}:`, error);
            return null;
          }
        })
        .filter(rider => rider !== null && rider.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);

      return nearbyRiders;
    } catch (error) {
      console.error('Error in geospatial search, falling back to original method:', error);
      return this._findNearbyRidersOriginal(location, radiusKm, availableOnly, filters);
    }
  }

  /**
   * Original method for finding nearby riders (kept as fallback)
   * @private
   * @param {Object} location - Location object with lat and lon
   * @param {number} radiusKm - Radius in kilometers
   * @param {boolean} availableOnly - Whether to return only available riders
   * @param {Object} filters - Additional filters for rider selection
   * @returns {Promise<Array>} - List of nearby riders with distance
   */
  async _findNearbyRidersOriginal(location, radiusKm = 5, availableOnly = true, filters = {}) {
    if (!location || !location.lat || !location.lon) {
      throw new Error('Location coordinates are required');
    }

    const riders = await this.getAllRiders();
    
    // Filter riders by availability if needed
    let filteredRiders = availableOnly 
      ? riders.filter(rider => rider.status === 'available')
      : riders;
    
    // Apply additional filters
    if (filters.minCompletedDeliveries) {
      filteredRiders = filteredRiders.filter(rider => 
        (rider.completedDeliveries || 0) >= filters.minCompletedDeliveries
      );
    }
    
    if (filters.minRating) {
      filteredRiders = filteredRiders.filter(rider => 
        (rider.rating || 0) >= filters.minRating
      );
    }
    
    if (filters.minWeightCapacity) {
      filteredRiders = filteredRiders.filter(rider => 
        (rider.deliveryCapacity?.maxWeight || 0) >= filters.minWeightCapacity
      );
    }

    // Calculate distance for each rider and filter by radius
    const nearbyRiders = filteredRiders
      .map(rider => {
        const distance = this.calculateDistance(
          parseFloat(location.lat),
          parseFloat(location.lon),
          parseFloat(rider.currentLocation.lat),
          parseFloat(rider.currentLocation.lon)
        );
        
        return {
          ...rider,
          distance: parseFloat(distance.toFixed(2))
        };
      })
      .filter(rider => rider.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return nearbyRiders;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    // Validate inputs to prevent NaN errors
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
        typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
        isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.warn('Invalid coordinates in calculateDistance:', lat1, lon1, lat2, lon2);
      return Infinity; // Return Infinity to ensure this rider is not selected
    }
    
    // Ensure coordinates are within valid ranges
    if (lat1 < -90 || lat1 > 90 || lon1 < -180 || lon1 > 180 ||
        lat2 < -90 || lat2 > 90 || lon2 < -180 || lon2 > 180) {
      console.warn('Coordinates out of range in calculateDistance:', lat1, lon1, lat2, lon2);
      return Infinity;
    }
    
    try {
      const R = 6371; // Earth radius in km
      const dLat = this.deg2rad(lat2 - lat1);
      const dLon = this.deg2rad(lon2 - lon1);
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return Infinity;
    }
  }

  /**
   * Convert degrees to radians
   * @param {number} deg - Degrees
   * @returns {number} - Radians
   */
  deg2rad(deg) {
    if (typeof deg !== 'number' || isNaN(deg)) {
      return 0;
    }
    return deg * (Math.PI/180);
  }

  /**
   * Assign a rider to a delivery with Rapido-style logic
   * @param {string} orderId - Order ID
   * @param {Object} pickupLocation - Pickup location
   * @param {Object} orderDetails - Additional order details for rider matching
   * @returns {Promise<Object|null>} - Assigned rider or null if no riders available
   */
  async assignRiderToDelivery(orderId, pickupLocation, orderDetails = {}) {
    if (!orderId || !pickupLocation) {
      throw new Error('Order ID and pickup location are required');
    }

    // Validate pickup location
    if (!pickupLocation.lat || !pickupLocation.lon || 
        isNaN(parseFloat(pickupLocation.lat)) || isNaN(parseFloat(pickupLocation.lon))) {
      throw new Error('Invalid pickup location coordinates');
    }

    // Get order details if not provided
    let orderData = orderDetails;
    if (Object.keys(orderDetails).length === 0) {
      const order = await orderStorage.getById(orderId);
      if (order) {
        orderData = order;
      }
    }

    // Determine if this is an intercity delivery
    const isIntercity = orderData.distanceCategory === 'intercity' || orderData.distanceCategory === 'longDistance';
    
    // For intercity deliveries, we need riders with specific capabilities
    let riderFilters = {};
    
    if (isIntercity) {
      riderFilters = {
        // Riders must have completed at least 50 deliveries for intercity
        minCompletedDeliveries: 50,
        // Riders must have a rating of at least 4.5 for intercity
        minRating: 4.5,
        // For heavy items, rider must have appropriate vehicle
        minWeightCapacity: orderData.parcelWeight || 1
      };
    }

    // Try with initial radius of 5km
    let nearbyRiders = [];
    try {
      nearbyRiders = await this.findNearbyRiders(pickupLocation, 5, true, riderFilters);
    } catch (error) {
      console.error('Error finding nearby riders:', error);
      // Continue with empty array, will be handled in the next steps
    }
    
    // If no riders found, expand search radius incrementally up to 20km
    if (nearbyRiders.length === 0) {
      const expandedRadii = [10, 15, 20];
      
      for (const radius of expandedRadii) {
        console.log(`No riders found within ${radius-5}km, expanding search to ${radius}km`);
        try {
          nearbyRiders = await this.findNearbyRiders(pickupLocation, radius, true, riderFilters);
          if (nearbyRiders.length > 0) {
            break;
          }
        } catch (error) {
          console.error(`Error finding riders within ${radius}km:`, error);
          // Continue to next radius
        }
      }
    }
    
    // If still no riders found with filters, try without some filters
    if (nearbyRiders.length === 0 && isIntercity) {
      console.log('No qualified riders found, relaxing requirements');
      // Relax the requirements for intercity
      riderFilters.minCompletedDeliveries = 20;
      riderFilters.minRating = 4.0;
      try {
        nearbyRiders = await this.findNearbyRiders(pickupLocation, 20, true, riderFilters);
      } catch (error) {
        console.error('Error finding riders with relaxed requirements:', error);
      }
    }
    
    // If still no riders found, try to find any rider regardless of status
    if (nearbyRiders.length === 0) {
      console.log('No available riders found, searching for any rider within 20km');
      try {
        nearbyRiders = await this.findNearbyRiders(pickupLocation, 20, false, riderFilters);
      } catch (error) {
        console.error('Error finding any riders:', error);
      }
    }
    
    // If still no riders, return null instead of throwing an error
    if (nearbyRiders.length === 0) {
      console.log('No riders found at all, order will be queued for manual assignment');
      
      // Update order to indicate it needs manual assignment
      try {
        await orderStorage.update(orderId, {
          status: 'Pending Rider Assignment',
          statusNote: 'No riders available nearby, queued for manual assignment',
          needsManualAssignment: true
        });
      } catch (error) {
        console.error('Error updating order for manual assignment:', error);
      }
      
      return null;
    }

    // For intercity deliveries, prioritize riders with higher ratings and more experience
    if (isIntercity) {
      // Sort by a combination of distance, rating, and experience
      nearbyRiders.sort((a, b) => {
        // Create a score based on multiple factors
        const scoreA = ((a.rating || 0) * 10) + ((a.completedDeliveries || 0) / 100) - (a.distance * 0.5);
        const scoreB = ((b.rating || 0) * 10) + ((b.completedDeliveries || 0) / 100) - (b.distance * 0.5);
        return scoreB - scoreA; // Higher score first
      });
    }

    // Select the best rider
    const selectedRider = nearbyRiders[0];
    
    // Update rider status to busy
    try {
      await this.updateRiderStatus(selectedRider.id, 'busy');
    } catch (error) {
      console.error('Error updating rider status:', error);
      // Continue anyway, as we still want to assign the rider
    }
    
    // Update order with assigned rider
    try {
      // Calculate expected pickup and delivery times for intercity deliveries
      let updateData = {
        riderId: selectedRider.id,
        status: 'Rider Assigned',
        statusNote: `Rider ${selectedRider.name} assigned to delivery (${selectedRider.distance.toFixed(2)}km away)`
      };
      
      // For intercity deliveries, set expected pickup and delivery times
      if (isIntercity) {
        const now = new Date();
        
        // Expected pickup within 1 hour
        const pickupTime = new Date(now);
        pickupTime.setHours(pickupTime.getHours() + 1);
        updateData.expectedPickupTime = pickupTime;
        
        // Expected delivery based on distance
        const deliveryTime = new Date(now);
        if (orderData.distanceCategory === 'intercity') {
          // Add 72 hours for intercity
          deliveryTime.setHours(deliveryTime.getHours() + 72);
        } else {
          // Add 96 hours for long distance
          deliveryTime.setHours(deliveryTime.getHours() + 96);
        }
        updateData.expectedDeliveryTime = deliveryTime;
      }
      
      await orderStorage.update(orderId, updateData);
    } catch (error) {
      console.error('Error updating order with assigned rider:', error);
      // Try to revert rider status to available
      try {
        await this.updateRiderStatus(selectedRider.id, 'available');
      } catch (revertError) {
        console.error('Error reverting rider status:', revertError);
      }
      throw error;
    }
    
    // Notify rider about new delivery
    try {
      await notificationService.sendRiderDeliveryAssignmentNotification(
        selectedRider,
        orderId,
        pickupLocation
      );
    } catch (error) {
      console.error('Error sending rider notification:', error);
      // Continue even if notification fails
    }
    
    // Track rider assignment event
    try {
      await analyticsService.trackEvent('rider_assigned', {
        orderId,
        riderId: selectedRider.id,
        distance: selectedRider.distance,
        isIntercity
      });
    } catch (error) {
      console.error('Error tracking rider assignment event:', error);
      // Continue even if analytics fails
    }
    
    return selectedRider;
  }

  /**
   * Get rider statistics
   * @param {string} riderId - Rider ID
   * @returns {Promise<Object>} - Rider statistics
   */
  async getRiderStatistics(riderId) {
    const rider = await riderStorage.getById(riderId);
    if (!rider) {
      throw new Error('Rider not found');
    }
    
    // Get all orders assigned to this rider
    const prisma = require('../prisma');
    const riderOrders = await prisma.order.findMany({
      where: {
        riderId: riderId
      }
    });
    
    // Calculate statistics
    const completedOrders = riderOrders.filter(order => 
      order.status === 'Delivered' || order.status === 'Completed'
    );
    
    const cancelledOrders = riderOrders.filter(order => 
      order.status === 'Cancelled'
    );
    
    const totalEarnings = completedOrders.reduce(
      (sum, order) => sum + (order.riderPayment || 0), 
      0
    );
    
    // Calculate average delivery time
    const deliveryTimes = completedOrders
      .filter(order => order.acceptedAt && order.deliveredAt)
      .map(order => {
        const assignedTime = new Date(order.acceptedAt).getTime();
        const deliveredTime = new Date(order.deliveredAt).getTime();
        return (deliveredTime - assignedTime) / (1000 * 60); // in minutes
      });
    
    const averageDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
      : 0;
    
    return {
      totalDeliveries: riderOrders.length,
      completedDeliveries: completedOrders.length,
      cancelledDeliveries: cancelledOrders.length,
      totalEarnings,
      averageDeliveryTime: Math.round(averageDeliveryTime),
      rating: rider.rating
    };
  }

  /**
   * Record that a rider declined an order
   * @param {string} riderId - Rider ID
   * @param {string} orderId - Order ID
   * @param {string} reason - Reason for declining
   * @returns {Promise<boolean>} - Whether the decline was recorded successfully
   */
  async recordOrderDecline(riderId, orderId, reason) {
    try {
      // Get the order
      const order = await orderStorage.getById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Get the rider
      const rider = await riderStorage.getById(riderId);
      if (!rider) {
        throw new Error('Rider not found');
      }
      
      // Update order to record the decline
      const prisma = require('../prisma');
      
      // Get the current declinedBy list or create a new one
      let declinedBy = [];
      if (order.declinedBy) {
        try {
          declinedBy = JSON.parse(order.declinedBy);
        } catch (error) {
          console.error('Error parsing declinedBy:', error);
          // If there's an error parsing, start with an empty array
        }
      }
      
      // Add the rider ID to the list if not already there
      if (!declinedBy.includes(riderId)) {
        declinedBy.push(riderId);
      }
      
      // Update the order with the new declinedBy list
      await prisma.order.update({
        where: { id: orderId },
        data: {
          declinedBy: JSON.stringify(declinedBy),
          updatedAt: new Date()
        }
      });
      
      // Log the decline
      console.log(`Rider ${riderId} declined order ${orderId} with reason: ${reason}`);
      
      // Track the event
      await analyticsService.trackEvent('order_declined_by_rider', {
        riderId,
        orderId,
        reason
      });
      
      return true;
    } catch (error) {
      console.error('Error recording order decline:', error);
      throw new Error('Failed to record order decline: ' + error.message);
    }
  }
}

export const riderService = new RiderService(); 