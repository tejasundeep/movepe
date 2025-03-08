import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { storage } from '../../../../lib/storage';

// Constants
export const VALID_NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'];
export const VALID_NOTIFICATION_TYPES = ['email', 'sms', 'whatsapp'];
export const VALID_RECIPIENT_TYPES = ['user', 'vendor', 'admin'];
export const VALID_EVENT_TYPES = ['order_created', 'quote_requested', 'quote_accepted', 'payment_received', 'order_completed', 'manual'];
export const MAX_BULK_OPERATIONS = 100;
export const VALID_BULK_OPERATIONS = ['delete', 'resend'];

// Validate notification ID format
export const isValidNotificationId = (id) => {
  return typeof id === 'string' && id.startsWith('notif_');
};

// Validate notification object
export const validateNotification = (notification) => {
  const errors = [];

  if (!notification.type || !VALID_NOTIFICATION_TYPES.includes(notification.type)) {
    errors.push('Invalid notification type');
  }

  if (!notification.recipientType || !VALID_RECIPIENT_TYPES.includes(notification.recipientType)) {
    errors.push('Invalid recipient type');
  }

  if (!notification.eventType || !VALID_EVENT_TYPES.includes(notification.eventType)) {
    errors.push('Invalid event type');
  }

  if (!notification.status || !VALID_NOTIFICATION_STATUSES.includes(notification.status)) {
    errors.push('Invalid status');
  }

  if (!notification.recipient) {
    errors.push('Recipient is required');
  }

  return errors;
};

// Check admin authentication
export const checkAdminAuth = async () => {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return { error: 'Not authenticated', status: 401 };
  }
  
  if (session.user.role !== 'admin') {
    return { error: 'Not authorized', status: 403 };
  }

  return { session };
};

// Read notifications with error handling
export const readNotifications = async () => {
  try {
    const notifications = await storage.readData('notifications.json');
    return {
      notifications: Array.isArray(notifications) ? notifications : [],
      error: null
    };
  } catch (error) {
    console.error('Error reading notifications:', error);
    return {
      notifications: [],
      error: { message: 'Internal server error', status: 500 }
    };
  }
};

// Save notifications with error handling
export const saveNotifications = async (notifications) => {
  try {
    await storage.writeData('notifications.json', notifications);
    return { error: null };
  } catch (error) {
    console.error('Error saving notifications:', error);
    return { error: { message: 'Failed to save changes', status: 500 } };
  }
};

// Generate unique notification ID
export const generateNotificationId = () => {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Format date for consistent ISO string
export const formatDate = (date) => {
  return new Date(date).toISOString();
}; 