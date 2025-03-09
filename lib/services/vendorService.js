import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { analyticsService } from './analyticsService';
import { getQuickEstimate, getAvailableMoveSizes } from './pricingService';

class VendorService {
  /**
   * Get all vendors
   * @returns {Array} - Array of all vendors
   */
  async getAllVendors() {
    const vendors = await storage.readData('vendors.json');
    return vendors || [];
  }

  /**
   * Create a new vendor
   * @param {Object} vendorData - The vendor data
   * @returns {Object} - The created vendor
   */
  async createVendor(vendorData) {
    const {
      vendorId,
      name,
      email,
      serviceAreas,
      basePrice,
      description,
      phone,
      whatsapp
    } = vendorData;

    if (!vendorId || !name || !email || !serviceAreas) {
      throw new Error('Missing required fields');
    }

    // Check if vendor already exists
    const existingVendor = await this.getVendorByEmail(email);
    if (existingVendor) {
      throw new Error('Vendor already exists');
    }

    // Create new vendor
    const newVendor = {
      vendorId,
      name,
      email,
      serviceAreas: Array.isArray(serviceAreas) ? serviceAreas : [],
      basePrice: basePrice || 0, // We'll keep this for backward compatibility
      pricingTier: vendorData.pricingTier || 'default', // Add pricing tier (economy, default, premium)
      description: description || '',
      rating: 0,
      reviewCount: 0,
      reviews: [],
      availability: 'available',
      phone,
      whatsapp: whatsapp || phone,
      createdAt: new Date().toISOString()
    };

    // Add vendor to vendors.json
    const updated = await storage.updateData('vendors.json', (vendors) => {
      vendors.push(newVendor);
      return vendors;
    });

    if (!updated) {
      throw new Error('Failed to create vendor');
    }

    // Track vendor creation event
    await analyticsService.trackEvent('vendor_created', {
      vendorId: newVendor.vendorId,
      name: newVendor.name,
      services: [],
      serviceAreas: newVendor.serviceAreas
    });

    return newVendor;
  }

  /**
   * Get a vendor by email
   * @param {string} email - The vendor's email
   * @returns {Object|null} - The vendor object or null if not found
   */
  async getVendorByEmail(email) {
    const vendors = await storage.readData('vendors.json');
    return vendors?.find(v => v && v.email === email) || null;
  }

  /**
   * Get a vendor by ID
   * @param {string} vendorId - The vendor's ID
   * @returns {Object|null} - The vendor object or null if not found
   */
  async getVendorById(vendorId) {
    const vendors = await storage.readData('vendors.json');
    return vendors?.find(v => v && v.vendorId === vendorId) || null;
  }

  /**
   * Update vendor availability status
   * @param {string} email - The vendor's email
   * @param {string} status - The new availability status ('available', 'unavailable')
   * @returns {Object} - The updated vendor object
   */
  async updateAvailability(email, status) {
    if (!['available', 'unavailable'].includes(status)) {
      throw new Error('Invalid status');
    }

    let updatedVendor;
    const updated = await storage.updateData('vendors.json', (vendors) => {
      const vendorIndex = vendors.findIndex(v => v && v.email === email);
      if (vendorIndex === -1) {
        throw new Error('Vendor not found');
      }
      
      vendors[vendorIndex].availability = status;
      updatedVendor = vendors[vendorIndex];
      return vendors;
    });

    if (!updated) {
      throw new Error('Failed to update vendor availability');
    }

    // Track vendor availability change
    await analyticsService.trackEvent('vendor_availability_changed', {
      vendorId: updatedVendor.vendorId,
      availability: status
    });

    return this.getVendorByEmail(email);
  }

