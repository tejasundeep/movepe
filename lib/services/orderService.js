import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { notificationService } from './notificationService';
import { reviewService } from './reviewService';
import { analyticsService } from './analyticsService';
import { calculateMovingCost, getQuickEstimate } from './pricingService';

export class OrderService {
  /**
   * Create a new order
   * @param {Object} orderData - Order data including pickup/destination pincodes, move size, date, etc.
   * @returns {Promise<Object>} - Created order with ID
   */
  async createOrder(orderData) {
    const { pickupPincode, destinationPincode, moveSize, moveDate, userEmail } = orderData;

    // Validate required fields
    if (!pickupPincode || !destinationPincode || !moveSize || !moveDate || !userEmail) {
      throw new Error('Missing required fields');
    }

    // Calculate price estimate using pricing service
    let priceEstimate = null;
    try {
      priceEstimate = await getQuickEstimate(pickupPincode, destinationPincode, moveSize);
    } catch (error) {
      console.error('Error calculating price estimate:', error);
      // Continue without price estimate if there's an error
    }

    // Create new order object
    const newOrder = {
      orderId: uuidv4(),
      ...orderData,
      status: 'Initiated',
      createdAt: new Date().toISOString(),
      vendorRequests: [],
      quotes: [],
      isCrossLead: orderData.isCrossLead || false,
      referringVendorId: orderData.referringVendorId || null,
      commissionRate: orderData.commissionRate || 20,
      priceEstimate: priceEstimate
    };

    // Add order to storage
    await storage.updateData('orders.json', (orders) => {
      orders.push(newOrder);
      return orders;
    });

    // Track order creation event
    await analyticsService.trackEvent('order_created', {
      orderId: newOrder.orderId,
      userEmail: newOrder.userEmail,
      moveSize: newOrder.moveSize,
      moveType: newOrder.moveType,
      pickupPincode: newOrder.pickupPincode,
      destinationPincode: newOrder.destinationPincode,
      estimatedCost: priceEstimate?.estimatedCost
    });

    return newOrder;
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} - Order object or null if not found
   */
  async getOrderById(orderId) {
    const orders = await storage.readData('orders.json');
    if (!orders) return null;
    
    return orders.find(order => order.orderId === orderId) || null;
  }

  /**
   * Get orders by user email
   * @param {string} userEmail - User email
   * @returns {Promise<Array>} - Array of orders
   */
  async getOrdersByUser(userEmail) {
    const orders = await storage.readData('orders.json');
    if (!orders) return [];
    
    return orders.filter(order => order.userEmail === userEmail);
  }

  /**
   * Get orders by vendor ID
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Array>} - Array of orders
   */
  async getOrdersByVendor(vendorId) {
    const orders = await storage.readData('orders.json');
    if (!orders) return [];
    
    return orders.filter(order => 
      order.vendorRequests?.includes(vendorId) || 
      order.selectedVendorId === vendorId
    );
  }

  /**
   * Update order
   * @param {string} orderId - Order ID
   * @param {Object} updates - Updates to apply
   * @param {string} userEmail - Email of user making the update (for authorization)
   * @param {string} userRole - Role of user making the update
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrder(orderId, updates, userEmail, userRole) {
    let updatedOrder = null;
    
    await storage.updateData('orders.json', (orders) => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }

      const order = orders[orderIndex];
      
      // Check authorization
      if (order.userEmail !== userEmail && userRole !== 'vendor' && userRole !== 'admin') {
        throw new Error('Not authorized to update this order');
      }

      // Apply updates
      orders[orderIndex] = { ...order, ...updates };
      updatedOrder = orders[orderIndex];
      
      return orders;
    });

    if (!updatedOrder) {
      throw new Error('Failed to update order');
    }

    return updatedOrder;
  }

  /**
   * Request quotes from vendors for an order
   * @param {string} orderId - Order ID
   * @param {Array<string>} vendorIds - Array of vendor IDs to request quotes from
   * @param {string} userEmail - User email (for authorization)
   * @returns {Promise<Object>} - Updated order
   */
  async requestQuotes(orderId, vendorIds, userEmail) {
    if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
      throw new Error('Vendor IDs must be a non-empty array');
    }

