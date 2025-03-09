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

    // Get data from storage
    const users = await storage.readData('users.json') || [];
    const vendors = await storage.readData('vendors.json') || [];
    const orders = await storage.readData('orders.json') || [];

    // Calculate statistics
    const totalUsers = users.filter(user => user.role === 'user').length;
    const totalVendors = vendors.length;
    const totalOrders = orders.length;
    
    // Get pending quotes count
    const pendingQuotes = orders.filter(order => 
      order.status === 'Initiated' || 
      order.status === 'QuoteRequested'
    ).length;

    // Get recent orders (last 10)
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    return NextResponse.json({
      totalUsers,
      totalVendors,
      totalOrders,
      pendingQuotes,
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
} 