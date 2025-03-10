'use client';

import React from 'react';
import { Container } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import InventoryManager from '@/components/InventoryManager';
import InventoryAnalytics from '@/components/InventoryAnalytics';

/**
 * Inventory Page
 * 
 * This page provides a comprehensive view of inventory management and analytics.
 */
const InventoryPage = () => {
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
        <p className="text-muted">Please sign in to access inventory management.</p>
      </Container>
    );
  }
  
  // Not a vendor
  if (!session.user.vendorId) {
    return (
      <Container className="py-5 text-center">
        <h3>Access Denied</h3>
        <p className="text-muted">Only vendors can access inventory management.</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center mb-4">
        <h2 className="mb-0">Inventory Management</h2>
      </div>
      
      <InventoryAnalytics vendorId={session.user.vendorId} />
      <InventoryManager vendorId={session.user.vendorId} />
    </Container>
  );
};

export default InventoryPage; 