import { NextResponse } from 'next/server';
import { riderService } from '../../../../lib/services/riderService';
import { orderService } from '../../../../lib/services/orderService';

export async function GET(request) {
  try {
    // Get email from query params
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Get rider by email
    const rider = await riderService.getRiderByEmail(email);
    
    if (!rider) {
      return NextResponse.json({ 
        success: false, 
        error: `Rider with email ${email} not found` 
      });
    }
    
    // Get available orders for rider
    const availableOrders = await orderService.getAvailableOrdersForRider(rider.riderId, rider.serviceAreas);
    
    if (availableOrders.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: `No available orders found for rider with email ${email}`,
        availableOrders: []
      });
    }
    
    return NextResponse.json({
      success: true,
      availableOrders
    });
  } catch (error) {
    console.error('Error checking rider orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check rider orders' },
      { status: 500 }
    );
  }
} 