import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';

/**
 * Test API endpoint for rider authentication
 * This endpoint checks if the user is authenticated, has the rider role,
 * and is an approved rider in the system.
 */
export async function GET(request) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'Not authenticated',
      }, { status: 401 });
    }
    
    // Check if user has rider role
    if (session.user.role !== 'rider') {
      return NextResponse.json({
        authenticated: true,
        authorized: false,
        message: `User does not have rider role. Current role: ${session.user.role}`,
        session: {
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }
      }, { status: 403 });
    }
    
    // Get rider details
    const rider = await riderService.getRiderByEmail(session.user.email);
    
    // Check if rider exists
    if (!rider) {
      return NextResponse.json({
        authenticated: true,
        authorized: false,
        message: 'User has rider role but no rider record found',
        session: {
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }
      }, { status: 404 });
    }
    
    // Check rider status
    const isApproved = rider.status === 'approved';
    
    return NextResponse.json({
      authenticated: true,
      authorized: true,
      hasRiderRole: true,
      isApproved,
      message: isApproved ? 'Rider is authenticated and approved' : 'Rider is authenticated but not approved',
      session: {
        name: session.user.name,
        email: session.user.email,
        id: session.user.id,
        role: session.user.role,
        phone: session.user.phone,
        whatsapp: session.user.whatsapp,
        expires: session.expires,
      },
      rider: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        status: rider.status,
        location: rider.location,
        currentOrder: rider.currentOrder,
      }
    });
    
  } catch (error) {
    console.error('Error in rider auth test endpoint:', error);
    return NextResponse.json({
      error: error.message || 'An error occurred while checking rider authentication',
    }, { status: 500 });
  }
} 