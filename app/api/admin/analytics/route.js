export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { storage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

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
    const users = await storage.readData('users.json') || [];
    const vendors = await storage.readData('vendors.json') || [];
    const orders = await storage.readData('orders.json') || [];
    const events = await storage.readData('analytics_events.json') || [];

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

    // Calculate order statistics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => 
      order.status === 'Completed' || order.status === 'Paid'
    ).length;
    const inProgressOrders = orders.filter(order => 
      order.status === 'InProgress'
    ).length;
    const cancelledOrders = orders.filter(order => 
      order.status === 'Cancelled'
    ).length;

    // Calculate revenue statistics (mock data for now)
    // In a real app, this would be calculated from actual payment records
    const totalRevenue = orders.reduce((sum, order) => {
      if (order.status === 'Paid' && order.paymentAmount) {
        return sum + order.paymentAmount;
      }
      return sum;
    }, 0);

    const thisMonthRevenue = orders.reduce((sum, order) => {
      if (order.status === 'Paid' && order.paymentAmount && new Date(order.paidAt || order.updatedAt) > timeThreshold) {
        return sum + order.paymentAmount;
      }
      return sum;
    }, 0);

    // Calculate top vendors
    const vendorOrderCounts = {};
    const vendorRevenue = {};
    
    orders.forEach(order => {
      if (order.selectedVendorId) {
        // Count orders per vendor
        vendorOrderCounts[order.selectedVendorId] = (vendorOrderCounts[order.selectedVendorId] || 0) + 1;
        
        // Sum revenue per vendor
        if (order.status === 'Paid' && order.paymentAmount) {
          vendorRevenue[order.selectedVendorId] = (vendorRevenue[order.selectedVendorId] || 0) + order.paymentAmount;
        }
      }
    });
    
    const topVendors = vendors
      .map(vendor => ({
        vendorId: vendor.vendorId,
        name: vendor.name,
        orderCount: vendorOrderCounts[vendor.vendorId] || 0,
        revenue: vendorRevenue[vendor.vendorId] || 0,
        rating: vendor.rating || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Get recent events
    const recentEvents = events
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    // Prepare response
    const analyticsData = {
      userStats: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        activeUsers: Math.floor(totalUsers * 0.7) // Mock data
      },
      vendorStats: {
        total: totalVendors,
        newThisMonth: newVendorsThisMonth,
        activeVendors: Math.floor(totalVendors * 0.8) // Mock data
      },
      orderStats: {
        total: totalOrders,
        completed: completedOrders,
        inProgress: inProgressOrders,
        cancelled: cancelledOrders
      },
      revenueStats: {
        total: totalRevenue || 250000, // Mock data if no real data
        thisMonth: thisMonthRevenue || 45000, // Mock data if no real data
        lastMonth: 38000 // Mock data
      },
      topVendors: topVendors.length > 0 ? topVendors : [
        // Mock data if no real data
        { name: "Packers & Movers Co.", orderCount: 28, revenue: 120000, rating: 4.8 },
        { name: "Swift Movers", orderCount: 22, revenue: 95000, rating: 4.6 },
        { name: "City Shifters", orderCount: 19, revenue: 82000, rating: 4.5 },
        { name: "Safe Transport Ltd.", orderCount: 15, revenue: 65000, rating: 4.3 },
        { name: "Home Relocators", orderCount: 12, revenue: 52000, rating: 4.2 }
      ],
      recentEvents: recentEvents.length > 0 ? recentEvents : [
        // Mock data if no real data
        { type: "order_created", details: "New order #12345 created by user@example.com", timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
        { type: "payment_received", details: "Payment of ₹15,000 received for order #12340", timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
        { type: "user_registered", details: "New user registered: newuser@example.com", timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
        { type: "order_completed", details: "Order #12335 marked as completed", timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
        { type: "vendor_registered", details: "New vendor registered: vendor@example.com", timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString() }
      ]
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
} 