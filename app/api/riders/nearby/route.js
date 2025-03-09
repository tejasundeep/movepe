export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// GET /api/riders/nearby - Find nearby riders
async function getNearbyRiders(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const radius = searchParams.get('radius') ? parseFloat(searchParams.get('radius')) : 5;
    const availableOnly = searchParams.get('availableOnly') !== 'false';

    // Validate required parameters
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Find nearby riders
    const nearbyRiders = await riderService.findNearbyRiders(
      { lat, lon },
      radius,
      availableOnly
    );

    return NextResponse.json({
      count: nearbyRiders.length,
      riders: nearbyRiders
    });
  } catch (error) {
    console.error('Error finding nearby riders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to find nearby riders' },
      { status: 500 }
    );
  }
}

// Apply rate limiting middleware
export const GET = withRateLimit(getNearbyRiders, { limit: 50, windowMs: 60000 }); 