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
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { orderId, status, notes } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status value
    const validStatuses = ['accepted', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Get rider details
    let rider;
    try {
      rider = await riderService.getRiderByEmail(riderEmail);
      if (!rider) {
        return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
      }
    } catch (error) {
      console.error('Error fetching rider details:', error);
      return NextResponse.json({ error: 'Failed to fetch rider details' }, { status: 500 });
    }

    // Get order details
    let order;
    try {
      order = await orderService.getOrderById(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 });
    }

    // Check if this rider is assigned to this order
    // Check both riderId and assignedRiderId fields for compatibility
    if (order.riderId !== rider.riderId && order.assignedRiderId !== rider.riderId) {
      return NextResponse.json({ error: 'You are not assigned to this order' }, { status: 403 });
    }

    // Validate status transition
    const currentStatus = order.status;
    const validTransitions = {
      'accepted': ['picked_up', 'cancelled'],
      'picked_up': ['in_transit', 'cancelled'],
      'in_transit': ['out_for_delivery', 'cancelled'],
      'out_for_delivery': ['delivered', 'failed_delivery', 'cancelled'],
      'delivered': [], // Terminal state
      'failed_delivery': [], // Terminal state
      'cancelled': [] // Terminal state
    };

    // If the order is in a different format (e.g., 'Rider Assigned'), allow accepting it
    if (!validTransitions[currentStatus] && status === 'accepted') {
      // Allow accepting orders that don't have a standard status yet
    } else if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
      return NextResponse.json({ 
        error: `Cannot transition from '${currentStatus}' to '${status}'` 
      }, { status: 400 });
    }

    // Update order status
    let updatedOrder;
    try {
      updatedOrder = await orderService.updateOrderStatus(orderId, status, notes);
    } catch (error) {
      console.error('Error updating order status:', error);
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
    }

    // If delivery is completed or failed, update rider status to available
    if (status === 'delivered' || status === 'failed_delivery' || status === 'cancelled') {
      try {
        await riderService.updateRiderStatus(rider.riderId, 'available');
      } catch (error) {
        console.error('Error updating rider status:', error);
        // Continue anyway, as the order status update was successful
      }
    }

    // Send notification to customer
    const statusMessages = {
      'accepted': 'Your order has been accepted by the rider',
      'picked_up': 'Your package has been picked up',
      'in_transit': 'Your package is in transit',
      'out_for_delivery': 'Your package is out for delivery',
      'delivered': 'Your package has been delivered',
      'failed_delivery': 'Delivery attempt failed',
      'cancelled': 'Delivery has been cancelled'
    };

    try {
      await notificationService.sendNotification({
        type: 'ORDER_UPDATE',
        title: 'Order Status Update',
        message: statusMessages[status] || `Order status updated to ${status}`,
        recipientEmail: order.userEmail,
        data: {
          orderId: order.orderId,
          status,
          notes: notes || ''
        }
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      // Continue anyway, as the order status update was successful
    }

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