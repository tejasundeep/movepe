export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { orderStorage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { auditService } from '../../../../lib/services/auditService';

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
    const orders = await orderStorage.getAll();
    
    // Sort orders by creation date (newest first)
    const sortedOrders = orders.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Log the action
    await auditService.logAction(
      session.user.email,
      'view_orders_list',
      'order',
      'all',
      { count: orders.length }
    );
    
    return NextResponse.json(sortedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
} 