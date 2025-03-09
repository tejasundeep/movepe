export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';

export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get rider email from session
    const riderEmail = session.user.email;

    // Check if user is a rider
    if (session.user.role !== 'rider') {
      return NextResponse.json({ error: 'User is not a rider' }, { status: 403 });
    }

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

    return NextResponse.json({
      success: true,
      rider: {
        riderId: rider.riderId,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        whatsapp: rider.whatsapp,
        status: rider.status,
        rating: rider.rating,
        completedDeliveries: rider.completedDeliveries,
        vehicleDetails: rider.vehicleDetails,
        serviceAreas: rider.serviceAreas,
        currentLocation: rider.currentLocation
      }
    });
  } catch (error) {
    console.error('Error fetching rider profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rider profile' },
      { status: 500 }
    );
  }
} 