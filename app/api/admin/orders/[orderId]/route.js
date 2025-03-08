import { NextResponse } from 'next/server';
import { storage } from '../../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';

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
    
    // Get orders from storage
    const orders = await storage.readData('orders.json') || [];
    
    // Find order by ID
    const order = orders.find(order => order.orderId === orderId);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
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
    
    // Get orders from storage
    const orders = await storage.readData('orders.json') || [];
    
    // Find order index
    const orderIndex = orders.findIndex(order => order.orderId === orderId);
    
    if (orderIndex === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Update order
    const updatedOrder = {
      ...orders[orderIndex],
      ...orderData,
      updatedAt: new Date().toISOString()
    };
    
    // Update order in storage
    orders[orderIndex] = updatedOrder;
    await storage.writeData('orders.json', orders);
    
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
    
    // Get orders from storage
    const orders = await storage.readData('orders.json') || [];
    
    // Find order index
    const orderIndex = orders.findIndex(order => order.orderId === orderId);
    
    if (orderIndex === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Remove order from storage
    orders.splice(orderIndex, 1);
    await storage.writeData('orders.json', orders);
    
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
} 