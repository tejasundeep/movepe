'use client';

import React from 'react';
import { Container, Alert } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import BusinessIntelligenceDashboard from '@/components/BusinessIntelligenceDashboard';

/**
 * Analytics Dashboard Page
 * 
 * This page displays comprehensive analytics and business intelligence data
 * for platform admins and vendors.
 */
const AnalyticsDashboardPage = () => {
  const { data: session, status } = useSession();
  
  // Loading state
  if (status === 'loading') {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }
  
  // Not authenticated
  if (!session) {
    return (
      <Container className="py-5 text-center">
        <h3>Access Denied</h3>
        <p className="text-muted">Please sign in to access analytics dashboard.</p>
      </Container>
    );
  }
  
  // Check if user has appropriate role
  const hasAccess = ['admin', 'vendor'].includes(session.user.role);
  if (!hasAccess) {
    return (
      <Container className="py-5 text-center">
        <h3>Access Denied</h3>
        <p className="text-muted">You don't have permission to access this page.</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center mb-4">
        <h2 className="mb-0">Analytics Dashboard</h2>
      </div>
      
      {session.user.role === 'vendor' && (
        <Alert variant="info" className="mb-4">
          <i className="bi bi-info-circle me-2"></i>
          This dashboard shows analytics specific to your vendor account. For platform-wide analytics, please contact the admin.
        </Alert>
      )}
      
      <BusinessIntelligenceDashboard />
    </Container>
  );
};

export default AnalyticsDashboardPage; 