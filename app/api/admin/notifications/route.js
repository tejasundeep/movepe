import { NextResponse } from 'next/server';
import { storage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import fs from 'fs/promises';
import path from 'path';

// Ensure data directory exists
const ensureDataDirectory = async () => {
  const dataPath = process.env.DATA_PATH || path.join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataPath, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
};

// GET all notifications
export async function GET(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Ensure data directory exists
    await ensureDataDirectory();

    // Try to get notifications from storage
    let notifications;
    try {
      notifications = await storage.readData('notifications.json');
    } catch (error) {
      console.warn('Notifications file not found, creating empty array');
      notifications = [];
      
      // Create empty notifications file
      try {
        await storage.writeData('notifications.json', []);
      } catch (writeError) {
        console.error('Error creating notifications file:', writeError);
        // Continue with empty array even if saving fails
      }
    }

    // If notifications don't exist, use empty array
    if (!notifications) {
      notifications = [];
    }

    // Sort notifications by sent date (newest first)
    notifications.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Return empty array if there's an error
    return NextResponse.json([]);
  }
}

// POST create a new notification (for testing purposes)
export async function POST(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Ensure data directory exists
    await ensureDataDirectory();

    // Get request body
    const notificationData = await request.json();
    
    // Validate required fields
    if (!notificationData.type || !notificationData.recipient || !notificationData.recipientType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get notifications from storage
    let notifications;
    try {
      notifications = await storage.readData('notifications.json');
    } catch (error) {
      console.warn('Notifications file not found, creating empty array');
      notifications = [];
    }

    // If notifications don't exist, use empty array
    if (!notifications) {
      notifications = [];
    }

    // Create new notification
    const newNotification = {
      id: `notif_${Date.now()}`,
      type: notificationData.type,
      recipient: notificationData.recipient,
      recipientType: notificationData.recipientType,
      subject: notificationData.subject || '',
      message: notificationData.message || '',
      eventType: notificationData.eventType || 'manual',
      status: notificationData.status || 'pending',
      sentAt: new Date().toISOString(),
      metadata: notificationData.metadata || {}
    };

    // Add notification to storage
    notifications.push(newNotification);
    try {
      await storage.writeData('notifications.json', notifications);
    } catch (error) {
      console.error('Error saving notification:', error);
      return NextResponse.json({ error: 'Failed to save notification' }, { status: 500 });
    }
    
    return NextResponse.json(newNotification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
} 