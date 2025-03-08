import { NextResponse } from 'next/server';
import { 
  checkAdminAuth, 
  readNotifications,
  VALID_NOTIFICATION_STATUSES,
  VALID_NOTIFICATION_TYPES,
  VALID_RECIPIENT_TYPES,
  VALID_EVENT_TYPES
} from '../utils';

// Calculate time-based metrics
const calculateTimeMetrics = (notifications) => {
  const now = new Date();
  const timeRanges = {
    last1h: new Date(now - 1 * 60 * 60 * 1000),
    last24h: new Date(now - 24 * 60 * 60 * 1000),
    last7d: new Date(now - 7 * 24 * 60 * 60 * 1000),
    last30d: new Date(now - 30 * 24 * 60 * 60 * 1000)
  };

  const metrics = {
    total: 0
  };

  // Initialize counters for each status
  VALID_NOTIFICATION_STATUSES.forEach(status => {
    metrics[status] = 0;
  });

  // Initialize time range metrics
  Object.keys(timeRanges).forEach(range => {
    metrics[range] = {
      total: 0
    };
    VALID_NOTIFICATION_STATUSES.forEach(status => {
      metrics[range][status] = 0;
    });
  });

  notifications.forEach(notification => {
    const sentAt = new Date(notification.sentAt);
    metrics.total++;
    metrics[notification.status]++;

    Object.entries(timeRanges).forEach(([range, date]) => {
      if (sentAt >= date) {
        metrics[range].total++;
        metrics[range][notification.status]++;
      }
    });
  });

  return metrics;
};

// Calculate delivery performance metrics
const calculatePerformanceMetrics = (notifications) => {
  const metrics = {
    averageDeliveryTime: 0,
    medianDeliveryTime: 0,
    successRate: '0%',
    failureRate: '0%',
    resendRate: '0%',
    deliveryTimes: {
      min: 0,
      max: 0,
      p90: 0,
      p95: 0,
      p99: 0
    }
  };

  const deliveryTimes = notifications
    .filter(n => n.status === 'sent' && n.metadata?.deliveredAt)
    .map(n => {
      const sentAt = new Date(n.sentAt);
      const deliveredAt = new Date(n.metadata.deliveredAt);
      return deliveredAt - sentAt;
    })
    .filter(time => time >= 0)
    .sort((a, b) => a - b);

  if (deliveryTimes.length > 0) {
    // Calculate average
    metrics.averageDeliveryTime = 
      Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length);
    
    // Calculate median
    const mid = Math.floor(deliveryTimes.length / 2);
    metrics.medianDeliveryTime = deliveryTimes.length % 2 === 0
      ? Math.round((deliveryTimes[mid - 1] + deliveryTimes[mid]) / 2)
      : deliveryTimes[mid];
    
    // Calculate percentiles
    metrics.deliveryTimes = {
      min: deliveryTimes[0],
      max: deliveryTimes[deliveryTimes.length - 1],
      p90: deliveryTimes[Math.floor(deliveryTimes.length * 0.9)],
      p95: deliveryTimes[Math.floor(deliveryTimes.length * 0.95)],
      p99: deliveryTimes[Math.floor(deliveryTimes.length * 0.99)]
    };
  }

  if (notifications.length > 0) {
    const successfulCount = notifications.filter(n => n.status === 'sent').length;
    const failedCount = notifications.filter(n => n.status === 'failed').length;
    const resendCount = notifications.filter(n => n.metadata?.resendOf).length;

    metrics.successRate = (successfulCount / notifications.length * 100).toFixed(2) + '%';
    metrics.failureRate = (failedCount / notifications.length * 100).toFixed(2) + '%';
    metrics.resendRate = (resendCount / notifications.length * 100).toFixed(2) + '%';
  }

  return metrics;
};

// Calculate pattern metrics
const calculatePatternMetrics = (notifications) => {
  const metrics = {
    byType: {},
    byRecipientType: {},
    byEventType: {},
    hourlyActivity: Array(24).fill(0),
    dailyActivity: {},
    mostCommonTypes: [],
    mostCommonRecipients: [],
    peakActivityHours: [],
    quietHours: []
  };

  // Initialize counters
  VALID_NOTIFICATION_TYPES.forEach(type => metrics.byType[type] = 0);
  VALID_RECIPIENT_TYPES.forEach(type => metrics.byRecipientType[type] = 0);
  VALID_EVENT_TYPES.forEach(type => metrics.byEventType[type] = 0);

  notifications.forEach(notification => {
    // Count by type
    metrics.byType[notification.type]++;
    
    // Count by recipient type
    metrics.byRecipientType[notification.recipientType]++;
    
    // Count by event type
    metrics.byEventType[notification.eventType]++;
    
    // Track hourly activity
    const sentAt = new Date(notification.sentAt);
    const hour = sentAt.getHours();
    metrics.hourlyActivity[hour]++;
    
    // Track daily activity
    const dateKey = sentAt.toISOString().split('T')[0];
    metrics.dailyActivity[dateKey] = (metrics.dailyActivity[dateKey] || 0) + 1;
  });

  // Calculate most common types
  metrics.mostCommonTypes = Object.entries(metrics.byType)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  metrics.mostCommonRecipients = Object.entries(metrics.byRecipientType)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  // Find peak and quiet hours
  const maxActivity = Math.max(...metrics.hourlyActivity);
  const minActivity = Math.min(...metrics.hourlyActivity);

  metrics.peakActivityHours = metrics.hourlyActivity
    .map((count, hour) => ({ hour, count }))
    .filter(({ count }) => count === maxActivity);

  metrics.quietHours = metrics.hourlyActivity
    .map((count, hour) => ({ hour, count }))
    .filter(({ count }) => count === minActivity);

  return metrics;
};

// GET notification statistics
export async function GET(request) {
  try {
    // Check admin authentication
    const authResult = await checkAdminAuth();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get notifications from storage
    const { notifications, error: readError } = await readNotifications();
    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: readError.status });
    }

    // Calculate all metrics
    const timeMetrics = calculateTimeMetrics(notifications);
    const performanceMetrics = calculatePerformanceMetrics(notifications);
    const patternMetrics = calculatePatternMetrics(notifications);

    // Combine all metrics
    const stats = {
      overview: {
        total: notifications.length,
        ...timeMetrics
      },
      performance: performanceMetrics,
      patterns: patternMetrics,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching notification statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 