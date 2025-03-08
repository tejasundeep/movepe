import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { storage } from '../../../../lib/storage';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

/**
 * GET handler for notification analytics
 * @param {Request} request - The request object
 * @returns {Promise<NextResponse>} - The response object
 */
async function getNotificationAnalytics(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    const channel = searchParams.get('channel');
    const recipientType = searchParams.get('recipientType');

    // Read analytics events
    const events = await storage.readData('analytics_events.json') || [];
    
    // Filter notification events
    let notificationEvents = events.filter(event => 
      event.eventType === 'notification_sent'
    );
    
    // Apply date filters if provided
    if (startDate) {
      const start = new Date(startDate);
      notificationEvents = notificationEvents.filter(event => 
        new Date(event.timestamp) >= start
      );
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      notificationEvents = notificationEvents.filter(event => 
        new Date(event.timestamp) <= end
      );
    }
    
    // Apply type filter if provided
    if (type) {
      notificationEvents = notificationEvents.filter(event => 
        event.eventData.notificationType === type
      );
    }
    
    // Apply channel filter if provided
    if (channel) {
      notificationEvents = notificationEvents.filter(event => 
        event.eventData.channel === channel
      );
    }
    
    // Apply recipient type filter if provided
    if (recipientType) {
      notificationEvents = notificationEvents.filter(event => 
        event.eventData.recipientType === recipientType
      );
    }
    
    // Group by notification type, channel, and recipient type
    const byNotificationType = {};
    const byChannel = {};
    const byRecipientType = {};
    
    notificationEvents.forEach(event => {
      const notificationType = event.eventData.notificationType || 'unknown';
      if (!byNotificationType[notificationType]) {
        byNotificationType[notificationType] = [];
      }
      byNotificationType[notificationType].push(event);
      
      const channel = event.eventData.channel || 'unknown';
      if (!byChannel[channel]) {
        byChannel[channel] = [];
      }
      byChannel[channel].push(event);
      
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
    
    // Create response
    const response = {
      totalNotifications,
      byNotificationType: notificationTypeStats.sort((a, b) => b.count - a.count),
      byChannel: channelStats.sort((a, b) => b.count - a.count),
      byRecipientType: recipientTypeStats.sort((a, b) => b.count - a.count),
      // Include the first 100 events for detailed analysis
      recentEvents: notificationEvents
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 100)
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getNotificationAnalytics, 'analytics'); 