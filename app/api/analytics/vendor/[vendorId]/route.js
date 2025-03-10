export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { analyticsService } from '../../../../../lib/services/analyticsService';
import { vendorStorage } from '../../../../../lib/storage';
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware';

/**
 * GET /api/analytics/vendor/[vendorId]
 * Get vendor-specific analytics
 */
async function getVendorAnalytics(request, { params }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const vendorId = params.vendorId;
    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const metric = searchParams.get('metric');
    
    // Check authorization - only admin or the vendor themselves can access
    const isAdmin = session.user.role === 'admin';
    const isVendor = session.user.role === 'vendor';
    
    // If user is a vendor, verify they are requesting their own data
    if (isVendor) {
      const vendor = await vendorStorage.getByEmail(session.user.email);
      if (!vendor || vendor.id !== vendorId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get vendor analytics based on requested metric
    let result;
    
    switch (metric) {
      case 'performance':
        result = await analyticsService.getVendorPerformanceMetrics(vendorId);
        break;
      case 'orders':
        result = await analyticsService.getVendorOrders(vendorId, startDate, endDate);
        break;
      case 'reviews':
        result = await analyticsService.getVendorReviews(vendorId);
        break;
      case 'leads':
        result = await analyticsService.getVendorLeads(vendorId, startDate, endDate);
        break;
      case 'earnings':
        result = await analyticsService.getVendorEarnings(vendorId, startDate, endDate);
        break;
      default:
        // If no specific metric requested, return all metrics
        const performance = await analyticsService.getVendorPerformanceMetrics(vendorId);
        const orders = await analyticsService.getVendorOrders(vendorId, startDate, endDate);
        const reviews = await analyticsService.getVendorReviews(vendorId);
        const leads = await analyticsService.getVendorLeads(vendorId, startDate, endDate);
        const earnings = await analyticsService.getVendorEarnings(vendorId, startDate, endDate);
        
        result = {
          performance,
          orders,
          reviews,
          leads,
          earnings
        };
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching vendor analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor analytics' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getVendorAnalytics, 'analytics'); 