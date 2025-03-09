export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// GET /api/riders/profile - Get rider profile
async function getRiderProfile(request) {
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

    return NextResponse.json(rider);
  } catch (error) {
    console.error('Error fetching rider profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rider profile' },
      { status: 500 }
    );
  }
}

// Apply rate limiting middleware
export const GET = withRateLimit(getRiderProfile, { limit: 50, windowMs: 60000 }); 