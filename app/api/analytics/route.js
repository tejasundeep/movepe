import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { analyticsService } from '../../../lib/services/analyticsService';
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware';

/**
 * GET /api/analytics
 * Get business overview metrics
 */
async function getAnalytics(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const metric = searchParams.get('metric');
    const interval = searchParams.get('interval');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 30;
    
    // Validate user role for admin-only metrics
    const isAdmin = session.user?.role === 'admin';
    if (!isAdmin && ['vendor_performance', 'customer_insights', 'popular_routes'].includes(metric)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    let result;
    
    // Return different metrics based on the metric parameter
    switch (metric) {
      case 'order_trends':
        result = await analyticsService.getOrderTrends(interval || 'day', limit);
        break;
      case 'vendor_performance':
        result = await analyticsService.getVendorPerformanceMetrics();
        break;
      case 'customer_insights':
        result = await analyticsService.getCustomerInsights();
        break;
      case 'popular_routes':
        result = await analyticsService.getPopularMoveRoutes();
        break;
      default:
        // Default to business overview
        result = await analyticsService.getBusinessOverview(startDate, endDate);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics
 * Track custom events
 */
async function trackEvent(request) {
  try {
    // Session is optional for event tracking, but if present we'll associate the event with the user
    const session = await getServerSession(authOptions);
    
    // Parse request body
    const body = await request.json();
    const { eventType, eventData } = body;
    
    // Validate required fields
    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }
    
    // Track the event
    await analyticsService.trackEvent(
      eventType,
      eventData || {},
      session?.user.email
    );
    
    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getAnalytics, 'analytics');
export const POST = withRateLimit(trackEvent, 'analytics'); 