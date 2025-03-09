export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { riderService } from '../../../../lib/services/riderService';
import { notificationService } from '../../../../lib/services/notificationService';

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { riderId } = body;

    if (!riderId) {
      return NextResponse.json({ error: 'Rider ID is required' }, { status: 400 });
    }

    // Get rider details
    const rider = await riderService.getRiderById(riderId);
    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    // Check if rider is pending
    if (rider.status !== 'pending') {
      return NextResponse.json({ error: 'Rider is not pending approval' }, { status: 400 });
    }

    // Update rider status to available
    await riderService.updateRiderStatus(riderId, 'available');

    // Send notification to rider
    try {
      await notificationService.sendUserNotification(
        rider.email,
        'Account Approved',
        'Your rider account has been approved. You can now start accepting delivery requests.',
        'success',
        {
          type: 'rider_approval'
        }
      );
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Continue execution even if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Rider approved successfully'
    });
  } catch (error) {
    console.error('Error approving rider:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve rider' },
      { status: 500 }
    );
  }
} 