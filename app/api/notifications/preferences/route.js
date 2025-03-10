export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { notificationService } from '../../../../lib/services/notificationService';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// GET /api/notifications/preferences - Get notification preferences
async function getNotificationPreferences(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get notification preferences
    const preferences = await notificationService.getNotificationPreferences(
      session.user.email
    );

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get notification preferences' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/preferences - Update notification preferences
async function updateNotificationPreferences(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { preferences } = body;
    
    // Validate preferences
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Notification preferences are required' },
        { status: 400 }
      );
    }

    // Update notification preferences
    await notificationService.updateNotificationPreferences(
      session.user.email,
      preferences
    );

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated',
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getNotificationPreferences, { limit: 100, windowMs: 60000 });
export const POST = withRateLimit(updateNotificationPreferences, { limit: 100, windowMs: 60000 }); 