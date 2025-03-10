import { v4 as uuidv4 } from 'uuid';
import { orderStorage, pincodeStorage, userStorage } from '../storage';
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

    // Find the user to get their ID
    const user = await userStorage.getByEmail(userEmail);
    if (!user) {
      throw new Error('User not found');
    }

    // Initialize status history for bottleneck analysis
    const createdAt = new Date();
    
    // Create new order object
    const orderToCreate = {
      id: uuidv4(),
      orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
      customerId: user.id,
      vendorId: null,
      riderId: null,
      status: 'Initiated',
      orderType: orderType || 'moving',
      pickupAddress: orderData.pickupAddress,
      pickupPincode: pickupPincode,
      destinationAddress: orderData.destinationAddress,
      destinationPincode: destinationPincode,
      moveSize: moveSize || null,
      moveDate: moveDate ? new Date(moveDate) : null,
      specialInstructions: orderData.specialInstructions || null,
      totalAmount: priceEstimate?.estimatedCost || priceEstimate?.totalCost || null,
      paidAmount: 0,
      paymentStatus: 'pending',
      createdAt: createdAt,
      updatedAt: createdAt
    };

    // Create order in database
    const newOrder = await orderStorage.create(orderToCreate);

    // Add initial status history entry
    await this.addStatusHistoryEntry(newOrder.id, 'Initiated', 'Order created');

    // Track order creation event
    await analyticsService.trackEvent('order_created', {
      orderId: newOrder.id,
      userEmail: userEmail,
      moveSize: moveSize,
      moveType: orderData.moveType,
      pickupPincode: pickupPincode,
      destinationPincode: destinationPincode,
      estimatedCost: priceEstimate?.estimatedCost || priceEstimate?.totalCost,
      orderType: orderType
    });

    // For parcel delivery orders, automatically assign a rider
    if (orderType === 'parcel') {
      try {
        // Get location data for pickup
        const pincode = await pincodeStorage.getByCode(pickupPincode);
        
        if (pincode && pincode.latitude && pincode.longitude) {
          const pickupLocation = {
            lat: pincode.latitude.toString(),
            lon: pincode.longitude.toString()
          };
          
          // Assign rider
          const rider = await riderService.assignRiderToDelivery(newOrder.id, pickupLocation);
          
          // Send notification to user
          if (user) {
            await notificationService.sendUserRiderAssignmentNotification(newOrder, user, rider);
          }
        } else {
          console.warn(`Could not find location data for pincode ${pickupPincode}, rider assignment skipped`);
        }
      } catch (error) {
        console.error('Error assigning rider to parcel delivery:', error);
        // Continue without rider assignment if there's an error
      }
    }

    // Format the response to match the expected structure
    return {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      userEmail: userEmail,
      pickupPincode: newOrder.pickupPincode,
      destinationPincode: newOrder.destinationPincode,
      moveSize: newOrder.moveSize,
      moveDate: newOrder.moveDate,
      status: newOrder.status,
      createdAt: newOrder.createdAt.toISOString(),
      orderType: newOrder.orderType,
      priceEstimate: priceEstimate
    };
  }

  /**
   * Add a status history entry for an order
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @param {string} notes - Notes about the status change
   * @returns {Promise<void>}
   */
  async addStatusHistoryEntry(orderId, status, notes = '') {
    const prisma = require('../prisma');
    await prisma.orderStatusHistory.create({
      data: {
        orderId: orderId,
        status: status,
        notes: notes,
        createdAt: new Date(),
        createdBy: null
      }
    });
  }

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} - Order object or null if not found
   */
  async getOrderById(orderId) {
    const order = await orderStorage.getById(orderId);
    if (!order) return null;
    
    // Format the response to match the expected structure
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userEmail: order.customer?.email,
      customerName: order.customer?.name,
      customerPhone: order.customer?.phone,
      pickupAddress: order.pickupAddress,
      pickupPincode: order.pickupPincode,
      destinationAddress: order.destinationAddress,
      destinationPincode: order.destinationPincode,
      moveSize: order.moveSize,
      moveDate: order.moveDate,
      specialInstructions: order.specialInstructions,
      status: order.status,
      vendorId: order.vendorId,
      vendorName: order.vendor?.user?.name,
      riderId: order.riderId,
      riderName: order.rider?.user?.name,
      totalAmount: order.totalAmount,
      paidAmount: order.paidAmount,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      orderType: order.orderType,
      statusHistory: order.statusHistory?.map(entry => ({
        status: entry.status,
        timestamp: entry.createdAt.toISOString(),
        comment: entry.notes
      })) || []
    };
  }

  /**
   * Get orders by user email
   * @param {string} userEmail - User email
   * @returns {Promise<Array>} - Array of orders
   */
  async getOrdersByUser(userEmail) {
    // Find the user to get their ID
    const user = await userStorage.getByEmail(userEmail);
    if (!user) return [];
    
    // Get orders by customer ID
    const orders = await orderStorage.getByCustomerId(user.id);
    
    // Format the response to match the expected structure
    return orders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      userEmail: userEmail,
      pickupAddress: order.pickupAddress,
      pickupPincode: order.pickupPincode,
      destinationAddress: order.destinationAddress,
      destinationPincode: order.destinationPincode,
      moveSize: order.moveSize,
      moveDate: order.moveDate,
      specialInstructions: order.specialInstructions,
      status: order.status,
      vendorId: order.vendorId,
      vendorName: order.vendorName,
      riderId: order.riderId,
      riderName: order.riderName,
      totalAmount: order.totalAmount,
      paidAmount: order.paidAmount,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      orderType: order.orderType,
      statusHistory: order.statusHistory?.map(entry => ({
        status: entry.status,
        timestamp: entry.createdAt.toISOString(),
        comment: entry.notes
      })) || []
    }));
  }

  /**
   * Get orders by vendor ID
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Array>} - Array of orders
   */
  async getOrdersByVendor(vendorId) {
    // Get orders by vendor ID
    const orders = await orderStorage.getAll();
    const vendorOrders = orders.filter(order => order.vendorId === vendorId);
    
    // Format the response to match the expected structure
    return vendorOrders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      userEmail: order.customer?.email,
      customerName: order.customer?.name,
      customerPhone: order.customer?.phone,
      pickupAddress: order.pickupAddress,
      pickupPincode: order.pickupPincode,
      destinationAddress: order.destinationAddress,
      destinationPincode: order.destinationPincode,
      moveSize: order.moveSize,
      moveDate: order.moveDate,
      specialInstructions: order.specialInstructions,
      status: order.status,
      vendorId: order.vendorId,
      vendorName: order.vendor?.user?.name,
      riderId: order.riderId,
      riderName: order.rider?.user?.name,
      totalAmount: order.totalAmount,
      paidAmount: order.paidAmount,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      orderType: order.orderType,
      statusHistory: order.statusHistory?.map(entry => ({
        status: entry.status,
        timestamp: entry.createdAt.toISOString(),
        comment: entry.notes
      })) || []
    }));
  }

  /**
   * Update an order
   * @param {string} orderId - Order ID
   * @param {Object} updates - Updates to apply
   * @param {string} userEmail - Email of the user making the update
   * @param {string} userRole - Role of the user making the update
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrder(orderId, updates, userEmail, userRole) {
    // Get the order
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Check permissions
    const user = await userStorage.getByEmail(userEmail);
    if (!user) {
      throw new Error('User not found');
    }

    // Only allow updates by the customer, assigned vendor, admin, or system
    const isCustomer = order.customer?.email === userEmail;
    const isAssignedVendor = order.vendorId === user.id && userRole === 'vendor';
    const isAdmin = userRole === 'admin';
    const isSystem = userRole === 'system';

    if (!isCustomer && !isAssignedVendor && !isAdmin && !isSystem) {
      throw new Error('Unauthorized to update this order');
    }

    // Validate status transition if status is being updated
    if (updates.status && updates.status !== order.status) {
      const isValidTransition = this.validateStatusTransition(order.status, updates.status);
      if (!isValidTransition && !isAdmin && !isSystem) {
        throw new Error(`Invalid status transition from ${order.status} to ${updates.status}`);
      }
    }

    // Prepare update data
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    // If moveDate is provided, convert it to a Date object
    if (updates.moveDate) {
      updateData.moveDate = new Date(updates.moveDate);
    }

    // Update the order
    const updatedOrder = await orderStorage.update(orderId, updateData);

    // Add status history entry if status changed
    if (updates.status && updates.status !== order.status) {
      await this.addStatusHistoryEntry(
        orderId, 
        updates.status, 
        updates.statusNote || `Status updated from ${order.status} to ${updates.status}`
      );

      // Send notifications for status change
      await this.sendStatusChangeNotifications(updatedOrder, updates.status);
    }

    // Track order update event
    await analyticsService.trackEvent('order_updated', {
      orderId: orderId,
      userEmail: userEmail,
      userRole: userRole,
      updatedFields: Object.keys(updates),
      previousStatus: updates.status ? order.status : undefined,
      newStatus: updates.status
    });

    // Return the updated order in the expected format
    return this.getOrderById(orderId);
  }

  /**
   * Request quotes from vendors for an order
   * @param {string} orderId - Order ID
   * @param {Array<string>} vendorIds - Array of vendor IDs to request quotes from
   * @param {string} userEmail - Email of the user making the request
   * @returns {Promise<Object>} - Updated order
   */
  async requestQuotes(orderId, vendorIds, userEmail) {
    // Get the order
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Check permissions
    const user = await userStorage.getByEmail(userEmail);
    if (!user) {
      throw new Error('User not found');
    }

    // Only allow the customer or admin to request quotes
    const isCustomer = order.customer?.email === userEmail;
    const isAdmin = user.role === 'admin';

    if (!isCustomer && !isAdmin) {
      throw new Error('Not authorized to request quotes for this order');
    }

    // Update the order status if it's still in 'Initiated' status
    if (order.status === 'Initiated') {
      await orderStorage.update(orderId, {
        status: 'Quotes Requested',
        updatedAt: new Date()
      });

      // Add status history entry
      await this.addStatusHistoryEntry(
        orderId,
        'Quotes Requested',
        `Quotes requested from ${vendorIds.length} vendors`
      );
    }

    // For each vendor, create a quote request
    for (const vendorId of vendorIds) {
      try {
        // Send notification to vendor
        await notificationService.sendVendorQuoteRequestNotification(order, vendorId);

        // Track quote request event
        await analyticsService.trackEvent('quote_requested', {
          orderId: orderId,
          vendorId: vendorId,
          requestedBy: userEmail
        });
      } catch (error) {
        console.error(`Error requesting quote from vendor ${vendorId} for order ${orderId}:`, error);
        // Continue with other vendors even if one fails
      }
    }

    // Return the updated order
    return this.getOrderById(orderId);
  }

  /**
   * Submit a quote for an order
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {Object} quoteData - Quote data including amount, description, etc.
   * @returns {Promise<Object>} - Created quote
   */
  async submitQuote(orderId, vendorId, quoteData) {
    // Get the order
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Validate quote data
    if (!quoteData.amount) {
      throw new Error('Quote amount is required');
    }

    // Create the quote
    const prisma = require('../prisma');
    const quote = await prisma.quote.create({
      data: {
        id: uuidv4(),
        orderId: orderId,
        vendorId: vendorId,
        amount: parseFloat(quoteData.amount),
        description: quoteData.description || null,
        validUntil: quoteData.validUntil ? new Date(quoteData.validUntil) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Update order status if needed
    if (order.status === 'Quotes Requested' || order.status === 'Initiated') {
      await orderStorage.update(orderId, {
        status: 'Quotes Received',
        updatedAt: new Date()
      });

      // Add status history entry
      await this.addStatusHistoryEntry(
        orderId,
        'Quotes Received',
        'Quote received from vendor'
      );
    }

    // Send notification to customer
    try {
      await notificationService.sendCustomerQuoteReceivedNotification(order, vendorId, quoteData.amount);
    } catch (error) {
      console.error(`Error sending quote notification for order ${orderId}:`, error);
      // Continue even if notification fails
    }

    // Track quote submission event
    await analyticsService.trackEvent('quote_submitted', {
      orderId: orderId,
      vendorId: vendorId,
      amount: quoteData.amount
    });

    return quote;
  }

  /**
   * Get orders for a specific user
   * @param {string} userEmail - The user's email
   * @returns {Array} - Array of user orders
   */
  async getUserOrders(userEmail) {
    const orders = await orderStorage.getByUserEmail(userEmail);
    
    if (!orders || orders.length === 0) {
      return [];
    }
    
    // Sort by date (newest first)
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
   * Send notifications when order status changes
   * @param {Object} order - Order object
   * @param {string} newStatus - New status
   * @returns {Promise<void>}
   */
  async sendStatusChangeNotifications(order, newStatus) {
    try {
      const prisma = require('../prisma');
      
      // Get user and vendor information
      const users = await prisma.user.findMany();
      const vendors = await prisma.vendor.findMany({
        include: {
          user: true
        }
      });
      
      // Find the customer
      const customer = users.find(user => user.id === order.customerId);
      if (!customer) {
        console.error(`Customer not found for order ${order.id}`);
        return;
      }
      
      // Find the vendor if assigned
      let vendor = null;
      if (order.vendorId) {
        vendor = vendors.find(v => v.id === order.vendorId);
      }
      
      // Prepare notification data
      const notificationData = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: newStatus,
        timestamp: new Date().toISOString()
      };
      
      // Send notification to customer
      await notificationService.sendNotification(
        customer.email,
        `Order #${order.orderNumber} Status Update`,
        `Your order status has been updated to: ${newStatus}`,
        'order_status_update',
        notificationData
      );
      
      // Send notification to vendor if assigned
      if (vendor) {
        await notificationService.sendNotification(
          vendor.user.email,
          `Order #${order.orderNumber} Status Update`,
          `Order status has been updated to: ${newStatus}`,
          'order_status_update',
          notificationData
        );
      }
      
      // Send notification to rider if assigned
      if (order.riderId) {
        const rider = await prisma.rider.findUnique({
          where: { id: order.riderId },
          include: { user: true }
        });
        
        if (rider) {
          await notificationService.sendNotification(
            rider.user.email,
            `Order #${order.orderNumber} Status Update`,
            `Order status has been updated to: ${newStatus}`,
            'order_status_update',
            notificationData
          );
        }
      }
      
      // Track analytics event
      await analyticsService.trackEvent('order_status_changed', {
        orderId: order.id,
        previousStatus: order.status,
        newStatus: newStatus,
        customerEmail: customer.email,
        vendorEmail: vendor ? vendor.user.email : null
      });
    } catch (error) {
      console.error('Error sending status change notifications:', error);
      // Continue execution even if notifications fail
    }
  }

  /**
   * Check if inventory verification is required for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<boolean>} - Whether inventory verification is required
   */
  async isInventoryVerificationRequired(orderId) {
    try {
      const prisma = require('../prisma');
      
      // Get the order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          vendor: true
        }
      });
      
      if (!order || !order.vendorId) {
        return false;
      }
      
      // Check if the vendor has inventory
      const inventory = await prisma.inventory.findUnique({
        where: { vendorId: order.vendorId }
      });
      
      // Inventory verification is required if the vendor has inventory
      return !!inventory;
    } catch (error) {
      console.error('Error checking inventory verification requirement:', error);
      return false;
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} - Updated order
   */
  async updateOrderStatus(orderId, status, notes = '') {
    // Get the order
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Update order status
    const updatedOrder = await orderStorage.update(orderId, {
      status: status,
      statusNote: notes
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to update order status');
    }
    
    // Add status history entry
    await this.addStatusHistoryEntry(orderId, status, notes);
    
    // Send notifications for status change
    await this.sendStatusChangeNotifications(await orderStorage.getById(orderId), status);
    
    return await orderStorage.getById(orderId);
  }

  /**
   * Select vendor for order
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Object>} - Updated order
   */
  async selectVendor(orderId, vendorId) {
    // Get the order
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Check if vendor is assigned to this order
    if (vendorId && order.selectedVendorId !== vendorId) {
      throw new Error('Order not assigned to this vendor');
    }
    
    // Update selected vendor
    const updatedOrder = await orderStorage.update(orderId, {
      vendorId: vendorId
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to select vendor');
    }
    
    // Track vendor selection event
    await analyticsService.trackEvent('vendor_selected', {
      orderId,
      vendorId
    });
    
    return await orderStorage.getById(orderId);
  }

  /**
   * Process payment for order
   * @param {string} orderId - Order ID
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} - Updated order
   */
  async processPayment(orderId, paymentDetails) {
    // Get the order
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Update payment details
    const updatedOrder = await orderStorage.update(orderId, {
      paidAmount: paymentDetails.amount || 0,
      paymentStatus: 'paid',
      status: 'Paid',
      statusNote: 'Payment processed successfully'
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
    
    return await orderStorage.getById(orderId);
  }

  /**
   * Add review to order
   * @param {string} orderId - Order ID
   * @param {Object} reviewData - Review data
   * @returns {Promise<Object>} - Updated order
   */
  async addReview(orderId, reviewData) {
    // Get the order
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Create review in database
    // Note: This assumes there's a Review model in Prisma schema
    // If not, this would need to be adjusted based on the actual schema
    const prisma = require('../prisma');
    const review = await prisma.review.create({
      data: {
        orderId: orderId,
        vendorId: order.vendorId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdAt: new Date(),
        createdBy: reviewData.userEmail || null
      }
    });
    
    // Update order status to indicate review was added
    const updatedOrder = await orderStorage.update(orderId, {
      status: 'Completed',
      statusNote: 'Review added'
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to add review');
    }
    
    // Track review event
    await analyticsService.trackEvent('review_added', {
      orderId,
      vendorId: order.vendorId,
      rating: reviewData.rating
    });
    
    return await orderStorage.getById(orderId);
  }

  /**
   * Get available orders for a rider
   * @param {string} riderId - Rider ID
   * @param {Array} serviceAreas - Rider's service areas
   * @returns {Promise<Array>} - Available orders for the rider
   */
  async getAvailableOrdersForRider(riderId, serviceAreas) {
    try {
      // Use Prisma to query orders
      const prisma = require('../prisma');
      
      // Define valid statuses for available orders
      const availableStatuses = ['pending', 'rider_requested'];
      
      // Build the query
      const query = {
        where: {
          status: {
            in: availableStatuses
          }
        },
        include: {
          customer: true
        }
      };
      
      // Add service area filtering if provided
      if (serviceAreas && serviceAreas.length > 0) {
        // Create an array of OR conditions for each service area
        const serviceAreaConditions = [];
        
        for (const area of serviceAreas) {
          serviceAreaConditions.push(
            { pickupPincode: { startsWith: area } },
            { destinationPincode: { startsWith: area } }
          );
        }
        
        // Add the OR conditions to the query
        query.where.OR = serviceAreaConditions;
      }
      
      // Execute the query
      const orders = await prisma.order.findMany(query);
      
      // Filter out orders that have been declined by this rider
      // We need to do this in memory since the declinedBy field might not exist yet
      const filteredOrders = orders.filter(order => {
        if (!order.declinedBy) return true;
        
        try {
          const declinedBy = JSON.parse(order.declinedBy);
          return !declinedBy.includes(riderId);
        } catch (error) {
          // If there's an error parsing the JSON, assume the rider hasn't declined
          return true;
        }
      });
      
      // Format orders for rider view
      return filteredOrders.map(order => ({
        orderId: order.id,
        status: order.status,
        pickupAddress: order.pickupAddress,
        destinationAddress: order.destinationAddress,
        packageDetails: order.moveSize || 'Standard Package',
        amount: order.totalAmount,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        requestedTime: order.moveDate || order.createdAt
      }));
    } catch (error) {
      console.error('Error getting available orders for rider:', error);
      return [];
    }
  }

  /**
   * Get active deliveries for a rider
   * @param {string} riderId - Rider ID
   * @returns {Promise<Array>} - Active deliveries for the rider
   */
  async getActiveDeliveriesForRider(riderId) {
    try {
      const prisma = require('../prisma');
      
      // Define active statuses
      const activeStatuses = ['accepted', 'picked_up', 'in_transit', 'out_for_delivery'];
      
      // Query orders assigned to this rider with active statuses
      const activeDeliveries = await prisma.order.findMany({
        where: {
          riderId: riderId,
          status: {
            in: activeStatuses
          }
        },
        include: {
          customer: true
        }
      });
      
      // Format orders for rider view
      return activeDeliveries.map(order => ({
        orderId: order.id,
        status: order.status,
        pickupAddress: order.pickupAddress,
        destinationAddress: order.destinationAddress,
        packageDetails: order.moveSize || 'Standard Package',
        amount: order.totalAmount,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        acceptedTime: order.updatedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }));
    } catch (error) {
      console.error('Error getting active deliveries for rider:', error);
      return [];
    }
  }

  /**
   * Get completed deliveries for a rider
   * @param {string} riderId - Rider ID
   * @returns {Promise<Array>} - Completed deliveries for the rider
   */
  async getCompletedDeliveriesForRider(riderId) {
    try {
      const prisma = require('../prisma');
      
      // Define completed statuses
      const completedStatuses = ['delivered', 'failed_delivery', 'cancelled', 'completed'];
      
      // Query orders assigned to this rider with completed statuses
      const completedDeliveries = await prisma.order.findMany({
        where: {
          riderId: riderId,
          status: {
            in: completedStatuses
          }
        },
        include: {
          customer: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
      
      // Format orders for rider view
      return completedDeliveries.map(order => ({
        orderId: order.id,
        status: order.status,
        pickupAddress: order.pickupAddress,
        destinationAddress: order.destinationAddress,
        packageDetails: order.moveSize || 'Standard Package',
        amount: order.totalAmount,
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        completedAt: order.updatedAt,
        createdAt: order.createdAt
      }));
    } catch (error) {
      console.error('Error getting completed deliveries for rider:', error);
      return [];
    }
  }

  /**
   * Assign a rider to an order
   * @param {string} orderId - Order ID
   * @param {string} riderId - Rider ID
   * @returns {Promise<Object>} - Updated order
   */
  async assignRider(orderId, riderId) {
    // Get the order
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Check if order can be assigned
    if (order.status !== 'pending' && order.status !== 'rider_requested') {
      throw new Error('Order is not available for assignment');
    }
    
    // Update order with rider assignment
    const updatedOrder = await orderStorage.update(orderId, {
      riderId: riderId,
      status: 'accepted',
      statusNote: 'Rider accepted the order'
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to assign rider');
    }
    
    return await orderStorage.getById(orderId);
  }

  /**
   * Make an order available for riders again
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} - Updated order
   */
  async makeOrderAvailableForRiders(orderId) {
    // Get the order
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Check if order can be made available
    if (order.status !== 'pending' && order.status !== 'rider_requested') {
      throw new Error('Order cannot be made available');
    }
    
    // Update order status
    const updatedOrder = await orderStorage.update(orderId, {
      status: 'rider_requested',
      statusNote: 'Order made available for riders'
    });
    
    if (!updatedOrder) {
      throw new Error('Failed to make order available');
    }
    
    return await orderStorage.getById(orderId);
  }
}

// Export a singleton instance
export const orderService = new OrderService(); 