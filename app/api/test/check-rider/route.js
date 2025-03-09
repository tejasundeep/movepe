export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { riderService } from '../../../../lib/services/riderService';

export async function GET(request) {
  try {
    // Get email from query params
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Get rider by email
    const rider = await riderService.getRiderByEmail(email);
    
    if (!rider) {
      return NextResponse.json({ 
        success: false, 
        error: `Rider with email ${email} not found` 
      });
    }
    
    // Check if rider has available status
    if (rider.status !== 'available') {
      return NextResponse.json({ 
        success: false, 
        error: `Rider with email ${email} does not have available status (current status: ${rider.status})`,
        name: rider.name,
        email: rider.email,
        status: rider.status,
        serviceAreas: rider.serviceAreas
      });
    }
    
    return NextResponse.json({
      success: true,
      name: rider.name,
      email: rider.email,
      status: rider.status,
      serviceAreas: rider.serviceAreas
    });
  } catch (error) {
    console.error('Error checking rider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check rider' },
      { status: 500 }
    );
  }
} 