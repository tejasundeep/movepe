import { NextResponse } from 'next/server';
import { 
  isValidNotificationId, 
  checkAdminAuth, 
  readNotifications, 
  saveNotifications 
} from '../utils';

// GET a single notification
export async function GET(request, { params }) {
  try {
    // Check admin authentication
    const authResult = await checkAdminAuth();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { notificationId } = params;
    
    // Validate notification ID format
    if (!isValidNotificationId(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID format' }, { status: 400 });
    }
    
    // Get notifications from storage
    const { notifications, error } = await readNotifications();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    
    // Find notification
    const notification = notifications.find(n => n.id === notificationId);
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE a notification
export async function DELETE(request, { params }) {
  try {
    // Check admin authentication
    const authResult = await checkAdminAuth();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { notificationId } = params;
    
    // Validate notification ID format
    if (!isValidNotificationId(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID format' }, { status: 400 });
    }
    
    // Get notifications from storage
    const { notifications, error: readError } = await readNotifications();
    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: readError.status });
    }
    
    // Find notification index
    const notificationIndex = notifications.findIndex(n => n.id === notificationId);
    
    if (notificationIndex === -1) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Remove notification from storage
    notifications.splice(notificationIndex, 1);
    
    // Save updated notifications
    const { error: saveError } = await saveNotifications(notifications);
    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: saveError.status });
    }
    
    return NextResponse.json({ 
      message: 'Notification deleted successfully',
      id: notificationId
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update a notification
export async function PUT(request, { params }) {
  try {
    // Check admin authentication
    const authResult = await checkAdminAuth();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { notificationId } = params;
    
    // Validate notification ID format
    if (!isValidNotificationId(notificationId)) {
      return NextResponse.json({ error: 'Invalid notification ID format' }, { status: 400 });
    }

    // Get and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Get notifications from storage
    const { notifications, error: readError } = await readNotifications();
    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: readError.status });
    }
    
    // Find notification index
    const notificationIndex = notifications.findIndex(n => n.id === notificationId);
    
    if (notificationIndex === -1) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Update notification with new data, preserving immutable fields
    const updatedNotification = {
      ...notifications[notificationIndex],
      ...body,
      // Preserve immutable fields
      id: notificationId,
      createdAt: notifications[notificationIndex].createdAt,
      metadata: {
        ...notifications[notificationIndex].metadata,
        ...body.metadata
      }
    };

    // Validate updated notification
    const validationErrors = validateNotification(updatedNotification);
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid notification data',
        details: validationErrors 
      }, { status: 400 });
    }

    // Update notification in array
    notifications[notificationIndex] = updatedNotification;
    
    // Save updated notifications
    const { error: saveError } = await saveNotifications(notifications);
    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: saveError.status });
    }
    
    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 