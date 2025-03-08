import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { notificationService } from './notificationService';
import { reviewService } from './reviewService';
import { analyticsService } from './analyticsService';
import { calculateMovingCost, getQuickEstimate, getDetailedEstimate } from './pricingService';
import { riderService } from './riderService';

export class OrderService {
  /**
   * Create a new order
   * @param {Object} orderData - Order data including pickup/destination pincodes, move size, date, etc.
   * @returns {Promise<Object>} - Created order with ID
   */
  async createOrder(orderData) {
    const { pickupPincode, destinationPincode, moveSize, moveDate, userEmail, orderType } = orderData;

    // Validate required fields
    if (!pickupPincode || !destinationPincode || !userEmail) {
      throw new Error('Missing required fields');
    }

    // Validate order type specific fields
    if (orderType === 'moving' && !moveSize) {
      throw new Error('Move size is required for moving orders');
    }
    // Parcel weight is now optional as we use default values

    // Calculate price estimate using pricing service
    let priceEstimate = null;
    try {
      if (orderType === 'moving') {
        priceEstimate = await getQuickEstimate(pickupPincode, destinationPincode, moveSize);
      } else {
        // For parcel delivery, use the detailed estimate
        priceEstimate = await getDetailedEstimate(orderData);
      }
    } catch (error) {
      console.error('Error calculating price estimate:', error);
      // Continue without price estimate if there's an error
    }

    // Initialize status history for bottleneck analysis
    const createdAt = new Date().toISOString();
    const statusHistory = [{
      status: 'Initiated',
      timestamp: createdAt,
      comment: 'Order created'
    }];

    // Create new order object
    const newOrder = {
      orderId: uuidv4(),
      ...orderData,
      status: 'Initiated',
      createdAt,
      vendorRequests: [],
      quotes: [],
      isCrossLead: orderData.isCrossLead || false,
      referringVendorId: orderData.referringVendorId || null,
      commissionRate: orderData.commissionRate || 20,
      priceEstimate: priceEstimate,
      statusHistory,
      orderType: orderType || 'moving'
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
      estimatedCost: priceEstimate?.estimatedCost || priceEstimate?.totalCost,
      orderType: newOrder.orderType
    });

    // For parcel delivery orders, automatically assign a rider
    if (orderType === 'parcel') {
      try {
        // Get location data for pickup
        const pincodes = await storage.readData('pincodes.json') || [];
        const pincode = pincodes.find(p => p.pincode === pickupPincode);
        
        if (pincode && pincode.lat && pincode.lon) {
          const pickupLocation = {
            lat: pincode.lat,
            lon: pincode.lon
          };
          
          // Assign rider
          const rider = await riderService.assignRiderToDelivery(newOrder.orderId, pickupLocation);
          
          // Get user details for notification
          const users = await storage.readData('users.json') || [];
          const user = users.find(u => u.email === userEmail);
          
          // Send notification to user
          if (user) {
            await notificationService.sendUserRiderAssignmentNotification(newOrder, user, rider);
          }
          
          console.log(`Rider ${rider.name} automatically assigned to parcel delivery order ${newOrder.orderId}`);
        } else {
          console.warn(`Could not find location data for pincode ${pickupPincode}, rider assignment skipped`);
        }
      } catch (error) {
        console.error('Error assigning rider to parcel delivery:', error);
        // Continue without rider assignment if there's an error
      }
    }

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

      // Track status changes for bottleneck analysis
      if (updates.status && updates.status !== order.status) {
        // Validate status transition is allowed
        if (!this.validateStatusTransition(order.status, updates.status)) {
          throw new Error(`Invalid status transition from ${order.status} to ${updates.status}`);
        }
        
        // Initialize statusHistory if it doesn't exist
        if (!order.statusHistory || !Array.isArray(order.statusHistory)) {
          order.statusHistory = [{
            status: order.status || 'Initiated',
            timestamp: order.createdAt,
            comment: 'Initial status'
          }];
        }
        
        // Create a timestamp that's guaranteed to be after the latest entry
        // This ensures proper ordering of status transitions
        let timestamp = new Date().toISOString();
        if (order.statusHistory.length > 0) {
          const latestEntry = [...order.statusHistory].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          )[0];
          
          // If the latest timestamp is somehow in the future, use a timestamp 1 second later
          const latestTime = new Date(latestEntry.timestamp).getTime();
          const now = new Date().getTime();
          if (latestTime >= now) {
            timestamp = new Date(latestTime + 1000).toISOString();
          }
        }
        
