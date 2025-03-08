import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { orderService } from '../../../../lib/services/orderService';
import { riderService } from '../../../../lib/services/riderService';

export async function GET(request) {
  try {
    console.log('GET /api/rider/available-orders');
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'rider') {
      console.log('Unauthorized - not a rider:', session?.user?.role);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get rider email from session
    const riderEmail = session.user.email;
    console.log('Rider email:', riderEmail);

    // Get rider details
    const rider = await riderService.getRiderByEmail(riderEmail);
    console.log('Rider found:', rider ? 'yes' : 'no');
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    // Check if rider is approved
    console.log('Rider status:', rider.status);
    if (rider.status === 'pending') {
      return NextResponse.json({ 
        error: 'Your account is pending approval. You will be notified once approved.',
        pendingApproval: true
      }, { status: 403 });
    }

    // Get available orders based on rider's service areas
    console.log('Rider service areas:', rider.serviceAreas);
    const availableOrders = await orderService.getAvailableOrdersForRider(rider.riderId, rider.serviceAreas);
    console.log('Available orders count:', availableOrders.length);

    return NextResponse.json({
      success: true,
      orders: availableOrders
    });
  } catch (error) {
    console.error('Error getting available orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get available orders' },
      { status: 500 }
    );
  }
} 