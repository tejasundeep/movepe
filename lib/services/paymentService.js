import Razorpay from 'razorpay';
import crypto from 'crypto';
import { storage } from '../storage';
import { notificationService } from './notificationService';
import { vendorService } from './vendorService';

class PaymentService {
  constructor() {
    // Initialize Razorpay with error handling
    this.razorpay = null;
    this.initialized = false;
    
    try {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        this.razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        this.initialized = true;
      } else {
        console.error('Razorpay API keys are not configured properly');
      }
    } catch (error) {
      console.error('Failed to initialize Razorpay:', error);
    }
  }

  /**
   * Check if the payment service is properly initialized
   * @returns {boolean} - Whether the service is initialized
   */
  isInitialized() {
    return this.initialized && this.razorpay !== null;
  }

  /**
   * Create a Razorpay payment order
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {string} userEmail - User email
   * @returns {Promise<Object>} - Razorpay order details
   */
  async createPaymentOrder(orderId, vendorId, userEmail) {
    if (!this.isInitialized()) {
      throw new Error('Payment gateway is not configured properly');
    }

    // Get order details
    const orders = await storage.readData('orders.json');
    if (!orders) {
      throw new Error('Orders data not found');
    }

    const order = orders.find(o => o.orderId === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Verify the order belongs to the current user
    if (order.userEmail !== userEmail) {
      throw new Error('You are not authorized to access this order');
    }

    // Check if order is already paid
    if (order.status === 'Paid') {
      throw new Error('This order has already been paid');
    }

    // Find the quote
    const quote = order.quotes.find(q => q.vendorId === vendorId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    // Validate quote amount
    if (!quote.amount || quote.amount <= 0) {
      throw new Error('Invalid quote amount');
    }

    // Create Razorpay order
    try {
      const amountInPaise = Math.round(quote.amount * 100); // Convert to paise and ensure it's an integer
      
      const payment = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId,
        notes: {
          orderId: orderId,
          vendorId: quote.vendorId,
          userEmail: userEmail,
          quoteAmount: quote.amount.toString()
        }
      });

      return {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        key: process.env.RAZORPAY_KEY_ID
      };
    } catch (razorpayError) {
      console.error('Razorpay API error:', razorpayError);
      
      // Handle specific Razorpay errors
      const errorMessage = razorpayError.error?.description || 
                          razorpayError.message || 
                          'Unknown payment gateway error';
                          
      throw new Error('Payment gateway error: ' + errorMessage);
    }
  }

  /**
   * Verify a Razorpay payment
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {string} razorpay_order_id - Razorpay order ID
   * @param {string} razorpay_payment_id - Razorpay payment ID
   * @param {string} razorpay_signature - Razorpay signature
   * @returns {Promise<Object>} - Updated order
   */
  async verifyPayment(orderId, vendorId, razorpay_order_id, razorpay_payment_id, razorpay_signature) {
    if (!this.isInitialized()) {
      throw new Error('Payment gateway is not configured properly');
    }

    // Verify payment signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(sign)
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      throw new Error('Invalid payment signature');
    }

    // Process the payment
    return this.processPayment(orderId, vendorId, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Process a successful payment
   * @param {string} orderId - Order ID
   * @param {string} vendorId - Vendor ID
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} - Updated order
   */
  async processPayment(orderId, vendorId, paymentDetails) {
    // Get order details
    const orders = await storage.readData('orders.json');
    if (!orders) {
      throw new Error('Orders data not found');
    }

    const orderIndex = orders.findIndex(o => o.orderId === orderId);
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    const order = orders[orderIndex];

    // Get vendor details
    const vendors = await storage.readData('vendors.json');
    if (!vendors) {
      throw new Error('Vendors data not found');
    }

    const selectedVendor = vendors.find(v => v.vendorId === vendorId);
    if (!selectedVendor) {
      throw new Error('Selected vendor not found');
    }

    // Find the quote
    const quote = order.quotes.find(q => q.vendorId === vendorId);
    if (!quote) {
      throw new Error('Quote not found');
    }
    
    // Check if the vendor has a commission discount available
    const { hasDiscount, rate } = await this.checkVendorCommissionDiscount(vendorId);
    
    // Apply commission discount if available
    let appliedDiscount = false;
    if (hasDiscount) {
      // Track commission discount usage
      appliedDiscount = await vendorService.trackCommissionDiscountUsage(vendorId, orderId);
    }

    // Update order with payment details
    const updatedOrder = {
      ...order,
      status: 'Paid',
      selectedVendorId: vendorId,
      selectedQuote: quote,
      payment: {
        ...paymentDetails,
        amount: quote.amount,
        paidAt: new Date().toISOString(),
        appliedCommissionDiscount: appliedDiscount,
        commissionRate: appliedDiscount ? 5 : 20
      }
    };

    // Update order in storage
    orders[orderIndex] = updatedOrder;
    await storage.writeData('orders.json', orders);

    // Prepare data for notifications
    const requestedVendors = [];
    if (Array.isArray(order.vendorRequests)) {
      for (const reqVendorId of order.vendorRequests) {
        if (reqVendorId === vendorId) continue;
        
        const vendor = vendors.find(v => v.vendorId === reqVendorId);
        if (vendor) {
          const didQuote = order.quotes.some(q => q.vendorId === reqVendorId);
          const quote = didQuote ? order.quotes.find(q => q.vendorId === reqVendorId) : null;
          
          requestedVendors.push({
            ...vendor,
            didQuote,
            quote
          });
        }
      }
    }

    // Send notifications
    await notificationService.sendPaymentNotifications(
      updatedOrder,
      selectedVendor,
      paymentDetails,
      requestedVendors
    );

    // Handle cross-lead commission if applicable
    if (order.isCrossLead && order.referringVendorId) {
      await this.processCrossLeadCommission(
        order.referringVendorId,
        vendorId,
        quote.amount,
        order.commissionRate || 20,
        orderId
      );
      
      // Update cross lead status
      await this.updateCrossLeadStatus(orderId, 'Converted');
    }

    return updatedOrder;
  }

  /**
   * Process cross-lead commission for referring vendors
   * @param {string} referringVendorId - ID of the vendor who referred the lead
   * @param {string} selectedVendorId - ID of the vendor who got the job
   * @param {number} amount - Quote amount
   * @param {number} commissionRate - Commission rate percentage
   * @param {string} orderId - Order ID
   * @returns {Promise<boolean>} - Whether the commission was processed successfully
   */
  async processCrossLeadCommission(referringVendorId, selectedVendorId, amount, commissionRate, orderId) {
    if (referringVendorId === selectedVendorId) {
      return false; // No commission for self-referrals
    }

    try {
      const vendors = await storage.readData('vendors.json');
      if (!vendors) {
        throw new Error('Vendors data not found');
      }

      const referringVendorIndex = vendors.findIndex(v => v.vendorId === referringVendorId);
      if (referringVendorIndex === -1) {
        throw new Error('Referring vendor not found');
      }

      // Calculate commission
      const commissionAmount = (amount * commissionRate) / 100;

      // Update referring vendor's commission history
      const referringVendor = vendors[referringVendorIndex];
      
      if (!referringVendor.affiliate) {
        referringVendor.affiliate = {
          isAffiliate: true,
          referralCode: referringVendor.vendorId.substring(0, 8),
          referredVendors: [],
          commissionRate: 20,
          discountedCommissionsRemaining: 0,
          discountedCommissionsUsed: 0,
          commissionHistory: []
        };
      }

      // Check if this is a discounted commission (5% instead of 20%)
      const isDiscountedCommission = commissionRate === 5;
      
      // If using a discounted commission, increment the used counter
      if (isDiscountedCommission) {
        referringVendor.affiliate.discountedCommissionsUsed = 
          (referringVendor.affiliate.discountedCommissionsUsed || 0) + 1;
      }

      if (!Array.isArray(referringVendor.affiliate.commissionHistory)) {
        referringVendor.affiliate.commissionHistory = [];
      }

      // Add commission record
      referringVendor.affiliate.commissionHistory.push({
        orderId,
        amount: commissionAmount,
        date: new Date().toISOString(),
        vendorId: selectedVendorId
      });
      
      // Add to affiliate history
      if (!referringVendor.affiliate.history) {
        referringVendor.affiliate.history = [];
      }
      
      referringVendor.affiliate.history.push({
        orderId,
        action: 'Earned commission',
        date: new Date().toISOString(),
        amount: commissionAmount,
        rate: commissionRate
      });

      // Update vendor in storage
      vendors[referringVendorIndex] = referringVendor;
      await storage.writeData('vendors.json', vendors);

      return true;
    } catch (error) {
      console.error('Error processing cross-lead commission:', error);
      return false;
    }
  }

  /**
   * Process a refund for an order
   * @param {string} orderId - Order ID
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Refund amount (optional, defaults to full amount)
   * @param {string} reason - Reason for refund
   * @returns {Promise<Object>} - Refund details
   */
  async processRefund(orderId, paymentId, amount = null, reason = 'customer_requested') {
    if (!this.isInitialized()) {
      throw new Error('Payment gateway is not configured properly');
    }

    if (!orderId || !paymentId) {
      throw new Error('Order ID and payment ID are required');
    }

    // Get order details
    const orders = await storage.readData('orders.json');
    if (!orders) {
      throw new Error('Orders data not found');
    }

    const order = orders.find(o => o.orderId === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Check if payment exists
    if (!order.payment || !order.payment.razorpay_payment_id) {
      throw new Error('No payment found for this order');
    }

    // Verify payment ID matches
    if (order.payment.razorpay_payment_id !== paymentId) {
      throw new Error('Payment ID does not match order records');
    }

    try {
      // Process refund through Razorpay
      const refundOptions = {
        payment_id: paymentId,
        notes: {
          orderId: orderId,
          reason: reason
        }
      };

      // Add amount if specified (partial refund)
      if (amount) {
        refundOptions.amount = amount * 100; // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(refundOptions);

      // Update order with refund information
      await storage.updateData('orders.json', (orders) => {
        const orderIndex = orders.findIndex(o => o.orderId === orderId);
        if (orderIndex === -1) {
          throw new Error('Order not found');
        }

        orders[orderIndex].refund = {
          refundId: refund.id,
          amount: refund.amount / 100, // Convert from paise to rupees
          status: refund.status,
          createdAt: new Date().toISOString(),
          reason: reason
        };

        // Update order status if it's a full refund
        if (!amount || amount === orders[orderIndex].payment.amount) {
          orders[orderIndex].status = 'Refunded';
        }

        return orders;
      });

      // Send refund notification
      await notificationService.sendRefundNotification(order, refund.amount / 100);

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      throw new Error(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Get payment status
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} - Payment status details
   */
  async getPaymentStatus(paymentId) {
    if (!this.isInitialized()) {
      throw new Error('Payment gateway is not configured properly');
    }

    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount / 100,
        status: payment.status,
        method: payment.method,
        createdAt: new Date(payment.created_at * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error fetching payment status:', error);
      throw new Error(`Failed to fetch payment status: ${error.message}`);
    }
  }

  /**
   * Check if a vendor has available discounted commissions
   * @param {string} vendorId - The vendor ID
   * @returns {Promise<{hasDiscount: boolean, rate: number}>} - Whether the vendor has a discount and the rate
   */
  async checkVendorCommissionDiscount(vendorId) {
    try {
      const vendors = await storage.readData('vendors.json');
      if (!vendors) {
        return { hasDiscount: false, rate: 20 };
      }
      
      const vendor = vendors.find(v => v.vendorId === vendorId);
      if (!vendor || !vendor.affiliate) {
        return { hasDiscount: false, rate: 20 };
      }
      
      // Count cross leads submitted
      const orders = await storage.readData('orders.json');
      const crossLeadsSubmitted = orders.filter(order => 
        order.crossLead && order.crossLeadVendorId === vendorId
      ).length;
      
      // Calculate remaining discounted commissions
      const discountedCommissionsUsed = vendor.affiliate.discountedCommissionsUsed || 0;
      const discountedCommissionsRemaining = Math.max(0, crossLeadsSubmitted - discountedCommissionsUsed);
      
      return {
        hasDiscount: discountedCommissionsRemaining > 0,
        rate: discountedCommissionsRemaining > 0 ? 5 : 20
      };
    } catch (error) {
      console.error('Error checking vendor commission discount:', error);
      return { hasDiscount: false, rate: 20 };
    }
  }

  /**
   * Update cross lead status when a payment is made
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @returns {Promise<boolean>} - Whether the update was successful
   */
  async updateCrossLeadStatus(orderId, status = 'Converted') {
    try {
      const orders = await storage.readData('orders.json');
      if (!orders) {
        return false;
      }
      
      // Find the order
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      if (orderIndex === -1) {
        return false;
      }
      
      // Check if this is a cross lead
      if (!orders[orderIndex].isCrossLead) {
        return false;
      }
      
      // Update the status
      orders[orderIndex].crossLeadStatus = status;
      
      // Save the updated orders
      await storage.writeData('orders.json', orders);
      
      // If this is a cross lead, update the referring vendor's stats
      if (orders[orderIndex].referringVendorId) {
        const vendors = await storage.readData('vendors.json');
        if (!vendors) {
          return false;
        }
        
        const vendorIndex = vendors.findIndex(v => v.vendorId === orders[orderIndex].referringVendorId);
        if (vendorIndex === -1) {
          return false;
        }
        
        // Initialize affiliate property if it doesn't exist
        if (!vendors[vendorIndex].affiliate) {
          vendors[vendorIndex].affiliate = {
            isAffiliate: true,
            referralCode: vendors[vendorIndex].vendorId.substring(0, 8),
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
          action: 'Cross lead converted',
          date: new Date().toISOString(),
          status
        });
        
        // Save the updated vendors
        await storage.writeData('vendors.json', vendors);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating cross lead status:', error);
      return false;
    }
  }
}

export const paymentService = new PaymentService(); 