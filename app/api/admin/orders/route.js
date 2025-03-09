export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { storage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

// GET all orders
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

    // Get orders from storage
    const orders = await storage.readData('orders.json') || [];
    
    // Sort orders by creation date (newest first)
    const sortedOrders = orders.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    return NextResponse.json(sortedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
} 