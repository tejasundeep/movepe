export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { analyticsService } from '../../../../lib/services/analyticsService';
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

    // Get notification events from analytics service
    const notificationEvents = await analyticsService.getNotificationEvents(
      startDate, 
      endDate, 
      type, 
      channel, 
      recipientType
    );
    
    if (!notificationEvents || notificationEvents.length === 0) {
      return NextResponse.json({
        totalNotifications: 0,
        byNotificationType: {},
        byChannel: {},
        byRecipientType: {},
        byDate: {},
        deliveryStats: {
          success: 0,
          failure: 0,
          successRate: 0
        }
      });
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
    
    // Group by date for time series
    const byDate = {};
    notificationEvents.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = [];
      }
      byDate[date].push(event);
    });
    
    // Calculate delivery statistics
    const successCount = notificationEvents.filter(event => 
      event.eventData.status === 'success'
    ).length;
    
    const failureCount = notificationEvents.filter(event => 
      event.eventData.status === 'failure'
    ).length;
    
    const successRate = notificationEvents.length > 0 
      ? (successCount / notificationEvents.length) * 100 
      : 0;
    
    // Format response
    const response = {
      totalNotifications: notificationEvents.length,
      byNotificationType: Object.fromEntries(
        Object.entries(byNotificationType).map(([type, events]) => [
          type,
          {
            count: events.length,
            percentage: (events.length / notificationEvents.length * 100).toFixed(2)
          }
        ])
      ),
      byChannel: Object.fromEntries(
        Object.entries(byChannel).map(([channel, events]) => [
          channel,
          {
            count: events.length,
            percentage: (events.length / notificationEvents.length * 100).toFixed(2)
          }
        ])
      ),
      byRecipientType: Object.fromEntries(
        Object.entries(byRecipientType).map(([type, events]) => [
          type,
          {
            count: events.length,
            percentage: (events.length / notificationEvents.length * 100).toFixed(2)
          }
        ])
      ),
      byDate: Object.fromEntries(
        Object.entries(byDate).map(([date, events]) => [
          date,
          events.length
        ])
      ),
      deliveryStats: {
        success: successCount,
        failure: failureCount,
        successRate: successRate.toFixed(2)
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification analytics' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getNotificationAnalytics, 'analytics'); 