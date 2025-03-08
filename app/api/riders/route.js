import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { riderService } from '../../../lib/services/riderService';
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware';

// GET /api/riders - Get all riders
async function getRiders(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only admin and vendor roles can access all riders
    if (session.user.role !== 'admin' && session.user.role !== 'vendor') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const serviceArea = searchParams.get('serviceArea');

    // Get all riders
    let riders = await riderService.getAllRiders();

    // Apply filters if provided
    if (status) {
      riders = riders.filter(rider => rider.status === status);
    }

    if (serviceArea) {
      riders = riders.filter(rider => 
        rider.serviceAreas && rider.serviceAreas.includes(serviceArea)
      );
    }

    return NextResponse.json(riders);
  } catch (error) {
    console.error('Error fetching riders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch riders' },
      { status: 500 }
    );
  }
}

// POST /api/riders - Create a new rider
async function createRider(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only admin can create riders
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Parse request body
    const riderData = await request.json();

    // Create rider
    const newRider = await riderService.createRider(riderData);

    return NextResponse.json(newRider, { status: 201 });
  } catch (error) {
    console.error('Error creating rider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create rider' },
      { status: 500 }
    );
  }
}

// Apply rate limiting middleware
export const GET = withRateLimit(getRiders, { limit: 100, windowMs: 60000 });
export const POST = withRateLimit(createRider, { limit: 10, windowMs: 60000 }); 