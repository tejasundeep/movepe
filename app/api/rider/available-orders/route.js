export const dynamic = 'force-dynamic';

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

    // Check if rider is approved
    if (rider.status === 'pending') {
      return NextResponse.json({ 
        error: 'Your account is pending approval. You will be notified once approved.',
        pendingApproval: true
      }, { status: 403 });
    }

    // Get available orders based on rider's service areas
    const availableOrders = await orderService.getAvailableOrdersForRider(rider.id, rider.serviceAreas);

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