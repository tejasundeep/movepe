import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { analyticsService } from '../../../lib/services/analyticsService';
import { orderStorage, vendorStorage, userStorage, inventoryStorage } from '../../../lib/storage';
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard
 * Get dashboard data for admin or vendor
 */
async function getDashboard(request) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Determine user role
    const isAdmin = session.user?.role === 'admin';
    const vendorId = session.user?.vendorId;
    
    // Get data based on role
    if (isAdmin) {
      // Get admin dashboard data
      const businessOverview = await analyticsService.getBusinessOverview(startDate, endDate);
      const orderTrends = await analyticsService.getOrderTrends('day', 30);
      const vendorPerformance = await analyticsService.getVendorPerformanceMetrics();
      const customerInsights = await analyticsService.getCustomerInsights();
      const popularRoutes = await analyticsService.getPopularMoveRoutes();
      
      // Get notification analytics
      const notificationAnalytics = await getNotificationAnalyticsSummary(startDate, endDate);
      
      // Get recent orders
      const recentOrders = await orderStorage.getRecentOrders(10);
      
      // Get pending vendor approvals
      const pendingApprovals = await vendorStorage.getPendingApprovals();
      
      // Get active orders count
      const activeOrdersCount = await orderStorage.getActiveOrdersCount();
      
      return NextResponse.json({
        businessOverview,
        orderTrends,
        topVendors: vendorPerformance
          .sort((a, b) => b.metrics.totalOrders - a.metrics.totalOrders)
          .slice(0, 5),
        customerInsights,
        popularRoutes,
        notificationAnalytics,
        recentOrders,
        pendingApprovals,
        pendingApprovalsCount: pendingApprovals.length,
        activeOrdersCount
      });
    } else if (session.user?.role === 'vendor') {
      // Get vendor dashboard data
      const vendor = await vendorStorage.getByEmail(session.user.email);
      
      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }
      
      const vendorId = vendor.id;
      const vendorPerformance = await analyticsService.getVendorPerformanceMetrics(vendorId);
      const vendorOrders = await analyticsService.getVendorOrders(vendorId, startDate, endDate);
      const vendorReviews = await analyticsService.getVendorReviews(vendorId);
      const vendorLeads = await analyticsService.getVendorLeads(vendorId, startDate, endDate);
      
      return NextResponse.json({
        vendorPerformance,
        vendorOrders,
        vendorReviews,
        vendorLeads
      });
    } else {
      // Regular user dashboard
      const userEmail = session.user?.email;
      if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }
      
      // Get user orders
      const userOrders = await orderStorage.getByUserEmail(userEmail);
      
      // Get active orders
      const activeOrders = userOrders.filter(o => 
        o.status === 'Paid' || 
        o.status === 'In Progress' || 
        o.status === 'In Transit' || 
        o.status === 'Delivered'
      );
      
      // Get completed orders
      const completedOrders = userOrders.filter(o => 
        o.status === 'Completed' || o.status === 'Reviewed' || o.status === 'Closed'
      );
      
      // Get recent orders
      const recentOrders = [...userOrders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      // Get orders requiring inventory verification
      const ordersNeedingVerification = [];
      for (const order of userOrders) {
        if (order.status !== 'Delivered') continue;
        
        // Check if inventory exists and needs verification
        const inventory = await inventoryStorage.getByOrderId(order.id);
        if (inventory && inventory.status !== 'Verified') {
          ordersNeedingVerification.push(order);
        }
      }
      
      // Get pending quotes
      const pendingQuotes = userOrders.filter(o => 
        o.status === 'QuoteRequested' && 
        (o.quotes && o.quotes.length > 0)
      );
      
      return NextResponse.json({
        activeOrders,
        completedOrders,
        recentOrders,
        ordersNeedingVerification,
        pendingQuotes,
        stats: {
          totalOrders: userOrders.length,
          activeOrders: activeOrders.length,
          completedOrders: completedOrders.length,
          pendingQuotes: pendingQuotes.length,
          ordersNeedingVerification: ordersNeedingVerification.length
        }
      });
    }
  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getDashboard, 'analytics');

/**
 * Get notification analytics summary for dashboard
 * @param {string} startDate - Start date (ISO string)
 * @param {string} endDate - End date (ISO string)
 * @returns {Promise<Object>} - Notification analytics summary
 */
async function getNotificationAnalyticsSummary(startDate, endDate) {
  try {
    // Get notification events from analytics service
    const notificationEvents = await analyticsService.getNotificationEvents(startDate, endDate);
    
    if (!notificationEvents || notificationEvents.length === 0) {
      return {
        totalNotifications: 0,
        recentNotifications: 0,
        dailyAverage: 0,
        topNotificationTypes: [],
        channelDistribution: [],
        recipientDistribution: []
      };
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
    const notificationTypeStats = Object.entries(byNotificationType)
      .map(([type, events]) => ({
        type,
        count: events.length,
        percentage: ((events.length / totalNotifications) * 100).toFixed(2)
      }))
      .sort((a, b) => b.count - a.count);
    
    const channelStats = Object.entries(byChannel)
      .map(([channel, events]) => ({
        channel,
        count: events.length,
        percentage: ((events.length / totalNotifications) * 100).toFixed(2)
      }))
      .sort((a, b) => b.count - a.count);
    
    const recipientTypeStats = Object.entries(byRecipientType)
      .map(([type, events]) => ({
        type,
        count: events.length,
        percentage: ((events.length / totalNotifications) * 100).toFixed(2)
      }))
      .sort((a, b) => b.count - a.count);
    
    // Get recent notifications (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentNotifications = notificationEvents
      .filter(event => new Date(event.timestamp) >= oneWeekAgo)
      .length;
    
    // Calculate daily average
    const dailyAverage = recentNotifications / 7;
    
    return {
      totalNotifications,
      recentNotifications,
      dailyAverage: dailyAverage.toFixed(2),
      topNotificationTypes: notificationTypeStats.slice(0, 5),
      channelDistribution: channelStats,
      recipientDistribution: recipientTypeStats
    };
  } catch (error) {
    console.error('Error getting notification analytics summary:', error);
    return {
      totalNotifications: 0,
      recentNotifications: 0,
      dailyAverage: 0,
      topNotificationTypes: [],
      channelDistribution: [],
      recipientDistribution: []
    };
  }
} 