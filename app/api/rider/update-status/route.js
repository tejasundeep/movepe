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
    const { orderId, status, notes } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID and status are required' }, { status: 400 });
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

    // Check if this rider is assigned to this order
    if (order.riderId !== rider.riderId) {
      return NextResponse.json({ error: 'You are not assigned to this order' }, { status: 403 });
    }

    // Update order status
    const updatedOrder = await orderService.updateOrderStatus(orderId, status, notes);

    // If delivery is completed or failed, update rider status to available
    if (status === 'delivered' || status === 'failed_delivery' || status === 'cancelled') {
      await riderService.updateRiderStatus(rider.riderId, 'available');
    }

    // Send notification to customer
    const statusMessages = {
      'picked_up': 'Your package has been picked up',
      'in_transit': 'Your package is in transit',
      'out_for_delivery': 'Your package is out for delivery',
      'delivered': 'Your package has been delivered',
      'failed_delivery': 'Delivery attempt failed',
      'cancelled': 'Delivery has been cancelled'
    };

    await notificationService.sendNotification({
      type: 'ORDER_UPDATE',
      title: 'Order Status Update',
      message: statusMessages[status] || `Order status updated to ${status}`,
      recipientEmail: order.userEmail,
      data: {
        orderId: order.orderId,
        status,
        notes
      }
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order status' },
      { status: 500 }
    );
  }
} 