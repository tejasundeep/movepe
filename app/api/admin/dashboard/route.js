export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { userStorage, vendorStorage, orderStorage } from '../../../../lib/storage';
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

    // Get data from storage services
    const totalUsers = await userStorage.getUserCount('user');
    const totalVendors = await vendorStorage.getVendorCount();
    const totalOrders = await orderStorage.getOrderCount();
    
    // Get pending quotes count
    const pendingQuotes = await orderStorage.getPendingQuotesCount();

    // Get recent orders (last 10)
    const recentOrders = await orderStorage.getRecentOrders(10);

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