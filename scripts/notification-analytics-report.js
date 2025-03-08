const { storage } = require('../lib/storage');
const fs = require('fs/promises');
const path = require('path');

const REPORT_PATH = process.env.REPORT_PATH || path.join(process.cwd(), 'reports');

/**
 * Generate a notification analytics report
 */
async function generateNotificationAnalyticsReport() {
  try {
    // Create reports directory if it doesn't exist
    try {
      await fs.access(REPORT_PATH);
    } catch (error) {
      await fs.mkdir(REPORT_PATH, { recursive: true });
      console.log(`Created reports directory at ${REPORT_PATH}`);
    }

    // Read analytics events
    const events = await storage.readData('analytics_events.json') || [];
    
    // Filter notification events
    const notificationEvents = events.filter(event => 
      event.eventType === 'notification_sent'
    );
    
    if (notificationEvents.length === 0) {
      console.log('No notification events found');
      return;
    }
    
    // Group by notification type
    const byNotificationType = {};
    notificationEvents.forEach(event => {
      const type = event.eventData.notificationType || 'unknown';
      if (!byNotificationType[type]) {
        byNotificationType[type] = [];
      }
      byNotificationType[type].push(event);
    });
    
    // Group by channel
    const byChannel = {};
    notificationEvents.forEach(event => {
      const channel = event.eventData.channel || 'unknown';
      if (!byChannel[channel]) {
        byChannel[channel] = [];
      }
      byChannel[channel].push(event);
    });
    
    // Group by recipient type
    const byRecipientType = {};
    notificationEvents.forEach(event => {
      const recipientType = event.eventData.recipientType || 'unknown';
      if (!byRecipientType[recipientType]) {
        byRecipientType[recipientType] = [];
      }
      byRecipientType[recipientType].push(event);
    });
    
    // Calculate statistics
    const totalNotifications = notificationEvents.length;
    const notificationTypeStats = Object.entries(byNotificationType).map(([type, events]) => ({
      type,
      count: events.length,
      percentage: ((events.length / totalNotifications) * 100).toFixed(2)
    }));
    
    const channelStats = Object.entries(byChannel).map(([channel, events]) => ({
      channel,
      count: events.length,
      percentage: ((events.length / totalNotifications) * 100).toFixed(2)
    }));
    
    const recipientTypeStats = Object.entries(byRecipientType).map(([type, events]) => ({
      type,
      count: events.length,
      percentage: ((events.length / totalNotifications) * 100).toFixed(2)
    }));
    
    // Create report
    const report = {
      generatedAt: new Date().toISOString(),
      totalNotifications,
      byNotificationType: notificationTypeStats.sort((a, b) => b.count - a.count),
      byChannel: channelStats.sort((a, b) => b.count - a.count),
      byRecipientType: recipientTypeStats.sort((a, b) => b.count - a.count)
    };
    
    // Write report to file
    const reportFilePath = path.join(REPORT_PATH, `notification-analytics-${new Date().toISOString().split('T')[0]}.json`);
    await fs.writeFile(reportFilePath, JSON.stringify(report, null, 2));
    
    console.log(`Report generated at ${reportFilePath}`);
    console.log(`Total notifications: ${totalNotifications}`);
    console.log('\nTop notification types:');
    notificationTypeStats.sort((a, b) => b.count - a.count).slice(0, 5).forEach(stat => {
      console.log(`- ${stat.type}: ${stat.count} (${stat.percentage}%)`);
    });
    
    console.log('\nChannel distribution:');
    channelStats.forEach(stat => {
      console.log(`- ${stat.channel}: ${stat.count} (${stat.percentage}%)`);
    });
    
    console.log('\nRecipient type distribution:');
    recipientTypeStats.forEach(stat => {
      console.log(`- ${stat.type}: ${stat.count} (${stat.percentage}%)`);
    });
    
  } catch (error) {
    console.error('Error generating notification analytics report:', error);
  }
}

// Run the report generation
generateNotificationAnalyticsReport(); 