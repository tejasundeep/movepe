export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// POST /api/riders/location - Update rider location
async function updateRiderLocation(request) {
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
    const { location } = body;
    
    // Validate location
    if (!location || !location.lat || !location.lon) {
      return NextResponse.json(
        { error: 'Location coordinates are required' },
        { status: 400 }
      );
    }

    // Update rider location
    const updatedRider = await riderService.updateRiderLocation(rider.riderId, location);

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
      location: updatedRider.currentLocation
    });
  } catch (error) {
    console.error('Error updating rider location:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update rider location' },
      { status: 500 }
    );
  }
}

// Apply rate limiting middleware
export const POST = withRateLimit(updateRiderLocation, { limit: 100, windowMs: 60000 }); 