  /**
   * Get vendor requests (active, submitted quotes, won/lost opportunities)
   * @param {string} vendorId - The vendor's ID
   * @returns {Object} - Object containing different types of requests
   */
  async getVendorRequests(vendorId) {
    const vendors = await storage.readData('vendors.json');
    const orders = await storage.readData('orders.json');
    
    if (!orders || !vendors) {
      throw new Error('Failed to read data');
    }

    // Make sure each order has the required fields
    const normalizedOrders = orders.filter(order => order).map(order => ({
      ...order,
      vendorRequests: Array.isArray(order.vendorRequests) ? order.vendorRequests : [],
      quotes: Array.isArray(order.quotes) ? order.quotes : [],
      status: order.status || 'Unknown',
      orderId: order.orderId || 'Unknown'
    }));
    
    // Active requests - orders where this vendor has been requested but hasn't submitted a quote yet
    const activeRequests = normalizedOrders.filter(order => 
      order.vendorRequests.includes(vendorId) &&
      !order.quotes.some(quote => quote && quote.vendorId === vendorId) &&
      order.status !== 'Paid' &&
      !order.selectedVendorId
    );
    
    // Submitted quotes - orders where this vendor has submitted a quote but the user hasn't made a decision yet
    const submittedQuotes = normalizedOrders.filter(order => 
      order.quotes && order.quotes.some(quote => quote && quote.vendorId === vendorId) &&
      order.status !== 'Paid' &&
      !order.selectedVendorId
    ).map(order => {
      // Find this vendor's quote
      const vendorQuote = order.quotes.find(quote => quote && quote.vendorId === vendorId);
      
      return {
        ...order,
        submittedQuote: true,
        quoteAmount: vendorQuote?.amount || 0,
        quoteSubmittedAt: vendorQuote?.submittedAt || new Date().toISOString()
      };
    });
    
    // Won opportunities - orders where this vendor was selected and paid
    const wonOpportunities = normalizedOrders.filter(order => 
      order.selectedVendorId === vendorId &&
      order.status === 'Paid'
    ).map(order => {
      // Find this vendor's quote
      const vendorQuote = order.quotes.find(quote => quote && quote.vendorId === vendorId);
      
      return {
        ...order,
        wonOpportunity: true,
        quoteAmount: vendorQuote?.amount || 0,
        paidAt: order.payment?.paidAt || new Date().toISOString()
      };
    });
    
    // Lost opportunities where this vendor submitted a quote
    const lostOpportunitiesWithQuote = normalizedOrders.filter(order => 
      order.quotes && order.quotes.some(quote => quote && quote.vendorId === vendorId) &&
      order.status === 'Paid' &&
      order.selectedVendorId && 
      order.selectedVendorId !== vendorId
    ).map(order => {
      // Find the selected vendor
      const selectedVendor = vendors.find(v => v && v.vendorId === order.selectedVendorId);
      
      // Find this vendor's quote
      const vendorQuote = order.quotes.find(quote => quote && quote.vendorId === vendorId);
      
      // Calculate price difference with safety checks
      let priceDifference = 0;
      if (vendorQuote?.amount && order.selectedQuote?.amount) {
        priceDifference = vendorQuote.amount - order.selectedQuote.amount;
      }
      
      // Create a message based on price difference
      let priceComparisonMessage = '';
      if (priceDifference > 0) {
        priceComparisonMessage = `They quoted ₹${priceDifference ? priceDifference.toLocaleString('en-IN') : '0'} less than your price.`;
      } else if (priceDifference < 0) {
        priceComparisonMessage = `They were selected despite quoting ₹${priceDifference ? Math.abs(priceDifference).toLocaleString('en-IN') : '0'} more than your price.`;
      } else {
        priceComparisonMessage = `They submitted the same price as you.`;
      }
      
      return {
        ...order,
        lostOpportunity: true,
        didQuote: true,
        selectedVendorName: selectedVendor?.name || 'Another vendor',
        priceDifference: priceDifference || 0,
        priceComparisonMessage: priceComparisonMessage || 'This opportunity was assigned to another vendor.',
        quoteAmount: vendorQuote?.amount || 0
      };
    });
    
    // Lost opportunities where this vendor was requested but never submitted a quote
    const lostOpportunitiesNoQuote = normalizedOrders.filter(order => 
      order.vendorRequests && Array.isArray(order.vendorRequests) &&
      order.vendorRequests.includes(vendorId) &&
      (!order.quotes || !order.quotes.some(quote => quote && quote.vendorId === vendorId)) &&
      order.status === 'Paid' &&
      order.selectedVendorId
    ).map(order => {
      // Find the selected vendor
      const selectedVendor = vendors.find(v => v && v.vendorId === order.selectedVendorId);
      
      return {
        ...order,
        lostOpportunity: true,
        didQuote: false,
        selectedVendorName: selectedVendor?.name || 'Another vendor',
        priceComparisonMessage: 'You did not submit a quote for this opportunity.'
      };
    });
    
    // Combine all requests and opportunities
    const allRequests = [
      ...activeRequests, 
      ...submittedQuotes,
      ...wonOpportunities,
      ...lostOpportunitiesWithQuote,
      ...lostOpportunitiesNoQuote
    ];

    return allRequests;
  }

