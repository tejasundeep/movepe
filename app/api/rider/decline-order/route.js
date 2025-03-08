import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { orderService } from '../../../../lib/services/orderService';
import { riderService } from '../../../../lib/services/riderService';

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'rider') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get rider email from session
    const riderEmail = session.user.email;

    // Get request body
    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get rider details
    const rider = await riderService.getRiderByEmail(riderEmail);
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    // Get order details
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order is available for declining
    if (order.status !== 'pending' && order.status !== 'rider_requested') {
      return NextResponse.json({ error: 'Order is not available for declining' }, { status: 400 });
    }

    // Record the decline in the system
    await riderService.recordOrderDecline(rider.riderId, orderId, reason || 'No reason provided');

    // Make the order available for other riders
    await orderService.makeOrderAvailableForRiders(orderId);

    return NextResponse.json({
      success: true,
      message: 'Order declined successfully'
    });
  } catch (error) {
    console.error('Error declining order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to decline order' },
      { status: 500 }
    );
  }
} 