export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';

export async function POST(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get rider by email
    const rider = await riderService.getRiderByEmail(session.user.email);
    
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { location, riderId } = body;
    
    // Validate location
    if (!location || !location.lat || !location.lon) {
      return NextResponse.json(
        { error: 'Location coordinates are required' },
        { status: 400 }
      );
    }

    // If riderId is provided, verify it matches the authenticated rider
    if (riderId && riderId !== rider.id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this rider location' },
        { status: 403 }
      );
    }

    // Create updated location object
    const updatedLocation = {
      lat: location.lat,
      lon: location.lon,
      accuracy: location.accuracy || null,
      heading: location.heading || null,
      speed: location.speed || null,
      timestamp: new Date().toISOString()
    };

    // Update rider location
    await riderService.updateRiderLocation(rider.id, updatedLocation);

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Error updating rider location:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update rider location' },
      { status: 500 }
    );
  }
} 