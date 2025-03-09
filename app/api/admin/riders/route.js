export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';

export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all riders
    const riders = await riderService.getAllRiders();

    return NextResponse.json({
      success: true,
      riders
    });
  } catch (error) {
    console.error('Error getting riders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get riders' },
      { status: 500 }
    );
  }
} 