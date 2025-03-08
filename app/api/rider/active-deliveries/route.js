import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { orderService } from '../../../../lib/services/orderService';
import { riderService } from '../../../../lib/services/riderService';

export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'rider') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get rider email from session
    const riderEmail = session.user.email;

    // Get rider details
    const rider = await riderService.getRiderByEmail(riderEmail);
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    // Get active deliveries for this rider
    const activeDeliveries = await orderService.getActiveDeliveriesForRider(rider.riderId);

    return NextResponse.json({
      success: true,
      deliveries: activeDeliveries
    });
  } catch (error) {
    console.error('Error getting active deliveries:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get active deliveries' },
      { status: 500 }
    );
  }
} 