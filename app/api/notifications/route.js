export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { notificationService } from '../../../lib/services/notificationService';
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware';

// GET /api/notifications - Get user notifications
async function getUserNotifications(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Get notifications for the user
    const notifications = await notificationService.getUserNotifications(
      session.user.email,
      { limit, offset, unreadOnly }
    );

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

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

// Apply rate limiting to the handlers
export const GET = withRateLimit(getUserNotifications, { limit: 100, windowMs: 60000 });
export const POST = withRateLimit(markNotificationsAsRead, { limit: 100, windowMs: 60000 });

// Create route handlers for specific paths
export const POST_preferences = withRateLimit(updateNotificationPreferences, { limit: 100, windowMs: 60000 });
export const GET_preferences = withRateLimit(getNotificationPreferences, { limit: 100, windowMs: 60000 }); 