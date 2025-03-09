export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// GET /api/riders/[riderId] - Get rider details by ID
async function getRider(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { riderId } = params;
    
    // Get rider by ID
    const rider = await riderService.getRiderById(riderId);
    
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    // Remove sensitive information
    const { email, serviceAreas, createdAt, ...safeRider } = rider;

    return NextResponse.json(safeRider);
  } catch (error) {
    console.error('Error fetching rider details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rider details' },
      { status: 500 }
    );
  }
}

// Apply rate limiting middleware
export const GET = withRateLimit(getRider, { limit: 50, windowMs: 60000 }); 