        // Add new status entry with metadata
        const statusEntry = {
          status: updates.status,
          timestamp,
          comment: updates.statusComment || `Status updated from ${order.status} to ${updates.status}`,
          updatedBy: userEmail,
          userRole,
          automatedUpdate: updates.automatedUpdate || false
        };
        
        // Create a new statusHistory array avoiding duplicate entries
        const existingStatusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
        updates.statusHistory = [...existingStatusHistory, statusEntry];
        
        // Update updatedAt timestamp
        updates.updatedAt = timestamp;
        
        // Add status timestamp for easier filtering of orders
        const statusTimestampField = `${updates.status.toLowerCase().replace(/\s+/g, '')}Timestamp`;
        updates[statusTimestampField] = timestamp;
        
        // Track event with analytics service if available
        try {
          if (analyticsService && typeof analyticsService.trackEvent === 'function') {
            analyticsService.trackEvent('order_status_changed', {
              orderId,
              previousStatus: order.status,
              newStatus: updates.status,
              updatedBy: userEmail,
              userRole
            });
          }
        } catch (error) {
          console.error('Error tracking status change event:', error);
          // Don't block the update if analytics fails
        }
        
        // Send notifications for status change
        this.sendStatusChangeNotifications(order, updates.status).catch(error => {
          console.error(`Error sending status change notification for order ${orderId}:`, error);
          // Don't block the update if notification fails
        });
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
      const oldStatus = order.status;
      if (order.status === 'Created' || order.status === 'Initiated') {
        order.status = 'Requests Sent';
        
        // Track status change for bottleneck analysis
        if (!order.statusHistory) {
          order.statusHistory = [{
            status: oldStatus,
            timestamp: order.createdAt,
            comment: 'Initial status'
          }];
        }
        
        order.statusHistory.push({
          status: 'Requests Sent',
          timestamp: new Date().toISOString(),
          comment: `Quote requests sent to ${validVendors.length} vendors`,
          updatedBy: userEmail
        });
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

  /**
   * Get available orders for a rider based on their service areas
   * @param {string} riderId - Rider ID
   * @param {Array} serviceAreas - Rider's service areas
   * @returns {Promise<Array>} - Available orders for the rider
   */
  async getAvailableOrdersForRider(riderId, serviceAreas) {
    console.log('getAvailableOrdersForRider called with riderId:', riderId);
    console.log('serviceAreas:', serviceAreas);
    
    const orders = await storage.readData('orders.json');
    console.log('Total orders:', orders ? orders.length : 0);
    
    if (!orders) {
      return [];
    }
    
    // Filter orders that are available for riders and match the rider's service areas
    const availableOrders = orders.filter(order => {
      // Check if order is in a status that can be assigned to a rider
      const isAssignable = ['pending', 'rider_requested'].includes(order.status);
      
      // Check if order is in the rider's service area
      const inServiceArea = serviceAreas.some(area => {
        return order.pickupPincode.startsWith(area) || order.destinationPincode.startsWith(area);
      });
      
      // Check if the rider hasn't already declined this order
      const notDeclined = !order.declinedBy || !order.declinedBy.includes(riderId);
      
      console.log('Order:', order.orderId);
      console.log('  isAssignable:', isAssignable, '(status:', order.status, ')');
      console.log('  inServiceArea:', inServiceArea, '(pickup:', order.pickupPincode, ', destination:', order.destinationPincode, ')');
      console.log('  notDeclined:', notDeclined);
      
      return isAssignable && inServiceArea && notDeclined;
    }).map(order => {
      // Format order for rider view
      return {
        orderId: order.orderId,
        status: order.status,
        pickupAddress: order.pickupAddress,
        destinationAddress: order.destinationAddress,
        packageDetails: order.packageDetails || 'Standard Package',
        amount: order.amount,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        requestedTime: order.requestedTime || order.createdAt
      };
    });
    
    console.log('Filtered available orders:', availableOrders.length);
    return availableOrders;
  }

  /**
   * Get active deliveries for a rider
   * @param {string} riderId - Rider ID
   * @returns {Promise<Array>} - Active deliveries for the rider
   */
  async getActiveDeliveriesForRider(riderId) {
    const orders = await storage.readData('orders.json');
    
    if (!orders) {
      return [];
    }
    
    // Filter orders that are assigned to this rider and are active
    const activeStatuses = ['accepted', 'picked_up', 'in_transit', 'out_for_delivery'];
    
    return orders.filter(order => {
      return order.riderId === riderId && activeStatuses.includes(order.status);
    }).map(order => {
      // Format order for rider view
      return {
        orderId: order.orderId,
        status: order.status,
        pickupAddress: order.pickupAddress,
        destinationAddress: order.destinationAddress,
        packageDetails: order.packageDetails || 'Standard Package',
        amount: order.amount,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        acceptedTime: order.acceptedTime,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });
  }

  /**
   * Get completed deliveries for a rider
   * @param {string} riderId - Rider ID
   * @returns {Promise<Array>} - Completed deliveries for the rider
   */
  async getCompletedDeliveriesForRider(riderId) {
    const orders = await storage.readData('orders.json');
    
    if (!orders) {
      return [];
    }
    
    // Filter orders that are assigned to this rider and are completed
    const completedStatuses = ['delivered', 'failed_delivery', 'cancelled', 'completed'];
    
    return orders.filter(order => {
      return order.riderId === riderId && completedStatuses.includes(order.status);
    }).map(order => {
      // Format order for rider view
      return {
        orderId: order.orderId,
        status: order.status,
        pickupAddress: order.pickupAddress,
        destinationAddress: order.destinationAddress,
        packageDetails: order.packageDetails || 'Standard Package',
        amount: order.amount,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        completedAt: order.completedAt,
        updatedAt: order.updatedAt,
        createdAt: order.createdAt
      };
    });
  }

  /**
   * Assign a rider to an order
   * @param {string} orderId - Order ID
   * @param {string} riderId - Rider ID
   * @returns {Promise<Object>} - Updated order
   */
  async assignRider(orderId, riderId) {
    let updatedOrder = null;
    
    await storage.updateData('orders.json', orders => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }
      
      const order = orders[orderIndex];
      
      // Check if order can be assigned
      if (order.status !== 'pending' && order.status !== 'rider_requested') {
        throw new Error('Order is not available for assignment');
      }
      
      // Update order with rider assignment
      order.riderId = riderId;
      order.status = 'accepted';
      order.acceptedTime = new Date().toISOString();
      
      // Add status history entry
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      
      order.statusHistory.push({
        status: 'accepted',
        timestamp: new Date().toISOString(),
        comment: 'Rider accepted the order'
      });
      
      orders[orderIndex] = order;
      updatedOrder = order;
      
      return orders;
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to assign rider');
    }
    
    return updatedOrder;
  }

  /**
   * Make an order available for riders again
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} - Updated order
   */
  async makeOrderAvailableForRiders(orderId) {
    let updatedOrder = null;
    
    await storage.updateData('orders.json', orders => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }
      
      const order = orders[orderIndex];
      
      // Check if order can be made available
      if (order.status !== 'pending' && order.status !== 'rider_requested') {
        throw new Error('Order cannot be made available');
      }
      
      // Initialize declinedBy array if it doesn't exist
      if (!order.declinedBy) {
        order.declinedBy = [];
      }
      
      // Update order status
      order.status = 'rider_requested';
      
      // Add status history entry
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      
      order.statusHistory.push({
        status: 'rider_requested',
        timestamp: new Date().toISOString(),
        comment: 'Order made available for riders'
      });
      
      orders[orderIndex] = order;
      updatedOrder = order;
      
      return orders;
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to make order available');
    }
    
    return updatedOrder;
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrderStatus(orderId, status, notes = '') {
    let updatedOrder = null;
    
    await storage.updateData('orders.json', orders => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }
      
      const order = orders[orderIndex];
      
      // Update order status
      order.status = status;
      order.updatedAt = new Date().toISOString();
      
      // Add status-specific timestamps
      if (status === 'delivered' || status === 'failed_delivery' || status === 'cancelled') {
        order.completedAt = new Date().toISOString();
      }
      
      // Add status history entry
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      
      order.statusHistory.push({
        status,
        timestamp: new Date().toISOString(),
        comment: notes || `Status updated to ${status}`
      });
      
      orders[orderIndex] = order;
      updatedOrder = order;
      
      return orders;
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to update order status');
    }
    
    return updatedOrder;
  }
}

// Export a singleton instance
export const orderService = new OrderService(); 