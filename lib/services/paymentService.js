import Razorpay from 'razorpay';
import crypto from 'crypto';
import { storage, orderStorage, vendorStorage, paymentStorage } from '../storage';
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
    const order = await orderStorage.getById(orderId);
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

    // Get quotes for this order
    const prisma = require('../prisma');
    const quotes = await prisma.quote.findMany({
      where: {
        orderId: orderId,
        vendorId: vendorId
      }
    });

    // Find the quote
    const quote = quotes[0];
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
          vendorId: vendorId,
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
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Get vendor details
    const vendor = await vendorStorage.getById(vendorId);
    if (!vendor) {
      throw new Error('Selected vendor not found');
    }

    // Get quotes for this order
    const prisma = require('../prisma');
    const quotes = await prisma.quote.findMany({
      where: {
        orderId: orderId,
        vendorId: vendorId
      }
    });

    // Find the quote
    const quote = quotes[0];
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
    await orderStorage.update(orderId, {
      status: 'Paid',
      vendorId: vendorId,
      paymentStatus: 'completed',
      paidAmount: quote.amount,
      statusNote: 'Payment processed successfully'
    });

    // Create payment record in database
    const payment = await paymentStorage.create({
      orderId: orderId,
      amount: quote.amount,
      paymentMethod: 'razorpay',
      transactionId: paymentDetails.razorpay_payment_id,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Get updated order
    const updatedOrder = await orderStorage.getById(orderId);

    // Prepare data for notifications
    const requestedVendors = [];
    // This part would need to be updated to use Prisma to get other vendors who quoted
    // For now, we'll skip this part as it's not critical

    // Send notifications
    await notificationService.sendPaymentNotifications(
      updatedOrder,
      vendor,
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
   * Process commission for cross-lead referrals
   * @param {string} referringVendorId - Referring vendor ID
   * @param {string} selectedVendorId - Selected vendor ID
   * @param {number} amount - Order amount
   * @param {number} commissionRate - Commission rate
   * @param {string} orderId - Order ID
   * @returns {Promise<boolean>} - Whether the commission was processed successfully
   */
  async processCrossLeadCommission(referringVendorId, selectedVendorId, amount, commissionRate, orderId) {
    if (referringVendorId === selectedVendorId) {
      console.log('Referring vendor is the same as selected vendor, skipping commission');
      return false;
    }

    try {
      // Get referring vendor
      const referringVendor = await vendorStorage.getById(referringVendorId);
      if (!referringVendor) {
        console.error('Referring vendor not found');
        return false;
      }

      // Calculate commission amount
      const commissionAmount = (amount * commissionRate) / 100;

      // Create a commission record in the database
      // Note: This assumes there's a Commission model in Prisma schema
      // If not, this would need to be adjusted based on the actual schema
      const prisma = require('../prisma');
      try {
        // Check if there's a Commission model
        await prisma.commission.create({
          data: {
            id: require('uuid').v4(),
            vendorId: referringVendorId,
            orderId: orderId,
            amount: commissionAmount,
            rate: commissionRate,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      } catch (error) {
        console.error('Error creating commission record:', error);
        // If the model doesn't exist, we'll just log the error
        // In a real implementation, you would create the appropriate model
      }

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
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Get payment details
    const payments = await paymentStorage.getByOrderId(orderId);
    if (!payments || payments.length === 0) {
      throw new Error('No payment found for this order');
    }

    // Find the payment with the matching transaction ID
    const payment = payments.find(p => p.transactionId === paymentId);
    if (!payment) {
      throw new Error('Payment ID does not match order records');
    }

    // Determine refund amount
    const refundAmount = amount !== null ? amount : payment.amount;
    if (refundAmount <= 0 || refundAmount > payment.amount) {
      throw new Error('Invalid refund amount');
    }

    // Process refund through Razorpay
    try {
      const refundData = {
        payment_id: paymentId,
        amount: Math.round(refundAmount * 100), // Convert to paise
        notes: {
          orderId: orderId,
          reason: reason
        }
      };

      const refund = await this.razorpay.payments.refund(refundData);

      // Update payment status in database
      await paymentStorage.update(payment.id, {
        status: 'refunded'
      });

      // Update order status
      await orderStorage.update(orderId, {
        status: 'Refunded',
        paymentStatus: 'refunded',
        statusNote: `Refund processed: ${reason}`
      });

      // Return refund details
      return {
        refundId: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount / 100,
        status: refund.status,
        createdAt: new Date(refund.created_at * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error processing refund:', error);
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
      // Get vendor details
      const vendor = await vendorStorage.getById(vendorId);
      if (!vendor) {
        return { hasDiscount: false, rate: 20 };
      }
      
      // Get vendor's affiliate data from metadata
      // This assumes the vendor has an affiliate property in the database
      // In a real implementation, you would have a proper affiliate model
      const prisma = require('../prisma');
      
      // Count cross leads submitted
      const crossLeadsCount = await prisma.order.count({
        where: {
          isCrossLead: true,
          referringVendorId: vendorId
        }
      });
      
      // Get used discounted commissions
      // This is a simplified implementation
      // In a real implementation, you would track this in a separate table
      const discountedCommissionsUsed = 0; // Default to 0 for now
      
      // Calculate remaining discounted commissions
      const discountedCommissionsRemaining = Math.max(0, crossLeadsCount - discountedCommissionsUsed);
      
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
      // Update the order with the cross lead status
      await orderStorage.update(orderId, {
        crossLeadStatus: status
      });
      
      return true;
    } catch (error) {
      console.error('Error updating cross lead status:', error);
      return false;
    }
  }
}

export const paymentService = new PaymentService(); 