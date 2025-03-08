import { NextResponse } from 'next/server';
import { storage } from '../../../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';

// POST resend a notification
export async function POST(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { notificationId } = params;
    
    // Get notifications from storage
    let notifications;
    try {
      notifications = await storage.readData('notifications.json');
    } catch (error) {
      console.warn('Notifications file not found');
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // If notifications don't exist, return 404
    if (!notifications) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Find notification
    const notification = notifications.find(n => n.id === notificationId);
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Create a new notification based on the original
    const newNotification = {
      ...notification,
      id: `notif_${Date.now()}`,
      status: 'pending',
      sentAt: new Date().toISOString(),
      metadata: {
        ...notification.metadata,
        resendOf: notification.id
      }
    };
    
    // Add new notification to storage
    notifications.push(newNotification);
    await storage.writeData('notifications.json', notifications);
    
    // In a real app, you would actually send the notification here
    // For now, we'll just simulate it by updating the status after a delay
    setTimeout(async () => {
      try {
        const updatedNotifications = await storage.readData('notifications.json');
        const index = updatedNotifications.findIndex(n => n.id === newNotification.id);
        if (index !== -1) {
          updatedNotifications[index].status = 'sent';
          await storage.writeData('notifications.json', updatedNotifications);
        }
      } catch (error) {
        console.error('Error updating notification status:', error);
      }
    }, 2000);
    
    return NextResponse.json(newNotification);
  } catch (error) {
    console.error('Error resending notification:', error);
    return NextResponse.json({ error: 'Failed to resend notification' }, { status: 500 });
  }
} 