  /**
   * Get affiliate statistics for a vendor
   * @param {string} email - The vendor's email
   * @returns {Object} - Affiliate statistics
   */
  async getAffiliateStats(email) {
    const vendor = await this.getVendorByEmail(email);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const orders = await storage.readData('orders.json');
    
    // Default affiliate data if not present
    const affiliate = vendor.affiliate || {
      isAffiliate: false,
      referralCode: '',
      referredVendors: [],
      commissionRate: 20,
      discountedCommissionsRemaining: 0,
      discountedCommissionsUsed: 0,
      commissionHistory: [],
      earnings: 0
    };

    // Calculate total earnings from commission history
    let totalEarnings = 0;
    if (Array.isArray(affiliate.commissionHistory)) {
      totalEarnings = affiliate.commissionHistory.reduce((sum, record) => {
        return sum + (record.amount || 0);
      }, 0);
    }

    // Count cross leads submitted by this vendor
    const crossLeadsSubmitted = orders.filter(order => 
      order.crossLead && order.crossLeadVendorId === vendor.vendorId
    ).length;

    // Count referred vendors who have completed orders
    const activeReferrals = [];
    if (Array.isArray(affiliate.referredVendors)) {
      for (const referredVendorId of affiliate.referredVendors) {
        // Check if this vendor has completed any orders
        const hasCompletedOrders = orders.some(order => 
          order.selectedVendorId === referredVendorId && 
          order.status === 'Completed'
        );
        
        if (hasCompletedOrders) {
          const referredVendor = await this.getVendorById(referredVendorId);
          if (referredVendor) {
            activeReferrals.push({
              vendorId: referredVendorId,
              name: referredVendor.name,
              completedOrders: orders.filter(order => 
                order.selectedVendorId === referredVendorId && 
                order.status === 'Completed'
              ).length
            });
          }
        }
      }
    }

    // Calculate discounted commissions remaining
    // Each cross lead submitted gives one discounted commission
    const discountedCommissionsRemaining = Math.max(0, crossLeadsSubmitted - (affiliate.discountedCommissionsUsed || 0));
    
    // Calculate current commission rate
    // Standard rate is 20%, discounted rate is 5%
    const currentRate = discountedCommissionsRemaining > 0 ? 5 : 20;

    return {
      isAffiliate: true, // If they're using the affiliate system, they are an affiliate
      referralCode: affiliate.referralCode || vendor.vendorId.substring(0, 8),
      referredVendors: affiliate.referredVendors || [],
      activeReferrals,
      crossLeadsSubmitted,
      discountedCommissionsRemaining,
      discountedCommissionsUsed: affiliate.discountedCommissionsUsed || 0,
      currentRate,
      commissionHistory: affiliate.commissionHistory || [],
      totalEarnings
    };
  }

