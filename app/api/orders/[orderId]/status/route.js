export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { storage } from '../../../../../lib/storage';
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
      const orders = await storage.readData('orders.json') || [];
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      
      if (orderIndex === -1) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      
      const order = orders[orderIndex];
      
      // Check if rider is assigned to this order
      if (order.assignedRiderId !== rider.riderId) {
        return NextResponse.json(
          { error: 'You are not assigned to this order' },
          { status: 403 }
        );
      }
      
      // Check for concurrent updates if lastKnownStatus was provided
      if (lastKnownStatus && order.status !== lastKnownStatus) {
        return NextResponse.json({
          error: 'Order status has been changed by another user. Please refresh and try again.',
          currentStatus: order.status,
          statusHistory: order.statusHistory || []
        }, { status: 409 }); // 409 Conflict
      }
      
      // Validate status transition
      const validTransitions = {
        'Rider Assigned': ['Picked Up'],
        'Picked Up': ['In Transit', 'Delivered', 'Failed Delivery'],
        'In Transit': ['Delivered', 'Failed Delivery']
      };
      
      const currentStatus = order.status;
      const validNextStatuses = validTransitions[currentStatus] || [];
      
      if (!validNextStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${currentStatus} to ${status}` },
          { status: 400 }
        );
      }
      
      try {
        // Update order status with optimistic locking
        const updatedOrders = await storage.updateData('orders.json', (currentOrders) => {
          // Get fresh copy of the order
          const freshOrderIndex = currentOrders.findIndex(o => o.orderId === orderId);
          
          if (freshOrderIndex === -1) {
            throw new Error('Order not found during update');
          }
          
          const freshOrder = currentOrders[freshOrderIndex];
          
          // Check if order has been modified since we read it
          if (lastKnownStatus && freshOrder.status !== lastKnownStatus) {
            throw new Error('Concurrent update detected');
          }
          
          // Update order status
          currentOrders[freshOrderIndex].status = status;
          
          // Add to status history
          if (!currentOrders[freshOrderIndex].statusHistory) {
            currentOrders[freshOrderIndex].statusHistory = [];
          }
          
          currentOrders[freshOrderIndex].statusHistory.push({
            status,
            timestamp: new Date().toISOString(),
            comment: notes || `Status updated to ${status} by rider ${rider.name}`
          });
          
          // Add specific timestamps based on status
          if (status === 'Picked Up') {
            currentOrders[freshOrderIndex].pickedUpAt = new Date().toISOString();
          } else if (status === 'Delivered') {
            currentOrders[freshOrderIndex].deliveredAt = new Date().toISOString();
            
            // Update rider status to available
            riderService.updateRiderStatus(rider.riderId, 'available')
              .catch(err => console.error('Error updating rider status:', err));
            
            // Increment completed deliveries count
            storage.updateData('riders.json', (riders) => {
              const riderIndex = riders.findIndex(r => r.riderId === rider.riderId);
              if (riderIndex !== -1) {
                riders[riderIndex].completedDeliveries = (riders[riderIndex].completedDeliveries || 0) + 1;
              }
              return riders;
            }).catch(err => console.error('Error updating rider stats:', err));
          } else if (status === 'Failed Delivery') {
            currentOrders[freshOrderIndex].failedDeliveryAt = new Date().toISOString();
            currentOrders[freshOrderIndex].failureReason = notes || 'No reason provided';
            
            // Update rider status to available
            riderService.updateRiderStatus(rider.riderId, 'available')
              .catch(err => console.error('Error updating rider status:', err));
          }
          
          return currentOrders;
        });
        
        // If we got here, the update was successful
        const updatedOrder = updatedOrders.find(o => o.orderId === orderId);
        
        // Send notification to user
        try {
          const users = await storage.readData('users.json') || [];
          const user = users.find(u => u.email === updatedOrder.userEmail);
          
          if (user) {
            await notificationService.sendDeliveryStatusUpdateNotification(updatedOrder, user, status);
          }
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
          // Continue even if notification fails
        }
        
        return NextResponse.json({
          success: true,
          message: `Order status updated to ${status}`,
          order: updatedOrder
        });
      } catch (updateError) {
        if (updateError.message === 'Concurrent update detected') {
          // Retry the operation
          retryCount++;
          console.log(`Concurrent update detected, retrying (${retryCount}/${maxRetries})...`);
          
          if (retryCount >= maxRetries) {
            return NextResponse.json({
              error: 'Failed to update order status after multiple attempts due to concurrent updates. Please try again.',
              currentStatus: order.status
            }, { status: 409 });
          }
          
          // Wait a bit before retrying to reduce contention
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
          continue;
        }
        
        // For other errors, rethrow
        throw updateError;
      }
    }
    
    // This should not be reached due to the return statements in the loop
    return NextResponse.json(
      { error: 'Failed to update order status due to too many concurrent updates' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order status' },
      { status: 500 }
    );
  }
}

// Apply rate limiting middleware
export const POST = withRateLimit(updateOrderStatus, { limit: 50, windowMs: 60000 }); 