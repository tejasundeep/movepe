import React, { useState, useEffect, useRef } from 'react';
import { Dropdown, Badge, Button, Spinner, ListGroup } from 'react-bootstrap';
import { useSession } from 'next-auth/react';

/**
 * Notification Center Component
 * 
 * This component displays a dropdown with user notifications and provides
 * functionality to mark them as read.
 */
const NotificationCenter = () => {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications on component mount and when session changes
  useEffect(() => {
    if (session) {
      fetchNotifications();
      
      // Set up polling for new notifications
      const intervalId = setInterval(() => {
        fetchNotifications(true);
      }, 60000); // Poll every minute
      
      return () => clearInterval(intervalId);
    }
  }, [session]);

  // Fetch notifications from the API
  const fetchNotifications = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/notifications?limit=10&unreadOnly=${!showAll}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      
      // Count unread notifications
      const unread = data.notifications.filter(notification => !notification.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: [notificationId],
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter(notification => !notification.isRead)
      .map(notification => notification.id);
    
    if (unreadIds.length === 0) {
      return;
    }
    
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: unreadIds,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      );
      
      // Update unread count
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Toggle between showing all notifications or only unread ones
  const toggleShowAll = () => {
    setShowAll(prevShowAll => !prevShowAll);
    fetchNotifications();
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Navigate to the relevant page based on notification type
    if (notification.data && notification.data.url) {
      window.location.href = notification.data.url;
    }
    
    // Close the dropdown
    if (dropdownRef.current) {
      dropdownRef.current.click();
    }
  };

  // Format notification timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return 'bi-box';
      case 'payment':
        return 'bi-credit-card';
      case 'quote':
        return 'bi-file-earmark-text';
      case 'review':
        return 'bi-star';
      case 'system':
        return 'bi-gear';
      case 'alert':
        return 'bi-exclamation-triangle';
      default:
        return 'bi-bell';
    }
  };

  // Get notification variant based on type
  const getNotificationVariant = (type) => {
    switch (type) {
      case 'order':
        return 'primary';
      case 'payment':
        return 'success';
      case 'quote':
        return 'info';
      case 'review':
        return 'warning';
      case 'system':
        return 'secondary';
      case 'alert':
        return 'danger';
      default:
        return 'light';
    }
  };

  // If not authenticated, don't render anything
  if (!session) {
    return null;
  }

  return (
    <Dropdown align="end">
      <Dropdown.Toggle 
        variant="light" 
        id="notification-dropdown"
        className="position-relative"
        ref={dropdownRef}
      >
        <i className="bi bi-bell"></i>
        {unreadCount > 0 && (
          <Badge 
            bg="danger" 
            pill 
            className="position-absolute top-0 start-100 translate-middle"
            style={{ fontSize: '0.6rem' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow-sm" style={{ width: '320px', maxHeight: '400px', overflow: 'auto' }}>
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <h6 className="mb-0">Notifications</h6>
          <div>
            <Button 
              variant="link" 
              size="sm" 
              className="text-decoration-none p-0 me-2"
              onClick={toggleShowAll}
            >
              {showAll ? 'Show Unread' : 'Show All'}
            </Button>
            <Button 
              variant="link" 
              size="sm" 
              className="text-decoration-none p-0"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All Read
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <p className="text-muted mt-2 mb-0 small">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <i className="bi bi-exclamation-circle text-danger"></i>
            <p className="text-muted mt-2 mb-0 small">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-bell text-muted" style={{ fontSize: '1.5rem' }}></i>
            <p className="text-muted mt-2 mb-0 small">No notifications</p>
          </div>
        ) : (
          <ListGroup variant="flush">
            {notifications.map(notification => (
              <ListGroup.Item 
                key={notification.id}
                action
                className={`border-bottom ${!notification.isRead ? 'bg-light' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="d-flex">
                  <div className={`me-3 text-${getNotificationVariant(notification.type)}`}>
                    <i className={`bi ${getNotificationIcon(notification.type)}`}></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <span className={`${!notification.isRead ? 'fw-bold' : ''}`}>
                        {notification.title}
                      </span>
                      <small className="text-muted ms-2">
                        {formatTimestamp(notification.createdAt)}
                      </small>
                    </div>
                    <p className="mb-0 small text-muted">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}

        <div className="text-center border-top p-2">
          <Button 
            variant="link" 
            size="sm" 
            className="text-decoration-none"
            href="/notifications"
          >
            View All Notifications
          </Button>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationCenter; 