  /**
   * Create a cross-lead (vendor-generated lead)
   * @param {Object} leadData - The lead data
   * @param {string} vendorEmail - The vendor's email
   * @returns {Object} - The created order
   */
  async createCrossLead(leadData, vendorEmail) {
    const {
      customerEmail,
      customerName,
      customerPhone,
      pickupPincode,
      destinationPincode,
      moveSize,
      moveDate,
      vendorManaged
    } = leadData;

    // Validate required fields
    if (!customerEmail || !pickupPincode || !destinationPincode || !moveSize || !moveDate || !customerName || !customerPhone) {
      throw new Error('Missing required fields');
    }

    const vendor = await this.getVendorByEmail(vendorEmail);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Create a new order
    const orderId = uuidv4();
    const now = new Date().toISOString();

    const newOrder = {
      orderId,
      userEmail: customerEmail,
      userName: customerName,
      userPhone: customerPhone,
      createdAt: now,
      updatedAt: now,
      status: 'Initiated',
      moveDetails: {
        pickupPincode,
        destinationPincode,
        moveSize,
        moveDate,
        items: []
      },
      vendorRequests: vendorManaged ? [vendor.vendorId] : [],
      quotes: [],
      crossLead: true,
      crossLeadVendorId: vendor.vendorId,
      vendorManaged: !!vendorManaged,
      isCrossLead: true,
      referringVendorId: vendor.vendorId,
      commissionRate: 5 // 5% commission discount
    };

    // Add the order to orders.json
    const updated = await storage.updateData('orders.json', (orders) => {
      orders.push(newOrder);
      return orders;
    });

    if (!updated) {
      throw new Error('Failed to create cross-lead');
    }

    // Track cross lead submission
    await this.trackCrossLeadSubmission(vendor.vendorId, orderId, { 
      email: customerEmail,
      name: customerName,
      phone: customerPhone
    });

    return newOrder;
  }

  /**
   * Get vendor's cross-leads
   * @param {string} vendorId - The vendor's ID
   * @returns {Array} - The vendor's cross-leads
   */
  async getVendorCrossLeads(vendorId) {
    const orders = await storage.readData('orders.json');
    
    if (!orders) {
      throw new Error('Failed to read orders data');
    }
    
    // Filter orders that are cross-leads created by this vendor
    return orders.filter(order => 
      order.crossLead && 
      order.crossLeadVendorId === vendorId
    );
  }

  /**
   * Get all cross-leads available for a vendor to claim
   * @param {string} vendorId - The vendor's ID
   * @returns {Array} - Available cross-leads
   */
  async getAvailableCrossLeads(vendorId) {
    const orders = await storage.readData('orders.json');
    
    if (!orders) {
      throw new Error('Failed to read orders data');
    }
    
    // Filter orders that are cross-leads not created by this vendor and not yet claimed
    return orders.filter(order => 
      order.crossLead && 
      order.crossLeadVendorId !== vendorId &&
      !order.vendorRequests.includes(vendorId) &&
      order.status === 'Initiated'
    );
  }

