const { storage } = require('../storage');

class AnalyticsService {
  constructor() {
    this.eventsInitialized = false;
    this.analyticsEvents = [];
    this.initializeAnalyticsEvents();
  }

  /**
   * Initialize analytics events from storage
   * This method loads existing analytics events from storage
   * or creates a new empty array if none exist
   */
  async initializeAnalyticsEvents() {
    try {
      // In a real implementation, this would load from a database
      // For now, we'll just initialize an empty array
      this.analyticsEvents = [];
      this.eventsInitialized = true;
      console.log('Analytics events initialized');
    } catch (error) {
      console.error('Failed to initialize analytics events:', error);
      this.analyticsEvents = [];
      this.eventsInitialized = false;
    }
  }

  /**
   * Get business overview metrics
   * @param {string} startDate - Start date for filtering
   * @param {string} endDate - End date for filtering
   * @returns {Promise<Object>} Business overview metrics
   */
  async getBusinessOverview(startDate, endDate) {
    // Implementation would typically query a database or analytics service
    // For now, returning mock data
    const totalOrders = 125;
    const totalRevenue = 250000;
    const averageOrderValue = Math.round(totalRevenue / totalOrders);
    
    // Calculate commission tiers
    const commissionTier1 = this.getCommissionRateByTier(1);
    const commissionTier2 = this.getCommissionRateByTier(2);
    const commissionTier3 = this.getCommissionRateByTier(3);
    
    // Mock distribution of orders by tier
    const tier1Orders = Math.round(totalOrders * 0.6); // 60% in tier 1
    const tier2Orders = Math.round(totalOrders * 0.3); // 30% in tier 2
    const tier3Orders = Math.round(totalOrders * 0.1); // 10% in tier 3
    
    // Calculate commission revenue
    const tier1Revenue = Math.round(tier1Orders * averageOrderValue * commissionTier1);
    const tier2Revenue = Math.round(tier2Orders * averageOrderValue * commissionTier2);
    const tier3Revenue = Math.round(tier3Orders * averageOrderValue * commissionTier3);
    const totalCommissionRevenue = tier1Revenue + tier2Revenue + tier3Revenue;
    
    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      completionRate: 92,
      growthRate: 15,
      commissionRevenue: {
        total: totalCommissionRevenue,
        byTier: {
          tier1: tier1Revenue,
          tier2: tier2Revenue,
          tier3: tier3Revenue
        }
      },
      activeVendors: 28,
      activeCustomers: 112
    };
  }

  /**
   * Get commission rate by tier
   * @param {number} tier - Vendor tier (1, 2, or 3)
   * @returns {number} Commission rate as a decimal
   */
  getCommissionRateByTier(tier) {
    switch (tier) {
      case 1:
        return 0.05; // 5% commission for tier 1
      case 2:
        return 0.075; // 7.5% commission for tier 2
      case 3:
        return 0.1; // 10% commission for tier 3
      default:
        return 0.05; // Default to tier 1 rate
    }
  }

  /**
   * Get order trends over time
   * @param {string} interval - Interval for grouping (day, week, month)
   * @param {number} limit - Number of data points to return
   * @returns {Promise<Array>} Order trends data
   */
  async getOrderTrends(interval = 'day', limit = 30) {
    // Validate interval
    if (!['day', 'week', 'month'].includes(interval)) {
      throw new Error('Invalid interval. Must be day, week, or month.');
    }
    
    // Validate limit
    if (limit <= 0 || limit > 365) {
      throw new Error('Invalid limit. Must be between 1 and 365.');
    }
    
    // Calculate milliseconds per interval
    const msPerInterval = {
      day: 86400000, // 24 hours
      week: 604800000, // 7 days
      month: 2592000000 // 30 days (approximate)
    };
    
    // Generate mock data
    const now = Date.now();
    const trends = [];
    
    for (let i = 0; i < limit; i++) {
      const date = new Date(now - (i * msPerInterval[interval]));
      
      // Format date based on interval
      let formattedDate;
      if (interval === 'day') {
        formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (interval === 'week') {
        // Get the Monday of the week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        const monday = new Date(date.setDate(diff));
        formattedDate = monday.toISOString().split('T')[0]; // YYYY-MM-DD of Monday
      } else {
        // For month, use YYYY-MM
        formattedDate = date.toISOString().split('T')[0].substring(0, 7);
      }
      
      // Generate random but somewhat realistic data
      // Base values that increase slightly for more recent dates
      const baseOrders = 5 + Math.floor(i / 10);
      const baseRevenue = 10000 + (i * 500);
      
      // Add randomness
      const randomFactor = 0.3; // 30% randomness
      const randomMultiplier = 1 + (Math.random() * randomFactor * 2 - randomFactor);
      
      const orders = Math.max(1, Math.floor(baseOrders * randomMultiplier));
      const revenue = Math.floor(baseRevenue * randomMultiplier);
      
      trends.push({
        date: formattedDate,
        orders,
        revenue,
        averageOrderValue: Math.floor(revenue / orders)
      });
    }
    
    // Return in chronological order
    return trends.reverse();
  }

  /**
   * Get vendor performance metrics
   * @param {string} vendorId - Optional vendor ID to filter for a specific vendor
   * @returns {Promise<Array>} Vendor performance metrics
   */
  async getVendorPerformanceMetrics() {
    // Mock data for vendor performance
    const vendors = [
      {
        vendorId: 'v1',
        name: 'Premier Movers',
        tier: 3,
        metrics: {
          totalOrders: 45,
          completedOrders: 43,
          completionRate: 95.6,
          averageRating: 4.8,
          responseTime: 2.5, // hours
          totalRevenue: 135000,
          commissionPaid: 13500, // 10% for tier 3
          customerRetention: 85, // percentage
          growthRate: 12 // percentage
        }
      },
      {
        vendorId: 'v2',
        name: 'Swift Relocations',
        tier: 2,
        metrics: {
          totalOrders: 38,
          completedOrders: 35,
          completionRate: 92.1,
          averageRating: 4.6,
          responseTime: 3.2, // hours
          totalRevenue: 95000,
          commissionPaid: 7125, // 7.5% for tier 2
          customerRetention: 78, // percentage
          growthRate: 8 // percentage
        }
      },
      {
        vendorId: 'v3',
        name: 'Urban Movers',
        tier: 1,
        metrics: {
          totalOrders: 25,
          completedOrders: 22,
          completionRate: 88.0,
          averageRating: 4.3,
          responseTime: 4.5, // hours
          totalRevenue: 50000,
          commissionPaid: 2500, // 5% for tier 1
          customerRetention: 65, // percentage
          growthRate: 5 // percentage
        }
      }
    ];
    
    return vendors;
  }

  /**
   * Get customer insights
   * @returns {Promise<Object>} Customer insights data
   */
  async getCustomerInsights() {
    // Mock data for customer insights
    
    // Customer acquisition
    const newCustomers = 45;
    const returningCustomers = 30;
    const totalCustomers = newCustomers + returningCustomers;
    
    // Customer satisfaction
    const customerSatisfaction = 4.7; // out of 5
    
    // Demographics (mock data)
    const demographics = {
      ageGroups: [
        { group: '18-24', percentage: 15 },
        { group: '25-34', percentage: 35 },
        { group: '35-44', percentage: 25 },
        { group: '45-54', percentage: 15 },
        { group: '55+', percentage: 10 }
      ],
      gender: [
        { type: 'Male', percentage: 55 },
        { type: 'Female', percentage: 43 },
        { type: 'Other', percentage: 2 }
      ],
      income: [
        { range: 'Below 5L', percentage: 20 },
        { range: '5L-10L', percentage: 35 },
        { range: '10L-15L', percentage: 25 },
        { range: '15L-25L', percentage: 15 },
        { range: 'Above 25L', percentage: 5 }
      ]
    };
    
    // Move reasons
    const topMoveReasons = [
      { reason: 'New Job', percentage: 35 },
      { reason: 'Upsizing', percentage: 25 },
      { reason: 'Downsizing', percentage: 20 },
      { reason: 'Family Changes', percentage: 15 },
      { reason: 'Other', percentage: 5 }
    ];
    
    // Customer behavior
    const customerBehavior = {
      averageTimeToBook: 7.5, // days from first visit to booking
      bookingChannels: [
        { channel: 'Website', percentage: 65 },
        { channel: 'Mobile App', percentage: 25 },
        { channel: 'Phone', percentage: 10 }
      ],
      moveTypes: [
        { type: '1BHK', percentage: 30 },
        { type: '2BHK', percentage: 45 },
        { type: '3BHK', percentage: 20 },
        { type: '4BHK+', percentage: 5 }
      ]
    };
    
    return {
      newCustomers,
      returningCustomers,
      totalCustomers,
      customerSatisfaction,
      demographics,
      topMoveReasons,
      customerBehavior
    };
  }

  /**
   * Get popular move routes
   * @returns {Promise<Array>} Popular move routes data
   */
  async getPopularMoveRoutes() {
    // Mock data for popular move routes
    return [
      { from: 'Mumbai', to: 'Bangalore', count: 25, averageDistance: 980, averageCost: 15000 },
      { from: 'Delhi', to: 'Mumbai', count: 22, averageDistance: 1400, averageCost: 18000 },
      { from: 'Bangalore', to: 'Hyderabad', count: 18, averageDistance: 570, averageCost: 12000 },
      { from: 'Chennai', to: 'Bangalore', count: 15, averageDistance: 350, averageCost: 10000 },
      { from: 'Pune', to: 'Mumbai', count: 12, averageDistance: 150, averageCost: 8000 },
      { from: 'Hyderabad', to: 'Chennai', count: 10, averageDistance: 630, averageCost: 13000 },
      { from: 'Kolkata', to: 'Delhi', count: 8, averageDistance: 1300, averageCost: 17000 }
    ];
  }

  /**
   * Track an analytics event
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @returns {Promise<boolean>} Success status
   */
  async trackEvent(eventType, eventData) {
    if (!this.eventsInitialized) {
      await this.initializeAnalyticsEvents();
    }
    
    try {
      const event = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        eventType,
        eventData,
        timestamp: new Date().toISOString(),
        processed: false
      };
      
      this.analyticsEvents.push(event);
      
      // In a real implementation, we would persist this to storage
      console.log(`Tracked event: ${eventType}`);
      
      return true;
    } catch (error) {
      console.error('Failed to track event:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const analyticsService = new AnalyticsService(); 