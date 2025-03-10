export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { orderService } from '../../../../../lib/services/orderService';
import { riderService } from '../../../../../lib/services/riderService';
import { pincodeStorage } from '../../../../../lib/storage';
import { userService } from '../../../../../lib/services/userService';
import { notificationService } from '../../../../../lib/services/notificationService';
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware';

// POST /api/orders/[orderId]/assign-rider - Assign a rider to an order
async function assignRider(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { orderId } = params;
    
    // Get order details
    const order = await orderService.getOrderById(orderId);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check if order is a parcel delivery
    if (order.orderType !== 'parcel') {
      return NextResponse.json(
        { error: 'Order is not a parcel delivery' },
        { status: 400 }
      );
    }
    
    // Check if rider is already assigned
    if (order.riderId) {
      return NextResponse.json(
        { error: 'Rider is already assigned to this order' },
        { status: 400 }
      );
    }
    
    // Get pickup location from order
    const pickupLocation = {
      lat: order.pickupLocation?.lat,
      lon: order.pickupLocation?.lon
    };
    
    // If pickup location is not available, try to get it from the pincode
    if (!pickupLocation.lat || !pickupLocation.lon) {
      // Get location data from pincode
      const pincode = await pincodeStorage.getByPincode(order.pickupPincode);
      
      if (!pincode || !pincode.lat || !pincode.lon) {
        return NextResponse.json(
          { error: 'Pickup location not available' },
          { status: 400 }
        );
      }
      
      pickupLocation.lat = pincode.lat;
      pickupLocation.lon = pincode.lon;
    }
    
    // Assign rider to delivery
    const rider = await riderService.assignRiderToDelivery(orderId, pickupLocation);
    
    // Get user details for notification
    const user = await userService.getUserByEmail(order.userEmail);
    
    // Send notification to user
    if (user) {
      await notificationService.sendUserRiderAssignmentNotification(order, user, rider);
    }
    
    return NextResponse.json({
      success: true,
      message: `Rider ${rider.name} assigned to order ${orderId}`,
      rider
    });
  } catch (error) {
    console.error('Error assigning rider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign rider' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(assignRider, 'orders'); 