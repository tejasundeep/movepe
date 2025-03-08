'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

// Browser detection helper
const getBrowser = () => {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = window.navigator.userAgent;
  
  if (userAgent.indexOf('Edge') > -1) return 'edge';
  if (userAgent.indexOf('Firefox') > -1) return 'firefox';
  if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) return 'safari';
  if (userAgent.indexOf('Chrome') > -1) return 'chrome';
  if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) return 'ie';
  
  return 'unknown';
};

export default function AdminRootLayout({ children }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [browser, setBrowser] = useState('unknown');
  
  // Detect browser on client side
  useEffect(() => {
    setBrowser(getBrowser());
  }, []);
  
  // Session timeout settings
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000; // 5 minutes before timeout
  
  // Track user activity
  useEffect(() => {
    if (status !== 'authenticated') return;
    
    // Update last activity time on user interaction
    const updateActivity = () => {
      setLastActivity(Date.now());
      setShowTimeoutWarning(false);
    };
    
    // Events to track
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
    
    // Check for session timeout every minute
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      // Show warning before timeout
      if (timeSinceLastActivity > SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT) {
        setShowTimeoutWarning(true);
      }
      
      // Redirect to login if session timed out
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(pathname)}&reason=timeout`;
      }
    }, 60000); // Check every minute
    
    // Clean up
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(intervalId);
    };
  }, [lastActivity, pathname, status, SESSION_TIMEOUT, WARNING_BEFORE_TIMEOUT]);
  
  // Use useEffect for client-side redirects to avoid hydration issues
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Store the current path to redirect back after login
      const returnUrl = encodeURIComponent(pathname || '/admin');
      window.location.href = `/auth/signin?callbackUrl=${returnUrl}`;
    } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
      // If authenticated but not admin, redirect to home
      window.location.href = '/';
    }
  }, [status, session, pathname]);
  
  // Check if user is authenticated and is an admin
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Server-side redirect for SSR
  if (status === 'unauthenticated' || !session || session.user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3">Checking authentication...</p>
      </div>
    );
  }
  
  // Define navigation items for the admin panel
  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Users', path: '/admin/users' },
    { name: 'Vendors', path: '/admin/vendors' },
    { name: 'Orders', path: '/admin/orders' },
    { name: 'Notifications', path: '/admin/notifications' },
    { name: 'Analytics', path: '/admin/analytics' },
    { name: 'Operational Bottlenecks', path: '/admin/operational-bottlenecks' },
    { name: 'Audit Logs', path: '/admin/audit-logs' },
    { name: 'System Health', path: '/admin/system-health' },
    { name: 'Settings', path: '/admin/settings' },
  ];
  
  return (
    <div className={`admin-root-layout ${browser}`}>
      {showTimeoutWarning && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center z-50">
          Your session will expire soon due to inactivity. Please continue working to stay logged in.
        </div>
      )}
      {children}
    </div>
  );
} 