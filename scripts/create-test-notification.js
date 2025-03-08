const { storage } = require('../lib/storage');

/**
 * Create test notification events
 */
async function createTestNotificationEvents() {
  try {
    console.log('Creating test notification events...');
    
    // Create sample notification events
    const testEvents = [
      {
        eventType: 'notification_sent',
        eventData: {
          recipientType: 'user',
          userEmail: 'test@example.com',
          notificationType: 'order_status_update',
          channel: 'email',
          orderId: 'ORD12345',
          newStatus: 'In Progress'
        },
        timestamp: new Date().toISOString()
      },
      {
        eventType: 'notification_sent',
        eventData: {
          recipientType: 'vendor',
          vendorId: 'V12345',
          vendorEmail: 'vendor@example.com',
          notificationType: 'quote_request',
          channel: 'email',
          orderId: 'ORD12345'
        },
        timestamp: new Date().toISOString()
      },
      {
        eventType: 'notification_sent',
        eventData: {
          recipientType: 'user',
          userEmail: 'test@example.com',
          notificationType: 'payment_received',
          channel: 'sms',
          orderId: 'ORD12345',
          paymentAmount: 5000
        },
        timestamp: new Date().toISOString()
      },
      {
        eventType: 'notification_sent',
        eventData: {
          recipientType: 'vendor',
          vendorId: 'V12345',
          vendorEmail: 'vendor@example.com',
          notificationType: 'payment_received',
          channel: 'whatsapp',
          orderId: 'ORD12345',
          paymentAmount: 5000
        },
        timestamp: new Date().toISOString()
      },
      {
        eventType: 'notification_sent',
        eventData: {
          recipientType: 'user',
          userEmail: 'test@example.com',
          notificationType: 'inventory_condition_update',
          channel: 'in_app',
          orderId: 'ORD12345',
          inventoryId: 'INV12345',
          itemName: 'Sofa'
        },
        timestamp: new Date().toISOString()
      }
    ];
    
    // Add events to analytics_events.json
    await storage.updateData('analytics_events.json', (events) => {
      return [...(events || []), ...testEvents];
    });
    
    console.log(`Added ${testEvents.length} test notification events to analytics_events.json`);
  } catch (error) {
    console.error('Error creating test notification events:', error);
  }
}

// Run the function
createTestNotificationEvents(); 