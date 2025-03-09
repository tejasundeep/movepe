export const dynamic = 'force-dynamic';

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
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { location, riderId } = body;

    // Validate location data
    if (!location || typeof location !== 'object') {
      return NextResponse.json({ error: 'Location data is required and must be an object' }, { status: 400 });
    }

    if (!location.lat || !location.lon) {
      return NextResponse.json({ error: 'Location must include lat and lon coordinates' }, { status: 400 });
    }

    // Validate coordinate values
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);
    
    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'Coordinates must be valid numbers' }, { status: 400 });
    }
    
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json({ error: 'Coordinates out of valid range' }, { status: 400 });
    }

    // Get rider details
    const rider = await riderService.getRiderByEmail(riderEmail);
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    // Verify riderId if provided
    if (riderId && riderId !== rider.riderId && riderId !== rider.id) {
      return NextResponse.json({ error: 'Unauthorized to update this rider location' }, { status: 403 });
    }

    // Update rider location
    const updatedLocation = {
      lat: lat.toString(),
      lon: lon.toString(),
      lastUpdated: new Date().toISOString()
    };

    // Add accuracy if provided
    if (location.accuracy) {
      const accuracy = parseFloat(location.accuracy);
      if (!isNaN(accuracy) && accuracy > 0) {
        updatedLocation.accuracy = accuracy.toString();
      }
    }

    try {
      await riderService.updateRiderLocation(rider.riderId, updatedLocation);
    } catch (updateError) {
      console.error('Error in riderService.updateRiderLocation:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update location in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
      location: updatedLocation
    });
  } catch (error) {
    console.error('Error updating rider location:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update location' },
      { status: 500 }
    );
  }
} 