  /**
   * Find recommended vendors for a specific move
   * @param {Object} moveDetails - Details of the move (pickup, destination, size, date)
   * @param {number} limit - Maximum number of vendors to recommend
   * @returns {Promise<Array>} - Array of recommended vendors with match scores
   */
  async findRecommendedVendors(moveDetails, limit = 5) {
    const { pickupPincode, destinationPincode, moveSize, moveDate } = moveDetails;
    
    if (!pickupPincode || !destinationPincode || !moveSize || !moveDate) {
      throw new Error('Missing required move details');
    }
    
    // Get all available vendors
    const allVendors = await this.getAllVendors();
    const availableVendors = allVendors.filter(v => v.availability === 'available');
    
    if (availableVendors.length === 0) {
      return [];
    }
    
    // Calculate move date
    const requestedMoveDate = new Date(moveDate);
    const today = new Date();
    
    // Score and rank vendors
    const scoredVendors = availableVendors.map(vendor => {
      let score = 0;
      
      // Score based on service area match
      const servesPickup = vendor.serviceAreas?.includes(pickupPincode) ? 30 : 0;
      const servesDestination = vendor.serviceAreas?.includes(destinationPincode) ? 30 : 0;
      score += servesPickup + servesDestination;
      
      // Score based on rating (0-25 points)
      score += (vendor.rating || 0) * 5;
      
      // Score based on review count (0-15 points)
      const reviewCountScore = Math.min(vendor.reviewCount || 0, 30) / 2;
      score += reviewCountScore;
      
      // Adjust score based on capacity for the requested date
      // This would require a more sophisticated booking/calendar system
      // For now, we'll use a placeholder implementation
      
      return {
        ...vendor,
        matchScore: score,
        servesPickup: servesPickup > 0,
        servesDestination: servesDestination > 0
      };
    });
    
    // Sort by score (highest first) and take the top 'limit' vendors
    return scoredVendors
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * Calculate and update vendor performance metrics
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Object>} - Updated vendor with performance metrics
   */
  async updateVendorPerformanceMetrics(vendorId) {
    if (!vendorId) {
      throw new Error('Vendor ID is required');
    }
    
    // Get vendor data
    const vendors = await storage.readData('vendors.json');
    if (!vendors) {
      throw new Error('Vendors data not found');
    }
    
    const vendorIndex = vendors.findIndex(v => v.vendorId === vendorId);
    if (vendorIndex === -1) {
      throw new Error('Vendor not found');
    }
    
    // Get orders data
    const orders = await storage.readData('orders.json');
    if (!orders) {
      throw new Error('Orders data not found');
    }
    
    // Filter orders for this vendor
    const vendorOrders = orders.filter(o => 
      o.selectedVendorId === vendorId && 
      ['Completed', 'Reviewed', 'Closed'].includes(o.status)
    );
    
    // Calculate performance metrics
    const totalOrders = vendorOrders.length;
    const completedOrders = vendorOrders.filter(o => ['Completed', 'Reviewed', 'Closed'].includes(o.status)).length;
    const cancelledOrders = orders.filter(o => 
      o.selectedVendorId === vendorId && 
      o.status === 'Cancelled' &&
      o.cancelledBy === 'vendor'
    ).length;
    
    // Calculate on-time delivery rate
    const onTimeDeliveries = vendorOrders.filter(o => {
      // Check if delivered on or before the scheduled date
      if (!o.deliveredAt || !o.moveDate) return false;
      
      const deliveredDate = new Date(o.deliveredAt);
      const scheduledDate = new Date(o.moveDate);
      
      return deliveredDate <= scheduledDate;
    }).length;
    
    const onTimeDeliveryRate = totalOrders > 0 ? (onTimeDeliveries / totalOrders) * 100 : 0;
    
    // Calculate response time (average time to accept or decline requests)
    const responseTimes = [];
    orders.forEach(o => {
      if (o.vendorRequests?.includes(vendorId)) {
        const requestIndex = o.vendorRequests.indexOf(vendorId);
        if (requestIndex >= 0 && o.requestTimestamps?.[requestIndex] && o.responseTimestamps?.[requestIndex]) {
          const requestTime = new Date(o.requestTimestamps[requestIndex]);
          const responseTime = new Date(o.responseTimestamps[requestIndex]);
          const diffInMinutes = (responseTime - requestTime) / (1000 * 60);
          responseTimes.push(diffInMinutes);
        }
      }
    });
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : null;
    
    // Calculate completion rate
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    
    // Calculate cancellation rate
    const cancellationRate = (totalOrders + cancelledOrders) > 0 
      ? (cancelledOrders / (totalOrders + cancelledOrders)) * 100 
      : 0;
    
    // Calculate overall performance score (0-100)
    let performanceScore = 0;
    
    // Rating contributes 40% (0-5 stars converted to 0-40 points)
    const ratingScore = (vendors[vendorIndex].rating || 0) * 8;
    
    // Completion rate contributes 25% (0-100% converted to 0-25 points)
    const completionScore = completionRate * 0.25;
    
    // On-time delivery rate contributes 25% (0-100% converted to 0-25 points)
    const onTimeScore = onTimeDeliveryRate * 0.25;
    
    // Response time contributes 10% (inverse relationship - faster is better)
    // Max score for < 30 min, 0 for > 24 hours
    const responseScore = averageResponseTime !== null
      ? Math.max(0, 10 - (averageResponseTime / (24 * 60)) * 10)
      : 5; // Default middle score if no data
    
    performanceScore = ratingScore + completionScore + onTimeScore + responseScore;
    
    // Determine tier based on performance score
    let tier = 'Bronze';
    if (performanceScore >= 85) {
      tier = 'Platinum';
    } else if (performanceScore >= 70) {
      tier = 'Gold';
    } else if (performanceScore >= 50) {
      tier = 'Silver';
    }
    
    // Update vendor with performance metrics
    const updatedVendor = {
      ...vendors[vendorIndex],
      performanceMetrics: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        onTimeDeliveryRate,
        averageResponseTime,
        completionRate,
        cancellationRate,
        performanceScore,
        lastUpdated: new Date().toISOString()
      },
      tier
    };
    
