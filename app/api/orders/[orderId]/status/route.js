export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { orderService } from '../../../../../lib/services/orderService';
import { orderStorage } from '../../../../../lib/storage';
import { riderService } from '../../../../../lib/services/riderService';
import { notificationService } from '../../../../../lib/services/notificationService';
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware';

// POST /api/orders/[orderId]/status - Update order status
async function updateOrderStatus(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { orderId } = params;
    
    // Parse request body
    const body = await request.json();
    const { status, notes, lastKnownStatus } = body;
    
    // Validate status
    const validStatuses = ['Picked Up', 'In Transit', 'Delivered', 'Failed Delivery'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Get rider by email
    const rider = await riderService.getRiderByEmail(session.user.email);
    
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }
    
    // Implement optimistic locking for concurrent updates
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      // Get fresh order details
      const order = await orderService.getOrderById(orderId);
      
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      
      // Check if rider is assigned to this order
      if (order.riderId !== rider.id) {
        return NextResponse.json(
          { error: 'You are not assigned to this order' },
          { status: 403 }
        );
      }
      
      // Check for concurrent modification
      if (lastKnownStatus && order.status !== lastKnownStatus) {
        return NextResponse.json(
          { 
            error: 'Order has been modified since you last viewed it',
            currentStatus: order.status
          },
          { status: 409 }
        );
      }
      
      try {
        // Update order status
        const updatedOrder = await orderService.updateOrderStatus(
          orderId,
          status,
          notes,
          session.user.email
        );
        
        // Send notification to user about status update
        if (updatedOrder.userEmail) {
          const user = await orderStorage.getUserByEmail(updatedOrder.userEmail);
          if (user) {
            await notificationService.sendUserOrderStatusUpdateNotification(
              updatedOrder,
              user,
              `Your order has been updated to: ${status}`
            );
          }
        }
        
        // If order is delivered, send a delivery confirmation notification
        if (status === 'Delivered') {
          const user = await orderStorage.getUserByEmail(updatedOrder.userEmail);
          if (user) {
            await notificationService.sendUserOrderDeliveredNotification(
              updatedOrder,
              user
            );
          }
        }
        
        return NextResponse.json({
          success: true,
          order: updatedOrder
        });
      } catch (error) {
        if (error.message === 'Concurrent modification detected') {
          // Retry on concurrent modification
          retryCount++;
          continue;
        }
        throw error;
      }
    }
    
    // If we've exhausted retries
    return NextResponse.json(
      { error: 'Failed to update order after multiple attempts due to concurrent modifications' },
      { status: 409 }
    );
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order status' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(updateOrderStatus, 'orders'); 