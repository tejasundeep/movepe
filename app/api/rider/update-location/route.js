import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';

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
    const { location } = body;

    if (!location || !location.lat || !location.lon) {
      return NextResponse.json({ error: 'Location data is required' }, { status: 400 });
    }

    // Get rider details
    const rider = await riderService.getRiderByEmail(riderEmail);
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    // Update rider location
    const updatedLocation = {
      lat: location.lat.toString(),
      lon: location.lon.toString(),
      lastUpdated: new Date().toISOString()
    };

    await riderService.updateRiderLocation(rider.riderId, updatedLocation);

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Error updating rider location:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update location' },
      { status: 500 }
    );
  }
} 