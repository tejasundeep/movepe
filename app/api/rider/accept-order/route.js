export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { orderService } from '../../../../lib/services/orderService';
import { riderService } from '../../../../lib/services/riderService';
import { notificationService } from '../../../../lib/services/notificationService';

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
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get rider details
    const rider = await riderService.getRiderByEmail(riderEmail);
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    // Check if rider is available
    if (rider.status !== 'available' && rider.status !== 'pending') {
      return NextResponse.json({ error: 'Rider is not available' }, { status: 400 });
    }

    // Get order details
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if order is available for acceptance
    if (order.status !== 'pending' && order.status !== 'rider_requested') {
      return NextResponse.json({ error: 'Order is not available for acceptance' }, { status: 400 });
    }

    // Update order with rider assignment
    const updatedOrder = await orderService.assignRider(orderId, rider.riderId);

    // Update rider status to busy
    await riderService.updateRiderStatus(rider.riderId, 'busy');

    // Send notification to customer
    await notificationService.sendNotification({
      type: 'ORDER_UPDATE',
      title: 'Rider Assigned',
      message: `A rider has been assigned to your order #${orderId.substring(0, 8)}`,
      recipientEmail: order.userEmail,
      data: {
        orderId: order.orderId,
        riderName: rider.name,
        riderPhone: rider.phone
      }
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error accepting order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept order' },
      { status: 500 }
    );
  }
} 