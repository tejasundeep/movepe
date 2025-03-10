export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { notificationService } from '../../../../lib/services/notificationService';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// POST /api/notifications/mark-read - Mark notifications as read
async function markNotificationsAsRead(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { notificationIds } = body;
    
    // Validate notification IDs
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'Notification IDs are required' },
        { status: 400 }
      );
    }

    // Mark notifications as read
    await notificationService.markNotificationsAsRead(
      session.user.email,
      notificationIds
    );

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(markNotificationsAsRead, { limit: 100, windowMs: 60000 }); 