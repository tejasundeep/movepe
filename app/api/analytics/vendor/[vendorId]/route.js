export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { analyticsService } from '../../../../../lib/services/analyticsService';
import { storage } from '../../../../../lib/storage';
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
    
    // Verify user has access to this vendor's data
    const isAdmin = session.user?.role === 'admin';
    const isVendorOwner = session.user?.vendorId === vendorId;
    
    if (!isAdmin && !isVendorOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not have access to this vendor data' }, { status: 403 });
    }
    
    // Get vendor details
    const vendors = await storage.readData('vendors.json');
    const vendor = vendors.find(v => v.vendorId === vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    // Get orders for this vendor
    const orders = await storage.readData('orders.json') || [];
    const vendorOrders = orders.filter(o => o.selectedVendorId === vendorId);
    
    // Filter by date range if provided
    let filteredOrders = vendorOrders;
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      
      filteredOrders = vendorOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });
    }
    
    // Calculate metrics
    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(o => 
      o.status === 'Completed' || o.status === 'Reviewed' || o.status === 'Closed'
    ).length;
    const cancelledOrders = filteredOrders.filter(o => o.status === 'Cancelled').length;
    const activeOrders = filteredOrders.filter(o => 
      o.status === 'Paid' || 
      o.status === 'In Progress' || 
      o.status === 'In Transit' || 
      o.status === 'Delivered'
    );
    
    // Calculate revenue
    const revenue = filteredOrders.reduce((sum, order) => {
      if (order.payment && order.payment.amount) {
        return sum + order.payment.amount;
      }
      return sum;
    }, 0);
    
    // Calculate commission
    const commissionRate = vendor.tier ? analyticsService.getCommissionRateByTier(vendor.tier) : 15;
    const commission = revenue * (commissionRate / 100);
    const vendorEarnings = revenue - commission;
    
    // Get monthly trends
    const monthlyTrends = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) { // Last 6 months
      const month = new Date(now);
      month.setMonth(month.getMonth() - i);
      month.setDate(1); // First day of month
      month.setHours(0, 0, 0, 0);
      
      const nextMonth = new Date(month);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const monthOrders = vendorOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= month && orderDate < nextMonth;
      });
      
      const monthRevenue = monthOrders.reduce((sum, order) => {
        if (order.payment && order.payment.amount) {
          return sum + order.payment.amount;
        }
        return sum;
      }, 0);
      
      const monthEarnings = monthRevenue - (monthRevenue * (commissionRate / 100));
      
      monthlyTrends.push({
        month: month.toLocaleString('default', { month: 'short', year: 'numeric' }),
        orders: monthOrders.length,
        revenue: monthRevenue,
        earnings: monthEarnings
      });
    }
    
    // Reverse to get chronological order
    monthlyTrends.reverse();
    
    // Get reviews
    const reviews = [];
    for (const order of vendorOrders) {
      if (order.review) {
        reviews.push({
          reviewId: order.review.id,
          orderId: order.orderId,
          rating: order.review.rating,
          comment: order.review.comment,
          createdAt: order.review.createdAt,
          vendorResponse: order.review.vendorResponse
        });
      }
    }
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    // Get rating distribution
    const ratingDistribution = {
      1: reviews.filter(r => r.rating === 1).length,
      2: reviews.filter(r => r.rating === 2).length,
      3: reviews.filter(r => r.rating === 3).length,
      4: reviews.filter(r => r.rating === 4).length,
      5: reviews.filter(r => r.rating === 5).length
    };
    
    // Get response rate
    const responseRate = reviews.length > 0 
      ? (reviews.filter(r => r.vendorResponse).length / reviews.length) * 100 
      : 0;
    
    return NextResponse.json({
      vendorInfo: {
        vendorId: vendor.vendorId,
        name: vendor.name,
        tier: vendor.tier || 'Bronze',
        rating: averageRating,
        reviewCount: reviews.length,
        availability: vendor.availability || 'available'
      },
      metrics: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        activeOrdersCount: activeOrders.length,
        revenue,
        commission,
        vendorEarnings,
        commissionRate
      },
      monthlyTrends,
      reviews: {
        averageRating,
        totalReviews: reviews.length,
        ratingDistribution,
        responseRate,
        recentReviews: reviews
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      }
    });
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