    // Save updated vendor
    await storage.updateData('vendors.json', (vendors) => {
      vendors[vendorIndex] = updatedVendor;
      return vendors;
    });
    
    return updatedVendor;
  }

  /**
   * Get vendor tier benefits
   * @param {string} tier - Vendor tier (Bronze, Silver, Gold, Platinum)
   * @returns {Object} - Tier benefits
   */
  getVendorTierBenefits(tier) {
    const benefits = {
      'Bronze': {
        commissionRate: 15, // 15% commission
        prioritySupport: false,
        featuredListing: false,
        earlyAccess: false,
        discountedFees: false
      },
      'Silver': {
        commissionRate: 12, // 12% commission
        prioritySupport: true,
        featuredListing: false,
        earlyAccess: false,
        discountedFees: false
      },
      'Gold': {
        commissionRate: 10, // 10% commission
        prioritySupport: true,
        featuredListing: true,
        earlyAccess: true,
        discountedFees: false
      },
      'Platinum': {
        commissionRate: 8, // 8% commission
        prioritySupport: true,
        featuredListing: true,
        earlyAccess: true,
        discountedFees: true
      }
    };
    
    return benefits[tier] || benefits['Bronze'];
  }

  /**
   * Respond to order request
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {boolean} accepted - Whether the vendor accepted the request
   * @param {Object} responseData - Additional response data
   * @returns {Promise<Object>} - Updated order
   */
  async respondToRequest(orderId, vendorId, accepted, responseData = {}) {
    // ... existing code ...
    
    // Track vendor response event
    await analyticsService.trackEvent('vendor_response', {
      orderId,
      vendorId,
      accepted,
      responseTime: new Date().toISOString()
    });
    
    // ... existing code ...
  }
  
  /**
   * Update vendor tier
   * @param {string} vendorId - Vendor ID
   * @param {string} tier - New tier
   * @returns {Promise<Object>} - Updated vendor
   */
  async updateVendorTier(vendorId, tier) {
    // ... existing code ...
    
    // Track vendor tier update
    await analyticsService.trackEvent('vendor_tier_updated', {
      vendorId,
      previousTier: vendor.tier || 'Bronze',
      newTier: tier
    });
    
    // ... existing code ...
  }

  /**
   * Calculate base price for a vendor based on move details
   * @param {string} vendorId - The vendor ID
   * @param {Object} moveDetails - Move details (pickupPincode, destinationPincode, moveSize)
   * @returns {Promise<Object>} - Price details
   */
  async calculateVendorPrice(vendorId, moveDetails) {
    const { pickupPincode, destinationPincode, moveSize } = moveDetails;
    
    if (!pickupPincode || !destinationPincode || !moveSize) {
      throw new Error('Missing required move details');
    }
    
    // Get vendor details
    const vendor = await this.getVendorById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    
    // Get base price from pricing service
    let baseEstimate;
    try {
      baseEstimate = await getQuickEstimate(pickupPincode, destinationPincode, moveSize);
    } catch (error) {
      console.error('Error getting price estimate:', error);
      // Fallback to vendor's static base price if pricing service fails
      return {
        basePrice: vendor.basePrice,
        isEstimated: false,
        vendorTier: vendor.pricingTier || 'default'
      };
    }
    
    // Apply vendor tier adjustment
    const tierMultiplier = this.getVendorTierPriceMultiplier(vendor.pricingTier || 'default');
    const adjustedPrice = Math.round(baseEstimate.estimatedCost * tierMultiplier);
    
    return {
      basePrice: adjustedPrice,
      systemEstimate: baseEstimate.estimatedCost,
      distance: baseEstimate.distance,
      isEstimated: true,
      vendorTier: vendor.pricingTier || 'default',
      tierMultiplier
    };
  }
  
  /**
   * Get price multiplier based on vendor tier
   * @param {string} tier - Vendor tier (economy, default, premium)
   * @returns {number} - Price multiplier
   */
  getVendorTierPriceMultiplier(tier) {
    const multipliers = {
      'economy': 0.85,  // 15% discount
      'default': 1.0,   // Standard price
      'premium': 1.25   // 25% premium
    };
    
    return multipliers[tier] || multipliers.default;
  }

  /**
   * Track when a vendor uses their commission discount
   * @param {string} vendorId - Vendor ID
   * @param {string} orderId - Order ID
   * @returns {Promise<boolean>} - Whether the tracking was successful
   */
  async trackCommissionDiscountUsage(vendorId, orderId) {
    try {
      const vendors = await storage.readData('vendors.json');
      if (!vendors) {
        return false;
      }
      
      const vendorIndex = vendors.findIndex(v => v.vendorId === vendorId);
      if (vendorIndex === -1) {
        return false;
      }
      
      // Initialize affiliate property if it doesn't exist
      if (!vendors[vendorIndex].affiliate) {
        vendors[vendorIndex].affiliate = {
          isAffiliate: true,
          referralCode: vendorId.substring(0, 8),
          referredVendors: [],
          commissionRate: 20,
          discountedCommissionsRemaining: 0,
          discountedCommissionsUsed: 0,
          commissionHistory: []
        };
      }
      
      // Increment discounted commissions used
      vendors[vendorIndex].affiliate.discountedCommissionsUsed = 
        (vendors[vendorIndex].affiliate.discountedCommissionsUsed || 0) + 1;
      
      // Add to affiliate history
      if (!vendors[vendorIndex].affiliate.history) {
        vendors[vendorIndex].affiliate.history = [];
      }
      
      vendors[vendorIndex].affiliate.history.push({
        orderId,
        action: 'Used discounted commission',
        date: new Date().toISOString(),
        rate: 5
      });
      
      // Save the updated vendors
      await storage.writeData('vendors.json', vendors);
      
      // Track analytics
      analyticsService.trackEvent('commission_discount_used', {
        vendorId,
        orderId,
        discountedRate: 5
      });
      
      return true;
    } catch (error) {
      console.error('Error tracking commission discount usage:', error);
      return false;
    }
  }

  /**
   * Track when a cross lead is submitted
   * @param {string} vendorId - Vendor ID
   * @param {string} orderId - Order ID
   * @param {Object} customerDetails - Customer details
   * @returns {Promise<boolean>} - Whether the tracking was successful
   */
  async trackCrossLeadSubmission(vendorId, orderId, customerDetails) {
    try {
      const vendors = await storage.readData('vendors.json');
      if (!vendors) {
        return false;
      }
      
      const vendorIndex = vendors.findIndex(v => v.vendorId === vendorId);
      if (vendorIndex === -1) {
        return false;
      }
      
      // Initialize affiliate property if it doesn't exist
      if (!vendors[vendorIndex].affiliate) {
        vendors[vendorIndex].affiliate = {
          isAffiliate: true,
          referralCode: vendorId.substring(0, 8),
          referredVendors: [],
          commissionRate: 20,
          discountedCommissionsRemaining: 0,
          discountedCommissionsUsed: 0,
          commissionHistory: []
        };
      }
      
      // Add to affiliate history
      if (!vendors[vendorIndex].affiliate.history) {
        vendors[vendorIndex].affiliate.history = [];
      }
      
      vendors[vendorIndex].affiliate.history.push({
        orderId,
        action: 'Submitted cross lead',
        date: new Date().toISOString(),
        customerEmail: customerDetails.email,
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone
      });
      
      // Save the updated vendors
      await storage.writeData('vendors.json', vendors);
      
      // Track analytics
      analyticsService.trackEvent('cross_lead_submitted', {
        vendorId,
        orderId,
        customerEmail: customerDetails.email,
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone
      });
      
      return true;
    } catch (error) {
      console.error('Error tracking cross lead submission:', error);
      return false;
    }
  }
}

export const vendorService = new VendorService(); 