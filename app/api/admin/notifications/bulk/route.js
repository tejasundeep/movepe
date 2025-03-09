export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { 
  isValidNotificationId, 
  checkAdminAuth, 
  readNotifications, 
  saveNotifications,
  generateNotificationId,
  formatDate,
  VALID_BULK_OPERATIONS,
  MAX_BULK_OPERATIONS
} from '../utils';

// Process notifications in batches to avoid memory issues
const processBatch = async (notifications, operation, notificationIds, batchSize = 20) => {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < notificationIds.length; i += batchSize) {
    const batchIds = notificationIds.slice(i, i + batchSize);
    
    switch (operation) {
      case 'delete':
        const beforeCount = notifications.length;
        notifications = notifications.filter(n => {
          const shouldDelete = batchIds.includes(n.id);
          if (shouldDelete) {
            results.push({ id: n.id, status: 'deleted' });
          }
          return !shouldDelete;
        });
        
        // Check for not found notifications
        const deletedCount = beforeCount - notifications.length;
        if (deletedCount < batchIds.length) {
          const deletedIds = results.map(r => r.id);
          const notFoundIds = batchIds.filter(id => !deletedIds.includes(id));
          errors.push({
            type: 'not_found',
            message: 'Some notifications were not found',
            ids: notFoundIds
          });
        }
        break;
        
      case 'resend':
        const toResend = notifications.filter(n => batchIds.includes(n.id));
        const notFoundIds = batchIds.filter(
          id => !toResend.find(n => n.id === id)
        );
        
        if (notFoundIds.length > 0) {
          errors.push({
            type: 'not_found',
            message: 'Some notifications were not found',
            ids: notFoundIds
          });
        }

        // Create new notifications
        const newNotifications = toResend.map(n => {
          const newId = generateNotificationId();
          const now = formatDate(new Date());
          
          const newNotification = {
            ...n,
            id: newId,
            status: 'pending',
            sentAt: now,
            metadata: {
              ...n.metadata,
              resendOf: n.id,
              resendAt: now
            }
          };
          
          results.push({ 
            id: n.id, 
            newId: newId, 
            status: 'resent' 
          });
          
          return newNotification;
        });
        
        notifications.push(...newNotifications);
        
        // Schedule status updates
        if (newNotifications.length > 0) {
          setTimeout(async () => {
            try {
              const { notifications: currentNotifications, error } = await readNotifications();
              if (!error && currentNotifications) {
                let hasChanges = false;
                newNotifications.forEach(newNotif => {
                  const index = currentNotifications.findIndex(n => n.id === newNotif.id);
                  if (index !== -1) {
                    currentNotifications[index].status = 'sent';
                    currentNotifications[index].metadata.deliveredAt = formatDate(new Date());
                    hasChanges = true;
                  }
                });
                if (hasChanges) {
                  await saveNotifications(currentNotifications);
                }
              }
            } catch (error) {
              console.error('Error updating notification statuses:', error);
            }
          }, 2000);
        }
        break;
    }
  }
  
  return { results, errors };
};

// POST bulk operations on notifications
export async function POST(request) {
  try {
    // Check admin authentication
    const authResult = await checkAdminAuth();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { operation, notificationIds } = body;
    
    // Validate operation
    if (!operation || !VALID_BULK_OPERATIONS.includes(operation)) {
      return NextResponse.json({ 
        error: `Invalid operation. Must be one of: ${VALID_BULK_OPERATIONS.join(', ')}` 
      }, { status: 400 });
    }

    // Validate notification IDs
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: 'Must provide at least one notification ID' }, { status: 400 });
    }

    if (notificationIds.length > MAX_BULK_OPERATIONS) {
      return NextResponse.json({ 
        error: `Cannot process more than ${MAX_BULK_OPERATIONS} notifications at once` 
      }, { status: 400 });
    }

    // Remove duplicate IDs
    const uniqueIds = [...new Set(notificationIds)];

    // Validate each notification ID format
    const invalidIds = uniqueIds.filter(id => !isValidNotificationId(id));
    if (invalidIds.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid notification ID format',
        invalidIds 
      }, { status: 400 });
    }

    // Get notifications from storage
    const { notifications, error: readError } = await readNotifications();
    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: readError.status });
    }

    // Process notifications in batches
    const { results, errors } = await processBatch(notifications, operation, uniqueIds);
    
    // Save updated notifications
    const { error: saveError } = await saveNotifications(notifications);
    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: saveError.status });
    }
    
    return NextResponse.json({ 
      message: `Bulk ${operation} operation completed`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      processedCount: results.length,
      totalRequested: notificationIds.length,
      uniqueProcessed: uniqueIds.length
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 