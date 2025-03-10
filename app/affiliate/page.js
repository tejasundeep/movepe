'use client';

import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import AffiliateDashboard from '../../components/AffiliateDashboard';

/**
 * Affiliate Dashboard Page
 * 
 * This page displays the affiliate dashboard for users to manage their referrals and earnings.
 */
export default function AffiliatePage() {
  const { data: session, status } = useSession();

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    redirect('/auth/login?callbackUrl=/affiliate');
    return null;
  }

  // Loading state
  if (status === 'loading') {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={10}>
            <Card className="shadow-sm">
              <Card.Body className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 text-muted">Loading affiliate dashboard...</p>
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
        <Col md={10}>
          <h1 className="mb-4">Affiliate Dashboard</h1>
          <AffiliateDashboard />
          
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <h5 className="mb-3">How It Works</h5>
              <Row className="g-4">
                <Col md={4}>
                  <div className="text-center">
                    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-person-plus" style={{ fontSize: '1.5rem' }}></i>
                    </div>
                    <h6>1. Refer Users</h6>
                    <p className="text-muted small">
                      Share your unique referral code or link with potential customers and vendors.
                    </p>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-center">
                    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-check-circle" style={{ fontSize: '1.5rem' }}></i>
                    </div>
                    <h6>2. Users Sign Up</h6>
                    <p className="text-muted small">
                      When users sign up using your referral code, they're linked to your account.
                    </p>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-center">
                    <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-cash-coin" style={{ fontSize: '1.5rem' }}></i>
                    </div>
                    <h6>3. Earn Commissions</h6>
                    <p className="text-muted small">
                      Earn commissions when your referred users complete their first order or service.
                    </p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <h5 className="mb-3">Commission Structure</h5>
              <p className="text-muted">
                Earn commissions for each successful referral based on the following structure:
              </p>
              <ul className="mb-0">
                <li className="mb-2">
                  <strong>Customer Referrals:</strong> ₹50 per successful customer sign-up and first order
                </li>
                <li className="mb-2">
                  <strong>Vendor Referrals:</strong> ₹200 per successful vendor sign-up and first service
                </li>
                <li>
                  <strong>Recurring Commissions:</strong> 1% of order value for the first 5 orders from your referred customers
                </li>
              </ul>
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Affiliate Terms & Conditions</h5>
              <p className="text-muted small mb-0">
                By participating in the MovePE Affiliate Program, you agree to our <a href="/terms/affiliate" className="text-decoration-none">Affiliate Terms & Conditions</a>. Commissions are paid monthly for all approved earnings. Referrals must be genuine users who complete valid transactions. MovePE reserves the right to modify the program or terminate affiliate accounts that violate our terms.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
} 