const { storage } = require('../storage');

class AnalyticsService {
  constructor() {
    // Initialize analytics_events.json if it doesn't exist
    this.initializeAnalyticsEvents();
  }

  /**
   * Initialize analytics_events.json if it doesn't exist
   * @returns {Promise<void>}
   */
  async initializeAnalyticsEvents() {
    try {
      const events = await storage.readData('analytics_events.json');
      if (events === null) {
        // File doesn't exist, create it with an empty array
        await storage.writeData('analytics_events.json', []);
        console.log('Initialized analytics_events.json');
      }
    } catch (error) {
      console.error('Error initializing analytics_events.json:', error);
    }
  }

  /**
   * Get business overview metrics
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Object>} - Business metrics
   */
  async getBusinessOverview(startDate, endDate) {
    // Set default dates if not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end);
    start.setMonth(start.getMonth() - 1); // Default to last month
    
    // Get data
    const orders = await storage.readData('orders.json') || [];
    const vendors = await storage.readData('vendors.json') || [];
    
    // Filter orders by date range
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate <= end;
    });
    
    // Calculate metrics
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(o => o.status === 'Completed' || o.status === 'Reviewed' || o.status === 'Closed').length;
    const cancelledOrders = filteredOrders.filter(o => o.status === 'Cancelled').length;
    
    // Calculate revenue
    const revenue = filteredOrders.reduce((sum, order) => {
      if (order.payment && order.payment.amount) {
        return sum + order.payment.amount;
      }
      return sum;
    }, 0);
    
    // Calculate commission
    const commission = filteredOrders.reduce((sum, order) => {
      if (order.payment && order.payment.amount && order.selectedVendorId) {
        const vendor = vendors.find(v => v.vendorId === order.selectedVendorId);
        const commissionRate = vendor?.tier ? this.getCommissionRateByTier(vendor.tier) : 15;
        return sum + (order.payment.amount * (commissionRate / 100));
      }
      return sum;
    }, 0);
    
    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;
    
    // Calculate conversion rate (orders with payment / total orders)
    const paidOrders = filteredOrders.filter(o => o.status === 'Paid' || o.status === 'In Progress' || o.status === 'In Transit' || o.status === 'Delivered' || o.status === 'Completed' || o.status === 'Reviewed' || o.status === 'Closed').length;
    const conversionRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;
    
    // Calculate vendor metrics
    const activeVendors = vendors.filter(v => v.availability === 'available').length;
    const totalVendors = vendors.length;
    
    // Calculate average vendor rating
    const vendorsWithRatings = vendors.filter(v => v.rating > 0);
    const averageVendorRating = vendorsWithRatings.length > 0 
      ? vendorsWithRatings.reduce((sum, v) => sum + v.rating, 0) / vendorsWithRatings.length 
      : 0;
    
    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        conversionRate: conversionRate.toFixed(2) + '%'
      },
      financial: {
        revenue,
        commission,
        averageOrderValue
      },
      vendors: {
        total: totalVendors,
        active: activeVendors,
        averageRating: averageVendorRating.toFixed(1)
      }
    };
  }
  
  /**
   * Get commission rate by vendor tier
   * @param {string} tier - Vendor tier
   * @returns {number} - Commission rate percentage
   */
  getCommissionRateByTier(tier) {
    switch (tier) {
      case 'Platinum': return 8;
      case 'Gold': return 10;
      case 'Silver': return 12;
      case 'Bronze': return 15;
      default: return 15;
    }
  }
  
  /**
   * Get order trends over time
   * @param {string} interval - Interval (day, week, month)
   * @param {number} limit - Number of intervals to return
   * @returns {Promise<Array>} - Order trends
   */
  async getOrderTrends(interval = 'day', limit = 30) {
    const orders = await storage.readData('orders.json') || [];
    
    // Sort orders by date
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    
    if (sortedOrders.length === 0) {
      return [];
    }
    
    // Get date range
    const endDate = new Date();
    const startDate = new Date(endDate);
    
    // Set start date based on interval and limit
    switch (interval) {
      case 'day':
        startDate.setDate(startDate.getDate() - limit);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - (limit * 7));
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - limit);
        break;
      default:
        startDate.setDate(startDate.getDate() - limit);
    }
    
    // Generate intervals
    const intervals = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const intervalStart = new Date(currentDate);
      
      // Set interval end based on interval type
      switch (interval) {
        case 'day':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'week':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'month':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const intervalEnd = new Date(currentDate);
      
      // Count orders in this interval
      const ordersInInterval = sortedOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= intervalStart && orderDate < intervalEnd;
      });
      
      // Count paid orders in this interval
      const paidOrdersInInterval = ordersInInterval.filter(order => 
        order.status === 'Paid' || 
        order.status === 'In Progress' || 
        order.status === 'In Transit' || 
        order.status === 'Delivered' || 
        order.status === 'Completed' || 
        order.status === 'Reviewed' || 
        order.status === 'Closed'
      );
      
      // Calculate revenue in this interval
      const revenueInInterval = paidOrdersInInterval.reduce((sum, order) => {
        if (order.payment && order.payment.amount) {
          return sum + order.payment.amount;
        }
        return sum;
      }, 0);
      
      // Format interval label
      let intervalLabel = '';
      switch (interval) {
        case 'day':
          intervalLabel = intervalStart.toISOString().split('T')[0];
          break;
        case 'week':
          intervalLabel = `Week of ${intervalStart.toISOString().split('T')[0]}`;
          break;
        case 'month':
          intervalLabel = `${intervalStart.toLocaleString('default', { month: 'short' })} ${intervalStart.getFullYear()}`;
          break;
        default:
          intervalLabel = intervalStart.toISOString().split('T')[0];
      }
      
      intervals.push({
        interval: intervalLabel,
        start: intervalStart.toISOString(),
        end: intervalEnd.toISOString(),
        orders: ordersInInterval.length,
        paidOrders: paidOrdersInInterval.length,
        revenue: revenueInInterval
      });
    }
    
    return intervals;
  }
  
  /**
   * Get vendor performance metrics
   * @returns {Promise<Array>} - Vendor performance metrics
   */
  async getVendorPerformanceMetrics() {
    const vendors = await storage.readData('vendors.json') || [];
    const orders = await storage.readData('orders.json') || [];
    
    // Calculate metrics for each vendor
    return vendors.map(vendor => {
      // Get orders for this vendor
      const vendorOrders = orders.filter(o => o.selectedVendorId === vendor.vendorId);
      
      // Calculate total orders
      const totalOrders = vendorOrders.length;
      
      // Calculate completed orders
      const completedOrders = vendorOrders.filter(o => 
        o.status === 'Completed' || o.status === 'Reviewed' || o.status === 'Closed'
      ).length;
      
      // Calculate cancelled orders
      const cancelledOrders = vendorOrders.filter(o => o.status === 'Cancelled').length;
      
      // Calculate completion rate
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      
      // Calculate cancellation rate
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
      
      // Calculate revenue
      const revenue = vendorOrders.reduce((sum, order) => {
        if (order.payment && order.payment.amount) {
          return sum + order.payment.amount;
        }
        return sum;
      }, 0);
      
      // Calculate commission
      const commissionRate = vendor.tier ? this.getCommissionRateByTier(vendor.tier) : 15;
      const commission = revenue * (commissionRate / 100);
      
      // Calculate average response time
      const responseTimes = [];
      orders.forEach(o => {
        if (o.vendorRequests?.includes(vendor.vendorId)) {
          const requestIndex = o.vendorRequests.indexOf(vendor.vendorId);
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
      
      return {
        vendorId: vendor.vendorId,
        name: vendor.name,
        tier: vendor.tier || 'Bronze',
        rating: vendor.rating || 0,
        reviewCount: vendor.reviewCount || 0,
        metrics: {
          totalOrders,
          completedOrders,
          cancelledOrders,
          completionRate: completionRate.toFixed(2) + '%',
          cancellationRate: cancellationRate.toFixed(2) + '%',
          revenue,
          commission,
          averageResponseTime: averageResponseTime !== null ? `${averageResponseTime.toFixed(0)} minutes` : 'N/A'
        }
      };
    });
  }
  
  /**
   * Get customer insights
   * @returns {Promise<Object>} - Customer insights
   */
  async getCustomerInsights() {
    const orders = await storage.readData('orders.json') || [];
    
    // Group orders by user email
    const userOrders = {};
    orders.forEach(order => {
      if (!order.userEmail) return;
      
      if (!userOrders[order.userEmail]) {
        userOrders[order.userEmail] = [];
      }
      
      userOrders[order.userEmail].push(order);
    });
    
    // Calculate metrics
    const totalCustomers = Object.keys(userOrders).length;
    let totalOrderValue = 0;
    let repeatCustomers = 0;
    let totalOrders = 0;
    
    const customerSegments = {
      new: 0,        // 1 order
      returning: 0,   // 2-3 orders
      loyal: 0,       // 4+ orders
      highValue: 0    // Total spend > ₹50,000
    };
    
    Object.values(userOrders).forEach(customerOrders => {
      // Count orders
      const orderCount = customerOrders.length;
      totalOrders += orderCount;
      
      // Calculate total spend
      const totalSpend = customerOrders.reduce((sum, order) => {
        if (order.payment && order.payment.amount) {
          return sum + order.payment.amount;
        }
        return sum;
      }, 0);
      
      totalOrderValue += totalSpend;
      
      // Count repeat customers
      if (orderCount > 1) {
        repeatCustomers++;
      }
      
      // Segment customers
      if (orderCount === 1) {
        customerSegments.new++;
      } else if (orderCount >= 2 && orderCount <= 3) {
        customerSegments.returning++;
      } else if (orderCount >= 4) {
        customerSegments.loyal++;
      }
      
      if (totalSpend > 50000) {
        customerSegments.highValue++;
      }
    });
    
    // Calculate average metrics
    const averageOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;
    const averageCustomerValue = totalCustomers > 0 ? totalOrderValue / totalCustomers : 0;
    const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    
    return {
      totalCustomers,
      totalOrders,
      totalOrderValue,
      averageOrdersPerCustomer: averageOrdersPerCustomer.toFixed(2),
      averageCustomerValue: averageCustomerValue.toFixed(2),
      repeatCustomerRate: repeatCustomerRate.toFixed(2) + '%',
      customerSegments: {
        new: customerSegments.new,
        returning: customerSegments.returning,
        loyal: customerSegments.loyal,
        highValue: customerSegments.highValue
      }
    };
  }
  
  /**
   * Get popular move routes
   * @returns {Promise<Array>} - Popular move routes
   */
  async getPopularMoveRoutes() {
    const orders = await storage.readData('orders.json') || [];
    
    // Count routes
    const routeCounts = {};
    
    orders.forEach(order => {
      if (!order.pickupPincode || !order.destinationPincode) return;
      
      const route = `${order.pickupPincode}-${order.destinationPincode}`;
      
      if (!routeCounts[route]) {
        routeCounts[route] = {
          pickupPincode: order.pickupPincode,
          destinationPincode: order.destinationPincode,
          count: 0,
          revenue: 0
        };
      }
      
      routeCounts[route].count++;
      
      if (order.payment && order.payment.amount) {
        routeCounts[route].revenue += order.payment.amount;
      }
    });
    
    // Convert to array and sort by count
    return Object.values(routeCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Return top 10
  }
  
  /**
   * Track event for analytics
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @returns {Promise<void>}
   */
  async trackEvent(eventType, eventData) {
    if (!eventType) {
      throw new Error('Event type is required');
    }
    
    const event = {
      eventType,
      eventData: eventData || {},
      timestamp: new Date().toISOString()
    };
    
    try {
      await storage.updateData('analytics_events.json', (events) => {
        return [...(events || []), event];
      });
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      // If update fails, try to initialize the file and then update
      await this.initializeAnalyticsEvents();
      await storage.updateData('analytics_events.json', (events) => {
        return [...(events || []), event];
      });
    }
  }
}

const analyticsService = new AnalyticsService();

module.exports = { analyticsService }; 