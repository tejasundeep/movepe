export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { orderStorage } from '../../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { auditService } from '../../../../../lib/services/auditService';

// GET a specific order
export async function GET(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { orderId } = params;
    
    // Get order from Prisma storage
    const order = await orderStorage.getById(orderId);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Log the action
    await auditService.logAction(
      session.user.email,
      'view_order',
      'order',
      orderId,
      { orderId }
    );
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PUT update an order
export async function PUT(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { orderId } = params;
    const orderData = await request.json();
    
    // Get order from Prisma storage to check if it exists
    const order = await orderStorage.getById(orderId);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Update order in Prisma storage
    const updatedOrder = await orderStorage.update(orderId, orderData);
    
    // Log the action
    await auditService.logAction(
      session.user.email,
      'update_order',
      'order',
      orderId,
      { orderId, updates: Object.keys(orderData) }
    );
    
    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

// DELETE an order
export async function DELETE(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { orderId } = params;
    
    // Get order from Prisma storage to check if it exists
    const order = await orderStorage.getById(orderId);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Delete order from Prisma storage
    await orderStorage.delete(orderId);
    
    // Log the action
    await auditService.logAction(
      session.user.email,
      'delete_order',
      'order',
      orderId,
      { orderId }
    );
    
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
} 