    // Get vendors data to validate and for notifications
    const vendors = await storage.readData('vendors.json');
    if (!vendors) {
      throw new Error('Vendors data not found');
    }

    // Validate vendors exist
    const validVendors = vendorIds.map(id => {
      const vendor = vendors.find(v => v.vendorId === id);
      return vendor ? { id, email: vendor.email, whatsapp: vendor.whatsapp } : null;
    }).filter(v => v !== null);

    if (validVendors.length === 0) {
      throw new Error('No valid vendors found');
    }

    // Update order with new vendor requests
    let updatedOrder = null;
    
    await storage.updateData('orders.json', (orders) => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }

      const order = orders[orderIndex];

      // Initialize or update arrays
      order.vendorRequests = order.vendorRequests || [];
      order.quotes = order.quotes || [];

      // Add new vendor IDs without duplicates
      order.vendorRequests = [...new Set([...order.vendorRequests, ...vendorIds])];

      // Update status if needed
      if (order.status === 'Created') {
        order.status = 'Requests Sent';
      }

      // Update the order in the array
      orders[orderIndex] = order;
      updatedOrder = order;
      
      return orders;
    });

    if (!updatedOrder) {
      throw new Error('Failed to update order');
    }

    // Replace the direct notification call with the notification service
    notificationService.sendVendorQuoteRequestNotifications(updatedOrder, validVendors);

    return updatedOrder;
  }

  /**
   * Submit a quote for an order
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {number} amount - Quote amount
   * @returns {Promise<Object>} - Updated order
   */
  async submitQuote(orderId, vendorId, amount) {
    if (!orderId || !vendorId || !amount || isNaN(amount)) {
      throw new Error('Invalid quote data');
    }

    let updatedOrder = null;
    
    await storage.updateData('orders.json', (orders) => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }

      const order = orders[orderIndex];
      
      // Check if vendor was requested
      if (!order.vendorRequests?.includes(vendorId)) {
        throw new Error('Vendor not requested for this order');
      }

      // Initialize quotes array if needed
      order.quotes = order.quotes || [];
      
      // Check if quote already exists
      const quoteIndex = order.quotes.findIndex(q => q.vendorId === vendorId);
      
      // Get the system-calculated price estimate if available
      const systemEstimate = order.priceEstimate?.estimatedCost || null;
      
      // Calculate a reasonable price range (±20% of system estimate)
      let minRecommendedPrice = null;
      let maxRecommendedPrice = null;
      
      if (systemEstimate) {
        minRecommendedPrice = Math.round(systemEstimate * 0.8);
        maxRecommendedPrice = Math.round(systemEstimate * 1.2);
      }
      
      if (quoteIndex >= 0) {
        // Update existing quote
        order.quotes[quoteIndex] = {
          ...order.quotes[quoteIndex],
          amount,
          submittedAt: new Date().toISOString(),
          systemEstimate,
          minRecommendedPrice,
          maxRecommendedPrice
        };
      } else {
        // Add new quote
        order.quotes.push({
          vendorId,
          amount,
          submittedAt: new Date().toISOString(),
          systemEstimate,
          minRecommendedPrice,
          maxRecommendedPrice
        });
      }

      // Update order status if needed
      if (order.status === 'Initiated' || order.status === 'Requests Sent') {
        order.status = 'Quotes Received';
      }

      orders[orderIndex] = order;
      updatedOrder = order;
      
      return orders;
    });

    if (!updatedOrder) {
      throw new Error('Failed to submit quote');
    }

    // Replace the direct notification call with the notification service
    notificationService.sendUserQuoteNotification(updatedOrder, vendorId);

    return updatedOrder;
  }

  /**
   * Get orders for a specific user
   * @param {string} userEmail - The user's email
   * @returns {Array} - Array of user orders
   */
  async getUserOrders(userEmail) {
    const orders = await storage.readData('orders.json');
    
    if (!orders) {
      return [];
    }
    
    // Filter orders for the user and sort by date (newest first)
    return orders
      .filter(order => order && order.userEmail === userEmail)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Add a review for a vendor
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {number} rating - Rating (1-5)
   * @param {string} comment - Review comment
   * @param {string} userEmail - User email (for authorization)
   * @returns {Promise<Object>} - Updated order and vendor
   * @deprecated Use reviewService.addReview instead
   */
  async addReview(orderId, vendorId, rating, comment, userEmail) {
    console.warn('OrderService.addReview is deprecated. Use reviewService.addReview instead.');
    return reviewService.addReview(orderId, vendorId, rating, comment, userEmail);
  }

  /**
   * Validate order status transition
   * @param {string} currentStatus - Current order status
   * @param {string} newStatus - New order status
   * @returns {boolean} - Whether the transition is valid
   * @throws {Error} - If the transition is invalid
   */
  validateStatusTransition(currentStatus, newStatus) {
    // Define valid status transitions
    const validTransitions = {
      'Initiated': ['Quotes Received', 'Cancelled'],
      'Quotes Received': ['Vendor Selected', 'Cancelled'],
      'Vendor Selected': ['Payment Pending', 'Cancelled'],
      'Payment Pending': ['Paid', 'Cancelled'],
      'Paid': ['In Progress', 'Cancelled'],
      'In Progress': ['In Transit', 'Cancelled'],
      'In Transit': ['Delivered', 'Cancelled'],
      'Delivered': ['Completed', 'Disputed'],
      'Completed': ['Reviewed'],
      'Disputed': ['Resolved', 'Refunded'],
      'Resolved': ['Completed'],
      'Refunded': ['Closed'],
      'Reviewed': ['Closed'],
      'Cancelled': ['Closed']
    };
    
    // Check if the transition is valid
    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
    }
    
    return true;
  }

  /**
   * Send notifications for order status changes
   * @param {Object} order - Updated order
   * @param {string} newStatus - New status
   * @returns {Promise<void>}
   */
  async sendStatusChangeNotifications(order, newStatus) {
    // Get user and vendor details for notifications
    const users = await storage.readData('users.json');
    const vendors = await storage.readData('vendors.json');
    
    const user = users?.find(u => u.email === order.userEmail);
    const vendor = vendors?.find(v => v.vendorId === order.selectedVendorId);
    
    if (!user || !vendor) {
      console.warn('Could not find user or vendor for notifications');
      return;
    }
    
    // Send appropriate notifications based on status
    switch (newStatus) {
      case 'Paid':
        await notificationService.sendVendorOrderPaidNotification(order, vendor);
        await notificationService.sendUserOrderConfirmationNotification(order, user);
        break;
      case 'In Progress':
        await notificationService.sendUserOrderStatusUpdateNotification(order, user, 'started');
        break;
      case 'In Transit':
        await notificationService.sendUserOrderStatusUpdateNotification(order, user, 'in transit');
        break;
      case 'Delivered':
        await notificationService.sendUserOrderDeliveredNotification(order, user);
        // Remind user to verify inventory if it exists
        if (order.inventoryId) {
          await notificationService.sendUserInventoryVerificationReminder(order, user);
        }
        break;
      case 'Completed':
        await notificationService.sendUserOrderCompletedNotification(order, user);
        break;
      case 'Cancelled':
        await notificationService.sendOrderCancellationNotifications(order, user, vendor);
        break;
      default:
        // No specific notification for other statuses
        break;
    }
  }

  /**
   * Check if inventory verification is required before completing an order
   * @param {string} orderId - Order ID
   * @returns {Promise<boolean>} - Whether inventory verification is required
   */
  async isInventoryVerificationRequired(orderId) {
    try {
      const order = await this.getOrderById(orderId);
      if (!order || !order.inventoryId) {
        return false; // No inventory to verify
      }

      // Get inventory
      const inventories = await storage.readData('inventories.json');
      if (!inventories) {
        return false;
      }

      const inventory = inventories.find(i => i.inventoryId === order.inventoryId);
      if (!inventory) {
        return false;
      }

      // Check if inventory has been verified
      return inventory.status !== 'Verified';
    } catch (error) {
      console.error('Error checking inventory verification:', error);
      return false; // Default to not required in case of error
    }
  }

  /**
   * Update order status with validation and additional checks
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID (for vendor-initiated updates)
   * @param {string} newStatus - New status
   * @param {boolean} forceUpdate - Whether to force update even if inventory verification is required
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrderStatus(orderId, vendorId, newStatus, forceUpdate = false) {
    if (!orderId || !newStatus) {
      throw new Error('Order ID and new status are required');
    }
    
    // Check if inventory verification is required for completing the order
    if (newStatus === 'Completed' && !forceUpdate) {
      const verificationRequired = await this.isInventoryVerificationRequired(orderId);
      if (verificationRequired) {
        throw new Error('Inventory verification is required before completing this order');
      }
    }
    
    let updatedOrder = null;
    
    await storage.updateData('orders.json', (orders) => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }
      
      const order = orders[orderIndex];
      
      // Check if vendor is assigned to this order
      if (vendorId && order.selectedVendorId !== vendorId) {
        throw new Error('Order not assigned to this vendor');
      }
      
      // Validate status transition
      this.validateStatusTransition(order.status, newStatus);
      
      // Update status and add timestamp
      const statusKey = `${newStatus.replace(/\s+/g, '')}At`;
      orders[orderIndex] = {
        ...order,
        status: newStatus,
        [statusKey]: new Date().toISOString(),
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            updatedBy: vendorId || 'system'
          }
        ]
      };
      
      updatedOrder = orders[orderIndex];
      return orders;
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to update order status');
    }
    
    // Send notifications based on status change
    await this.sendStatusChangeNotifications(updatedOrder, newStatus);
    
    // Track order status change event
    await analyticsService.trackEvent('order_status_changed', {
      orderId,
      previousStatus: order.status,
      newStatus: newStatus
    });
    
    return updatedOrder;
  }

  /**
   * Select vendor for order
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Object>} - Updated order
   */
  async selectVendor(orderId, vendorId) {
    let updatedOrder = null;
    
    await storage.updateData('orders.json', (orders) => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }
      
      const order = orders[orderIndex];
      
      // Check if vendor is assigned to this order
      if (vendorId && order.selectedVendorId !== vendorId) {
        throw new Error('Order not assigned to this vendor');
      }
      
      // Update selected vendor
      orders[orderIndex] = {
        ...order,
        selectedVendorId: vendorId
      };
      
      updatedOrder = orders[orderIndex];
      return orders;
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to select vendor');
    }
    
    // Track vendor selection event
    await analyticsService.trackEvent('vendor_selected', {
      orderId,
      vendorId
    });
    
    return updatedOrder;
  }

  /**
   * Process payment for order
   * @param {string} orderId - Order ID
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} - Updated order
   */
  async processPayment(orderId, paymentDetails) {
    let updatedOrder = null;
    
    await storage.updateData('orders.json', (orders) => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }
      
      const order = orders[orderIndex];
      
      // Update payment details
      orders[orderIndex] = {
        ...order,
        paymentDetails: {
          ...order.paymentDetails,
          ...paymentDetails
        }
      };
      
      updatedOrder = orders[orderIndex];
      return orders;
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to process payment');
    }
    
    // Track payment event
    await analyticsService.trackEvent('payment_processed', {
      orderId,
      amount: paymentDetails.amount,
      method: paymentDetails.method
    });
    
    return updatedOrder;
  }

  /**
   * Add review to order
   * @param {string} orderId - Order ID
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} - Updated order
   */
  async addReview(orderId, reviewData) {
    let updatedOrder = null;
    
    await storage.updateData('orders.json', (orders) => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }
      
      const order = orders[orderIndex];
      
      // Update review data
      orders[orderIndex] = {
        ...order,
        reviewData: {
          ...order.reviewData,
          ...reviewData
        }
      };
      
      updatedOrder = orders[orderIndex];
      return orders;
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to add review');
    }
    
    // Track review event
    await analyticsService.trackEvent('review_added', {
      orderId,
      vendorId: order.selectedVendorId,
      rating: reviewData.rating
    });
    
    return updatedOrder;
  }
}

// Export a singleton instance
export const orderService = new OrderService(); 