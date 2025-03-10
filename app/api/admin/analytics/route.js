export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { userStorage, vendorStorage, orderStorage, analyticsStorage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { analyticsService } from '../../../../lib/services/analyticsService';

export async function GET(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get the time range from query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'month';

    // Get data from storage
    const users = await userStorage.getAll();
    const vendors = await vendorStorage.getAll();
    const orders = await orderStorage.getAll();
    const events = await analyticsStorage.getAll();

    // Calculate time thresholds based on timeRange
    const now = new Date();
    let timeThreshold;
    
    switch(timeRange) {
      case 'week':
        timeThreshold = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'year':
        timeThreshold = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case 'month':
      default:
        timeThreshold = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    // Calculate user statistics
    const totalUsers = users.filter(user => user.role === 'user').length;
    const newUsersThisMonth = users.filter(
      user => user.role === 'user' && new Date(user.createdAt) > timeThreshold
    ).length;
    
    // Calculate vendor statistics
    const totalVendors = vendors.length;
    const newVendorsThisMonth = vendors.filter(
      vendor => new Date(vendor.createdAt) > timeThreshold
    ).length;
    const pendingVendors = vendors.filter(vendor => vendor.status === 'Pending').length;
    
    // Calculate order statistics
    const totalOrders = orders.length;
    const newOrdersThisMonth = orders.filter(
      order => new Date(order.createdAt) > timeThreshold
    ).length;
    const completedOrders = orders.filter(
      order => order.status === 'Completed' || order.status === 'Reviewed'
    ).length;
    const cancelledOrders = orders.filter(order => order.status === 'Cancelled').length;
    
    // Calculate revenue
    const totalRevenue = orders.reduce((sum, order) => {
      if (order.payment && order.payment.amount) {
        return sum + order.payment.amount;
      }
      return sum;
    }, 0);
    
    const revenueThisMonth = orders
      .filter(order => new Date(order.createdAt) > timeThreshold)
      .reduce((sum, order) => {
        if (order.payment && order.payment.amount) {
          return sum + order.payment.amount;
        }
        return sum;
      }, 0);
    
    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate user engagement
    const userEngagement = events
      .filter(event => 
        event.eventType === 'page_view' && 
        new Date(event.timestamp) > timeThreshold
      )
      .reduce((acc, event) => {
        const userEmail = event.userEmail || 'anonymous';
        acc[userEmail] = (acc[userEmail] || 0) + 1;
        return acc;
      }, {});
    
    const activeUsers = Object.keys(userEngagement).length;
    
    // Calculate popular pages
    const popularPages = events
      .filter(event => 
        event.eventType === 'page_view' && 
        new Date(event.timestamp) > timeThreshold
      )
      .reduce((acc, event) => {
        const page = event.eventData.page || 'unknown';
        acc[page] = (acc[page] || 0) + 1;
        return acc;
      }, {});
    
    // Format popular pages for response
    const formattedPopularPages = Object.entries(popularPages)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
    
    // Calculate order status distribution
    const orderStatusDistribution = orders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate monthly trends
    const monthlyTrends = await analyticsService.getMonthlyTrends();
    
    return NextResponse.json({
      userStats: {
        totalUsers,
        newUsersThisMonth,
        activeUsers
      },
      vendorStats: {
        totalVendors,
        newVendorsThisMonth,
        pendingVendors
      },
      orderStats: {
        totalOrders,
        newOrdersThisMonth,
        completedOrders,
        cancelledOrders,
        orderStatusDistribution
      },
      financialStats: {
        totalRevenue,
        revenueThisMonth,
        averageOrderValue
      },
      engagementStats: {
        popularPages: formattedPopularPages
      },
      trends: monthlyTrends
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
} 