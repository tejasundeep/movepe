export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { notificationStorage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const userEmail = searchParams.get('userEmail');
    
    // Get notifications from storage
    const notifications = await notificationStorage.getAll({
      page,
      limit,
      type,
      status,
      userEmail
    });
    
    // Get total count for pagination
    const totalCount = await notificationStorage.getCount({
      type,
      status,
      userEmail
    });
    
    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST create a new notification
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

    // Get request body
    const notificationData = await request.json();
    
    // Validate required fields
    if (!notificationData.userId || !notificationData.title || !notificationData.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create notification
    const notification = await notificationStorage.create({
      userId: notificationData.userId,
      type: notificationData.type || 'system',
      title: notificationData.title,
      message: notificationData.message,
      isRead: false,
      data: notificationData.data || {}
    });
    
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
} 