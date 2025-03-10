export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';
import { storage, orderStorage } from '../../../../lib/storage';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// GET /api/riders/deliveries - Get rider's assigned deliveries
async function getRiderDeliveries(request) {
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

    // Get all orders using Prisma
    const orders = await orderStorage.getAll();
    
    // Filter orders assigned to this rider
    const assignedDeliveries = orders
      .filter(order => 
        order.orderType === 'parcel' && 
        order.riderId === rider.id
      )
      .sort((a, b) => {
        // Sort by status priority and then by date
        const statusPriority = {
          'Rider Assigned': 1,
          'Picked Up': 2,
          'In Transit': 3,
          'Delivered': 4,
          'Completed': 5,
          'Failed Delivery': 6
        };
        
        const aPriority = statusPriority[a.status] || 99;
        const bPriority = statusPriority[b.status] || 99;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // If same status, sort by date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

    return NextResponse.json(assignedDeliveries);
  } catch (error) {
    console.error('Error fetching rider deliveries:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rider deliveries' },
      { status: 500 }
    );
  }
}

// Apply rate limiting middleware
export const GET = withRateLimit(getRiderDeliveries, { limit: 50, windowMs: 60000 }); 