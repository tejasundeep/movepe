import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { analyticsService } from '../../lib/services/analyticsService';
import { storage } from '../../lib/storage';
import { withRateLimit } from '../../lib/middleware/rateLimitMiddleware';

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
      const orders = await storage.readData('orders.json') || [];
      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(order => ({
          orderId: order.orderId,
          userEmail: order.userEmail,
          status: order.status,
          createdAt: order.createdAt,
          moveDate: order.moveDate,
          moveSize: order.moveSize,
          selectedVendorId: order.selectedVendorId,
          payment: order.payment ? {
            amount: order.payment.amount,
            status: order.payment.status
          } : null
        }));
      
      // Get pending vendor approvals
      const vendors = await storage.readData('vendors.json') || [];
      const pendingApprovals = vendors
        .filter(v => v.status === 'Pending')
        .map(vendor => ({
          vendorId: vendor.vendorId,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          createdAt: vendor.createdAt
        }));
      
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
        activeOrdersCount: orders.filter(o => 
          o.status === 'Paid' || 
          o.status === 'In Progress' || 
          o.status === 'In Transit' || 
          o.status === 'Delivered'
        ).length
      });
    } else if (session.user?.role === 'vendor') {
      // Get vendor dashboard data
      const vendors = await storage.readData('vendors.json');
      const vendor = vendors.find(v => v.email === session.user.email);
      
      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }
      
      const vendorId = vendor.vendorId;
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
      const orders = await storage.readData('orders.json') || [];
      const userOrders = orders.filter(o => o.userEmail === userEmail);
      
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
      const recentOrders = userOrders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      // Get orders requiring inventory verification
      const ordersNeedingVerification = userOrders.filter(o => {
        if (o.status !== 'Delivered') return false;
        
        // Check if inventory exists and needs verification
        const inventories = storage.readData('inventories.json') || [];
        const inventory = inventories.find(inv => inv.orderId === o.orderId);
        return inventory && inventory.status !== 'Verified';
      });
      
      return NextResponse.json({
        userInfo: {
          email: userEmail,
          totalOrders: userOrders.length,
          activeOrdersCount: activeOrders.length,
          completedOrdersCount: completedOrders.length
        },
        activeOrders: activeOrders.map(order => ({
          orderId: order.orderId,
          status: order.status,
          createdAt: order.createdAt,
          moveDate: order.moveDate,
          moveSize: order.moveSize,
          pickupPincode: order.pickupPincode,
          destinationPincode: order.destinationPincode,
          selectedVendorName: order.selectedVendorName
        })),
        recentOrders: recentOrders.map(order => ({
          orderId: order.orderId,
          status: order.status,
          createdAt: order.createdAt,
          moveDate: order.moveDate,
          moveSize: order.moveSize,
          pickupPincode: order.pickupPincode,
          destinationPincode: order.destinationPincode,
          selectedVendorName: order.selectedVendorName
        })),
        ordersNeedingVerification: ordersNeedingVerification.map(order => ({
          orderId: order.orderId,
          moveDate: order.moveDate,
          deliveryDate: order.deliveryDate || order.moveDate,
          selectedVendorName: order.selectedVendorName
        }))
      });
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
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