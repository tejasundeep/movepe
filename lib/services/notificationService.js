const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const { storage } = require('../storage');
const { analyticsService } = require('./analyticsService');

class NotificationService {
  constructor() {
    // Initialize SendGrid if API key is available and valid
    this.sendGridInitialized = false;
    try {
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.sendGridInitialized = true;
      } else {
        console.warn('SendGrid API key missing or invalid, email notifications will be disabled');
      }
    } catch (error) {
      console.error('Failed to initialize SendGrid:', error);
    }

    // Initialize Twilio client if credentials are available and valid
    this.twilioClient = null;
    this.twilioInitialized = false;
    try {
      if (process.env.TWILIO_ACCOUNT_SID && 
          process.env.TWILIO_AUTH_TOKEN && 
          process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        this.twilioInitialized = true;
      } else {
        console.warn('Twilio credentials missing or invalid, SMS notifications will be disabled');
      }
    } catch (error) {
      console.error('Failed to initialize Twilio:', error);
    }
  }

  /**
   * Send notifications to vendors about quote requests
   * @param {Object} order - Order details
   * @param {Array} vendors - Array of vendor objects with email and whatsapp properties
   * @returns {Promise<void>}
   */
  async sendVendorQuoteRequestNotifications(order, vendors) {
    if (!this.sendGridInitialized) {
      console.warn('SendGrid not initialized, skipping email notifications');
      return;
    }

    const emailPromises = vendors.map(async (vendor) => {
      try {
        if (!vendor.email) return;

        await sgMail.send({
          to: vendor.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
          subject: `New Move Quote Request - Order #${order.orderId}`,
          text: `You have received a new quote request for a ${order.moveSize} move from ${order.pickupPincode} to ${order.destinationPincode}. Please log in to your dashboard to submit your quote.`,
          html: `
            <h2>New Quote Request</h2>
            <p>You have received a new quote request with the following details:</p>
            <ul>
              <li><strong>Order ID:</strong> ${order.orderId}</li>
              <li><strong>Move Size:</strong> ${order.moveSize}</li>
              <li><strong>From:</strong> ${order.pickupPincode}</li>
              <li><strong>To:</strong> ${order.destinationPincode}</li>
              <li><strong>Preferred Date:</strong> ${order.moveDate ? new Date(order.moveDate).toLocaleDateString() : 'Not specified'}</li>
            </ul>
            <p>Please log in to your dashboard to submit your quote.</p>
          `
        });

        // Send WhatsApp notification if configured
        if (this.twilioInitialized && process.env.TWILIO_WHATSAPP_NUMBER && vendor.whatsapp) {
          await this.twilioClient.messages.create({
            body: `New quote request for Order #${order.orderId}: ${order.moveSize} move from ${order.pickupPincode} to ${order.destinationPincode}. Log in to submit your quote.`,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${vendor.whatsapp}`
          });
        }

        // Track notification event for each vendor
        await analyticsService.trackEvent('notification_sent', {
          recipientType: 'vendor',
          vendorId: vendor.vendorId,
          vendorEmail: vendor.email,
          notificationType: 'quote_request',
          channel: 'email',
          orderId: order.orderId
        });
      } catch (error) {
        console.error(`Failed to send notification to vendor ${vendor.id}:`, error);
      }
    });

    await Promise.all(emailPromises).catch(error => {
      console.error('Error sending vendor notifications:', error);
    });
  }

  /**
   * Send notification to user about new quote
   * @param {Object} order - Order details
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<void>}
   */
  async sendUserQuoteNotification(order, vendorId) {
    if (!this.sendGridInitialized) {
      console.warn('SendGrid not initialized, skipping email notification');
      return;
    }

    try {
      // Get vendor details
      const vendors = await storage.readData('vendors.json');
      if (!vendors) return;
      
      const vendor = vendors.find(v => v.vendorId === vendorId);
      if (!vendor) return;
      
      // Get quote details
      const quote = order.quotes.find(q => q.vendorId === vendorId);
      if (!quote) return;

      // Send email to user
      await sgMail.send({
        to: order.userEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        subject: `New Quote Received for Your Move - Order #${order.orderId}`,
        text: `You have received a new quote from ${vendor.name} for your move. The quoted amount is ₹${quote.amount}. Log in to view and accept the quote.`,
        html: `
          <h2>New Quote Received</h2>
          <p>You have received a new quote for your move:</p>
          <ul>
            <li><strong>Vendor:</strong> ${vendor.name}</li>
            <li><strong>Amount:</strong> ₹${quote.amount}</li>
            <li><strong>Order ID:</strong> ${order.orderId}</li>
          </ul>
          <p>Log in to view and accept the quote.</p>
        `
      });

      // Track notification event
      await analyticsService.trackEvent('notification_sent', {
        recipientType: 'user',
        userEmail: order.userEmail,
        notificationType: 'quote_received',
        channel: 'email',
        orderId: order.orderId,
        vendorId: vendorId,
        quoteAmount: quote.amount
      });

      // Send WhatsApp notification if configured
      if (this.twilioInitialized && process.env.TWILIO_WHATSAPP_NUMBER && order.userPhone) {
        await this.twilioClient.messages.create({
          body: `New quote received for Order #${order.orderId} from ${vendor.name}: ₹${quote.amount}. Log in to view and accept.`,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${order.userPhone}`
        }).catch(error => {
          console.error('Error sending user WhatsApp:', error);
        });
        
        // Track WhatsApp notification event
        await analyticsService.trackEvent('notification_sent', {
          recipientType: 'user',
          userEmail: order.userEmail,
          notificationType: 'quote_received',
          channel: 'whatsapp',
          orderId: order.orderId,
          vendorId: vendorId,
          quoteAmount: quote.amount
        });
      }
    } catch (error) {
      console.error('Error sending user quote notification:', error);
    }
  }

  /**
   * Send payment notifications to all parties
   * @param {Object} order - Order details
   * @param {Object} selectedVendor - Selected vendor details
   * @param {Object} paymentDetails - Payment details
   * @param {Array} requestedVendors - Array of vendors who were requested but not selected
   * @returns {Promise<void>}
   */
  async sendPaymentNotifications(order, selectedVendor, paymentDetails, requestedVendors = []) {
    if (!this.sendGridInitialized) {
      console.warn('SendGrid not initialized, skipping email notifications');
      return;
    }

    try {
      const vendorName = selectedVendor.name || 'Selected vendor';
      const orderId = order.orderId;

      // Email to selected vendor
      if (selectedVendor?.email) {
        await sgMail.send({
          to: selectedVendor.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
          subject: `Payment Received for Order #${orderId}`,
          text: `Payment has been received for order #${orderId}. Please log in to your dashboard to proceed with the move.`,
          html: `
            <h2>Payment Received</h2>
            <p>Payment has been received for order #${orderId}.</p>
            <p>Please log in to your dashboard to proceed with the move.</p>
          `
        }).catch(error => {
          console.error('Error sending vendor email:', error);
        });
        
        // Track email notification event
        await analyticsService.trackEvent('notification_sent', {
          recipient: 'vendor',
          vendorEmail: selectedVendor.email,
          notificationType: 'payment_received',
          channel: 'email',
          orderId: orderId,
          amount: paymentDetails?.amount || 0
        });
      }

      // Email to user
      if (order.userEmail) {
        await sgMail.send({
          to: order.userEmail,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
          subject: `Payment Confirmed for Order #${orderId}`,
          text: `Your payment for order #${orderId} has been confirmed. The vendor will contact you shortly to coordinate the move.`,
          html: `
            <h2>Payment Confirmed</h2>
            <p>Your payment for order #${orderId} has been confirmed.</p>
            <p>The vendor will contact you shortly to coordinate the move.</p>
          `
        }).catch(error => {
          console.error('Error sending user email:', error);
        });
      }
      
      // Emails to requested vendors who weren't selected
      if (Array.isArray(requestedVendors) && requestedVendors.length > 0 && order.selectedQuote) {
        for (const requestedVendor of requestedVendors) {
          if (!requestedVendor || !requestedVendor.vendorId || requestedVendor.vendorId === selectedVendor.vendorId) {
            continue;
          }
          
          if (requestedVendor?.email) {
            let emailSubject = `Update on Order #${orderId}`;
            let emailText = '';
            let emailHtml = '';
            
            if (requestedVendor.didQuote) {
              // This vendor submitted a quote but wasn't selected
              let priceDifference = 0;
              if (requestedVendor.quote?.amount && order.selectedQuote?.amount) {
                priceDifference = requestedVendor.quote.amount - order.selectedQuote.amount;
              }
              
              const priceDifferenceText = priceDifference > 0 
                ? `they have quoted ₹${priceDifference} less than yours`
                : priceDifference < 0
                  ? `despite their quote being ₹${Math.abs(priceDifference)} higher than yours`
                  : `they submitted an equal quote`;
              
              emailText = `This job has been assigned to ${vendorName} as ${priceDifferenceText}.`;
              emailHtml = `
                <h2>Job Assignment Update</h2>
                <p>This job has been assigned to <strong>${vendorName}</strong> as ${priceDifferenceText}.</p>
                <p>Thank you for your interest in this order.</p>
              `;
            } else {
              // This vendor received a request but didn't submit a quote
              emailText = `The user has selected ${vendorName} for order #${orderId}. Since you didn't submit a quote, the opportunity has been assigned to another vendor.`;
              emailHtml = `
                <h2>Job Assignment Update</h2>
                <p>The user has selected <strong>${vendorName}</strong> for order #${orderId}.</p>
                <p>Since you didn't submit a quote, the opportunity has been assigned to another vendor.</p>
                <p>Thank you for your interest in our platform.</p>
              `;
            }
            
            await sgMail.send({
              to: requestedVendor.email,
              from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
              subject: emailSubject,
              text: emailText,
              html: emailHtml
            }).catch(error => {
              console.error(`Error sending email to vendor ${requestedVendor.vendorId}:`, error);
            });
          }
        }
      }

      // Send WhatsApp notifications if configured
      if (this.twilioInitialized && process.env.TWILIO_WHATSAPP_NUMBER) {
        // Message to selected vendor
        if (selectedVendor?.whatsapp) {
          await this.twilioClient.messages.create({
            body: `Payment received for order #${orderId}. Please log in to proceed with the move.`,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${selectedVendor.whatsapp}`
          }).catch(error => {
            console.error('Error sending vendor WhatsApp:', error);
          });
        }

        // Message to user
        if (order.userWhatsapp) {
          await this.twilioClient.messages.create({
            body: `Your payment for order #${orderId} is confirmed. The vendor will contact you shortly.`,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${order.userWhatsapp}`
          }).catch(error => {
            console.error('Error sending user WhatsApp:', error);
          });
        }
        
        // Messages to requested vendors who weren't selected
        if (Array.isArray(requestedVendors) && requestedVendors.length > 0 && order.selectedQuote) {
          for (const requestedVendor of requestedVendors) {
            if (!requestedVendor || !requestedVendor.vendorId || requestedVendor.vendorId === selectedVendor.vendorId) {
              continue;
            }
            
            if (requestedVendor?.whatsapp) {
              let messageText = '';
              
              if (requestedVendor.didQuote) {
                // This vendor submitted a quote but wasn't selected
                let priceDifference = 0;
                if (requestedVendor.quote?.amount && order.selectedQuote?.amount) {
                  priceDifference = requestedVendor.quote.amount - order.selectedQuote.amount;
                }
                
                const priceDifferenceText = priceDifference > 0 
                  ? `they have quoted ₹${priceDifference} less than yours`
                  : priceDifference < 0
                    ? `despite their quote being ₹${Math.abs(priceDifference)} higher than yours`
                    : `they submitted an equal quote`;
                
                messageText = `Update on Order #${orderId}: This job has been assigned to ${vendorName} as ${priceDifferenceText}.`;
              } else {
                // This vendor received a request but didn't submit a quote
                messageText = `Update on Order #${orderId}: The user has selected another vendor since you didn't submit a quote.`;
              }
              
              await this.twilioClient.messages.create({
                body: messageText,
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                to: `whatsapp:${requestedVendor.whatsapp}`
              }).catch(error => {
                console.error(`Error sending WhatsApp to vendor ${requestedVendor.vendorId}:`, error);
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending payment notifications:', error);
    }
  }

  /**
   * Send notification to customer about cross-lead creation
   * @param {Object} customerData - Customer data
   * @param {string} orderId - Order ID
   * @returns {Promise<void>}
   */
  async sendCrossLeadNotification(customerData, orderId) {
    if (!this.sendGridInitialized) {
      console.warn('SendGrid not initialized, skipping email notification');
      return;
    }

    try {
      await sgMail.send({
        to: customerData.customerEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        subject: 'Your Move Request Has Been Created',
        text: `Hello ${customerData.customerName},\n\nA move request has been created for you by one of our partner vendors. You can log in to view the details and manage your move.\n\nThank you for choosing MovePe!`,
        html: `
          <h2>Your Move Request Has Been Created</h2>
          <p>Hello ${customerData.customerName},</p>
          <p>A move request has been created for you by one of our partner vendors. You can log in to view the details and manage your move.</p>
          <p>Thank you for choosing MovePe!</p>
        `
      });

      // Send WhatsApp notification if configured
      if (this.twilioInitialized && process.env.TWILIO_WHATSAPP_NUMBER && customerData.customerPhone) {
        await this.twilioClient.messages.create({
          body: `Hello ${customerData.customerName}, a move request has been created for you by one of our partner vendors. You can log in to view the details and manage your move.`,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${customerData.customerPhone}`
        }).catch(error => {
          console.error('Error sending customer WhatsApp:', error);
        });
      }
    } catch (error) {
      console.error('Error sending cross-lead notification:', error);
    }
  }

  /**
   * Send notification to vendor about new review
   * @param {Object} vendor - Vendor details
   * @param {Object} order - Order details with review
   * @returns {Promise<void>}
   */
  async sendReviewNotification(vendor, order) {
    if (!this.sendGridInitialized) {
      console.warn('SendGrid not initialized, skipping email notification');
      return;
    }

    try {
      if (!vendor?.email || !order?.review) {
        return;
      }

      const review = order.review;
      const rating = review.rating;
      const comment = review.comment;

      // Send email to vendor
      await sgMail.send({
        to: vendor.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        subject: `New Review Received - Order #${order.orderId}`,
        text: `You have received a new ${rating}-star review for order #${order.orderId}. Comment: "${comment}". Thank you for your service!`,
        html: `
          <h2>New Review Received</h2>
          <p>You have received a new review for order #${order.orderId}:</p>
          <p><strong>Rating:</strong> ${rating} stars</p>
          <p><strong>Comment:</strong> "${comment}"</p>
          <p>Thank you for your service!</p>
        `
      });

      // Send WhatsApp notification if configured
      if (this.twilioInitialized && process.env.TWILIO_WHATSAPP_NUMBER && vendor.whatsapp) {
        await this.twilioClient.messages.create({
          body: `New ${rating}-star review received for order #${order.orderId}: "${comment}". Thank you for your service!`,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${vendor.whatsapp}`
        }).catch(error => {
          console.error('Error sending vendor WhatsApp:', error);
        });
      }
    } catch (error) {
      console.error('Error sending review notification:', error);
    }
  }

  /**
   * Send notification to user about vendor's response to their review
   * @param {Object} order - Order details with review and vendor response
   * @param {Object} vendor - Vendor details
   * @returns {Promise<void>}
   */
  async sendVendorResponseNotification(order, vendor) {
    if (!this.sendGridInitialized) {
      console.warn('SendGrid not initialized, skipping email notification');
      return;
    }

    try {
      if (!order?.userEmail || !order?.review?.vendorResponse || !vendor?.name) {
        return;
      }

      const vendorName = vendor.name;
      const responseText = order.review.vendorResponse.text;
      const orderShortId = order.orderId.slice(0, 8);

      // Send email to user
      await sgMail.send({
        to: order.userEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
        subject: `${vendorName} responded to your review - Order #${orderShortId}`,
        text: `${vendorName} has responded to your review for order #${orderShortId}. Response: "${responseText}".`,
        html: `
          <h2>${vendorName} Responded to Your Review</h2>
          <p>${vendorName} has responded to your review for order #${orderShortId}:</p>
          <p><strong>Their Response:</strong> "${responseText}"</p>
          <p>You can view the full conversation in your order details.</p>
        `
      });

      // Send SMS notification if configured and user has phone number
      if (this.twilioInitialized && process.env.TWILIO_PHONE_NUMBER && order.userPhone) {
        await this.twilioClient.messages.create({
          body: `${vendorName} responded to your review for order #${orderShortId}: "${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}"`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: order.userPhone
        }).catch(error => {
          console.error('Error sending user SMS:', error);
        });
      }
    } catch (error) {
      console.error('Error sending vendor response notification:', error);
    }
  }

  /**
   * Send a notification to a user
   * @param {string} userEmail - User email
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type (info, success, warning, error)
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} - Created notification
   */
  async sendUserNotification(userEmail, title, message, type = 'info', data = {}) {
    if (!userEmail || !title || !message) {
      throw new Error('User email, title, and message are required');
    }

    const notification = {
      id: Date.now().toString(),
      userEmail,
      title,
      message,
      type,
      data,
      read: false,
      createdAt: new Date().toISOString()
    };

    await storage.updateData('notifications.json', (notifications) => {
      return [...(notifications || []), notification];
    });

    // Track notification event
    await analyticsService.trackEvent('notification_sent', {
      recipient: 'user',
      userEmail,
      notificationType: type,
      dataType: data.type || 'general',
      channel: 'in_app'
    });

    return notification;
  }

  /**
   * Send a notification to a vendor
   * @param {string} vendorEmail - Vendor email
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type (info, success, warning, error)
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} - Created notification
   */
  async sendVendorNotification(vendorEmail, title, message, type = 'info', data = {}) {
    if (!vendorEmail || !title || !message) {
      throw new Error('Vendor email, title, and message are required');
    }

    const notification = {
      id: Date.now().toString(),
      vendorEmail,
      title,
      message,
      type,
      data,
      read: false,
      createdAt: new Date().toISOString()
    };

    await storage.updateData('vendor_notifications.json', (notifications) => {
      return [...(notifications || []), notification];
    });

    // Track notification event
    await analyticsService.trackEvent('notification_sent', {
      recipient: 'vendor',
      vendorEmail,
      notificationType: type,
      dataType: data.type || 'general',
      channel: 'in_app'
    });

    return notification;
  }

  /**
   * Send vendor quote request notifications
   * @param {Object} order - Order object
   * @param {Array} vendors - Array of vendor objects
   * @returns {Promise<void>}
   */
  async sendVendorQuoteRequestNotifications(order, vendors) {
    if (!order || !Array.isArray(vendors)) {
      return;
    }

    for (const vendor of vendors) {
      await this.sendVendorNotification(
        vendor.email,
        'New Quote Request',
        `You have a new quote request for a move from ${order.moveDetails?.pickupPincode} to ${order.moveDetails?.destinationPincode}`,
        'info',
        {
          orderId: order.orderId,
          type: 'quote_request'
        }
      );

      // Send WhatsApp notification if available
      if (vendor.whatsapp) {
        // Implement WhatsApp notification here
        console.log(`Would send WhatsApp to ${vendor.whatsapp} about quote request`);
      }
    }
  }

  /**
   * Send user quote notification
   * @param {Object} order - Order object
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<void>}
   */
  async sendUserQuoteNotification(order, vendorId) {
    if (!order || !order.userEmail || !vendorId) {
      return;
    }

    // Get vendor details
    const vendors = await storage.readData('vendors.json');
    if (!vendors) {
      return;
    }

    const vendor = vendors.find(v => v.vendorId === vendorId);
    if (!vendor) {
      return;
    }

    // Find the quote
    const quote = order.quotes.find(q => q.vendorId === vendorId);
    if (!quote) {
      return;
    }

    await this.sendUserNotification(
      order.userEmail,
      'New Quote Received',
      `${vendor.name} has submitted a quote of ₹${quote.amount.toLocaleString('en-IN')} for your move`,
      'success',
      {
        orderId: order.orderId,
        vendorId: vendorId,
        quoteAmount: quote.amount,
        type: 'quote_received'
      }
    );
  }

  /**
   * Send notification to vendor about order payment
   * @param {Object} order - Order details
   * @param {Object} vendor - Vendor details
   * @returns {Promise<void>}
   */
  async sendVendorOrderPaidNotification(order, vendor) {
    try {
      if (!order || !vendor || !vendor.email) {
        return;
      }

      await this.sendVendorNotification(
        vendor.email,
        'Order Confirmed',
        `Your quote for order #${order.orderId} has been accepted and paid. Please start preparing for the move.`,
        'success',
        {
          orderId: order.orderId,
          amount: order.payment?.amount || 0,
          type: 'order_paid'
        }
      );

      // Track notification event
      await analyticsService.trackEvent('notification_sent', {
        recipientType: 'vendor',
        vendorId: vendor.vendorId,
        vendorEmail: vendor.email,
        notificationType: 'payment_received',
        channel: 'email',
        orderId: order.orderId,
        paymentAmount: order.payment.amount
      });
      
      // If SMS notification is sent, track that too
      if (this.twilioInitialized && process.env.TWILIO_PHONE_NUMBER && vendor.phone) {
        await analyticsService.trackEvent('notification_sent', {
          recipientType: 'vendor',
          vendorId: vendor.vendorId,
          vendorEmail: vendor.email,
          notificationType: 'payment_received',
          channel: 'sms',
          orderId: order.orderId,
          paymentAmount: order.payment.amount
        });
      }
    } catch (error) {
      console.error('Error sending vendor payment notification:', error);
    }
  }

  /**
   * Send user order confirmation notification
   * @param {Object} order - Order object
   * @param {Object} user - User object
   * @returns {Promise<void>}
   */
  async sendUserOrderConfirmationNotification(order, user) {
    if (!order || !user || !user.email) {
      return;
    }

    await this.sendUserNotification(
      user.email,
      'Order Confirmed',
      `Your payment for order #${order.orderId} has been confirmed. The vendor will contact you soon.`,
      'success',
      {
        orderId: order.orderId,
        amount: order.payment?.amount || 0,
        type: 'order_confirmed'
      }
    );
  }

  /**
   * Send notification to user about order status update
   * @param {Object} order - Order details
   * @param {Object} user - User details
   * @param {string} statusDescription - Description of the status change
   * @returns {Promise<void>}
   */
  async sendUserOrderStatusUpdateNotification(order, user, statusDescription) {
    try {
      if (!order || !user || !user.email) {
        return;
      }

      await this.sendUserNotification(
        user.email,
        'Order Status Update',
        `Your move has ${statusDescription}. Order #${order.orderId} is now ${order.status}.`,
        'info',
        {
          orderId: order.orderId,
          status: order.status,
          type: 'order_status_update'
        }
      );

      // Track notification event
      await analyticsService.trackEvent('notification_sent', {
        recipientType: 'user',
        userEmail: user.email,
        notificationType: 'order_status_update',
        channel: 'email',
        orderId: order.orderId,
        newStatus: order.status,
        statusDescription: statusDescription
      });
      
      // If SMS notification is sent, track that too
      if (this.twilioInitialized && process.env.TWILIO_PHONE_NUMBER && user.phone) {
        await analyticsService.trackEvent('notification_sent', {
          recipientType: 'user',
          userEmail: user.email,
          notificationType: 'order_status_update',
          channel: 'sms',
          orderId: order.orderId,
          newStatus: order.status,
          statusDescription: statusDescription
        });
      }
    } catch (error) {
      console.error('Error sending user order status update notification:', error);
    }
  }

  /**
   * Send user order delivered notification
   * @param {Object} order - Order object
   * @param {Object} user - User object
   * @returns {Promise<void>}
   */
  async sendUserOrderDeliveredNotification(order, user) {
    if (!order || !user || !user.email) {
      return;
    }

    await this.sendUserNotification(
      user.email,
      'Order Delivered',
      `Your items have been delivered. Please confirm that everything is in order.`,
      'success',
      {
        orderId: order.orderId,
        type: 'order_delivered'
      }
    );
  }

  /**
   * Send user order completed notification
   * @param {Object} order - Order object
   * @param {Object} user - User object
   * @returns {Promise<void>}
   */
  async sendUserOrderCompletedNotification(order, user) {
    if (!order || !user || !user.email) {
      return;
    }

    await this.sendUserNotification(
      user.email,
      'Order Completed',
      `Your move has been completed. Thank you for using our service. Please leave a review.`,
      'success',
      {
        orderId: order.orderId,
        type: 'order_completed'
      }
    );
  }

  /**
   * Send order cancellation notifications
   * @param {Object} order - Order object
   * @param {Object} user - User object
   * @param {Object} vendor - Vendor object
   * @returns {Promise<void>}
   */
  async sendOrderCancellationNotifications(order, user, vendor) {
    if (!order) {
      return;
    }

    // Notify user
    if (user && user.email) {
      await this.sendUserNotification(
        user.email,
        'Order Cancelled',
        `Your order #${order.orderId} has been cancelled.`,
        'warning',
        {
          orderId: order.orderId,
          type: 'order_cancelled'
        }
      );
    }

    // Notify vendor
    if (vendor && vendor.email) {
      await this.sendVendorNotification(
        vendor.email,
        'Order Cancelled',
        `Order #${order.orderId} has been cancelled.`,
        'warning',
        {
          orderId: order.orderId,
          type: 'order_cancelled'
        }
      );
    }
  }

  /**
   * Send payment notifications
   * @param {Object} order - Order object
   * @param {Object} selectedVendor - Selected vendor
   * @param {Object} paymentDetails - Payment details
   * @param {Array} requestedVendors - Other vendors who were requested
   * @returns {Promise<void>}
   */
  async sendPaymentNotifications(order, selectedVendor, paymentDetails, requestedVendors) {
    if (!order) {
      return;
    }

    // Notify selected vendor
    if (selectedVendor && selectedVendor.email) {
      await this.sendVendorNotification(
        selectedVendor.email,
        'Payment Received',
        `Payment of ₹${order.payment?.amount?.toLocaleString('en-IN') || '0'} received for order #${order.orderId}`,
        'success',
        {
          orderId: order.orderId,
          amount: order.payment?.amount || 0,
          type: 'payment_received'
        }
      );
    }

    // Notify other vendors that they were not selected
    if (Array.isArray(requestedVendors)) {
      for (const vendor of requestedVendors) {
        if (vendor && vendor.email) {
          const message = vendor.didQuote
            ? `Another vendor was selected for order #${order.orderId}`
            : `Order #${order.orderId} has been assigned to another vendor`;

          await this.sendVendorNotification(
            vendor.email,
            'Order Assigned',
            message,
            'info',
            {
              orderId: order.orderId,
              type: 'order_assigned_to_other'
            }
          );
        }
      }
    }
  }

  /**
   * Send refund notification
   * @param {Object} order - Order object
   * @param {number} amount - Refund amount
   * @returns {Promise<void>}
   */
  async sendRefundNotification(order, amount) {
    if (!order || !order.userEmail) {
      return;
    }

    await this.sendUserNotification(
      order.userEmail,
      'Refund Processed',
      `A refund of ₹${amount.toLocaleString('en-IN')} has been processed for your order #${order.orderId}`,
      'info',
      {
        orderId: order.orderId,
        amount: amount,
        type: 'refund_processed'
      }
    );
  }

  /**
   * Send user inventory verification reminder
   * @param {Object} order - Order object
   * @param {Object} user - User object
   * @returns {Promise<void>}
   */
  async sendUserInventoryVerificationReminder(order, user) {
    if (!order || !user || !user.email || !order.inventoryId) {
      return;
    }

    await this.sendUserNotification(
      user.email,
      'Verify Your Inventory',
      `Please verify the condition of your items for order #${order.orderId}. This helps ensure everything arrived in good condition.`,
      'info',
      {
        orderId: order.orderId,
        inventoryId: order.inventoryId,
        type: 'inventory_verification_reminder'
      }
    );
  }

  /**
   * Send notification about inventory item condition update
   * @param {Object} order - Order details
   * @param {Object} user - User details
   * @param {Object} vendor - Vendor details
   * @param {string} itemName - Name of the item with updated condition
   * @returns {Promise<void>}
   */
  async sendInventoryConditionUpdateNotification(order, user, vendor, itemName) {
    try {
      if (!order || !itemName) {
        return;
      }

      // Notify user
      if (user && user.email) {
        await this.sendUserNotification(
          user.email,
          'Item Condition Updated',
          `The condition of "${itemName}" has been updated for your order #${order.orderId}.`,
          'info',
          {
            orderId: order.orderId,
            inventoryId: order.inventoryId,
            itemName,
            type: 'inventory_condition_update'
          }
        );
      }

      // Notify vendor
      if (vendor && vendor.email) {
        await this.sendVendorNotification(
          vendor.email,
          'Item Condition Updated',
          `The customer has updated the condition of "${itemName}" for order #${order.orderId}.`,
          'info',
          {
            orderId: order.orderId,
            inventoryId: order.inventoryId,
            itemName,
            type: 'inventory_condition_update'
          }
        );
      }

      // Track notification event for user
      await analyticsService.trackEvent('notification_sent', {
        recipientType: 'user',
        userEmail: user.email,
        notificationType: 'inventory_condition_update',
        channel: 'email',
        orderId: order.orderId,
        inventoryId: order.inventoryId,
        itemName: itemName
      });
      
      // Track notification event for vendor
      await analyticsService.trackEvent('notification_sent', {
        recipientType: 'vendor',
        vendorId: vendor.vendorId,
        vendorEmail: vendor.email,
        notificationType: 'inventory_condition_update',
        channel: 'email',
        orderId: order.orderId,
        inventoryId: order.inventoryId,
        itemName: itemName
      });
    } catch (error) {
      console.error('Error sending inventory condition update notification:', error);
    }
  }

  /**
   * Send notification about inventory verification completion
   * @param {Object} order - Order details
   * @param {Object} vendor - Vendor details
   * @returns {Promise<void>}
   */
  async sendInventoryVerificationCompletedNotification(order, vendor) {
    try {
      if (!order || !vendor || !vendor.email) {
        return;
      }

      await this.sendVendorNotification(
        vendor.email,
        'Inventory Verification Completed',
        `The customer has verified the inventory for order #${order.orderId}. You can now mark the order as completed.`,
        'success',
        {
          orderId: order.orderId,
          inventoryId: order.inventoryId,
          type: 'inventory_verification_completed'
        }
      );

      // Track notification event
      await analyticsService.trackEvent('notification_sent', {
        recipientType: 'vendor',
        vendorId: vendor.vendorId,
        vendorEmail: vendor.email,
        notificationType: 'inventory_verification_completed',
        channel: 'email',
        orderId: order.orderId,
        inventoryId: order.inventoryId
      });
    } catch (error) {
      console.error('Error sending inventory verification completed notification:', error);
    }
  }
}

// Export a singleton instance
const notificationService = new NotificationService();
module.exports = { notificationService }; 