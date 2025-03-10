'use client';

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import OrderTracker from '../../../../components/OrderTracker';

/**
 * Order Tracking Page
 * 
 * This page displays real-time tracking information for a specific order.
 */
export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [initialOrderData, setInitialOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial order data
  useEffect(() => {
    async function fetchOrderData() {
      if (status === 'loading') return;
      
      if (!session) {
        router.push(`/auth/login?callbackUrl=/order/${orderId}/tracking`);
        return;
      }
      
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Order not found');
          } else if (response.status === 403) {
            setError('You do not have permission to view this order');
          } else {
            setError('Failed to load order data');
          }
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        setInitialOrderData(data.order);
      } catch (err) {
        console.error('Error fetching order data:', err);
        setError('An error occurred while loading the order');
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrderData();
  }, [orderId, router, session, status]);

  // Handle back button click
  const handleBack = () => {
    router.back();
  };

  // Handle view details click
  const handleViewDetails = () => {
    router.push(`/order/${orderId}`);
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            <Card className="shadow-sm mb-4">
              <Card.Body className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 text-muted">Loading tracking information...</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            <Card className="shadow-sm mb-4 border-danger">
              <Card.Body className="text-center py-5">
                <div className="text-danger mb-3">
                  <i className="bi bi-exclamation-circle" style={{ fontSize: '3rem' }}></i>
                </div>
                <h4 className="mb-3">{error}</h4>
                <p className="text-muted mb-4">
                  We couldn't load the tracking information for this order.
                </p>
                <Button variant="outline-primary" onClick={handleBack}>
                  Go Back
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <Button variant="outline-secondary" onClick={handleBack}>
              <i className="bi bi-arrow-left me-2"></i>
              Back
            </Button>
            <Button variant="outline-primary" onClick={handleViewDetails}>
              View Order Details
              <i className="bi bi-arrow-right ms-2"></i>
            </Button>
          </div>
          
          <OrderTracker orderId={orderId} initialOrderData={initialOrderData} />
          
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <h5 className="mb-3">Need Help?</h5>
              <p className="text-muted">
                If you have any questions or concerns about your order, please contact our customer support team.
              </p>
              <div className="d-flex gap-2">
                <Button variant="outline-primary">
                  <i className="bi bi-chat-dots me-2"></i>
                  Chat Support
                </Button>
                <Button variant="outline-secondary">
                  <i className="bi bi-telephone me-2"></i>
                  Call Support
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
} 