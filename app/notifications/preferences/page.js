'use client';

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Notification Preferences Page
 * 
 * This page allows users to configure their notification preferences.
 */
export default function NotificationPreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [preferences, setPreferences] = useState({
    email: {
      orderUpdates: true,
      paymentConfirmations: true,
      quoteNotifications: true,
      marketingEmails: false,
      systemAlerts: true,
    },
    whatsapp: {
      orderUpdates: false,
      paymentConfirmations: false,
      quoteNotifications: false,
      marketingMessages: false,
      systemAlerts: false,
    },
    inApp: {
      orderUpdates: true,
      paymentConfirmations: true,
      quoteNotifications: true,
      marketingNotifications: true,
      systemAlerts: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/notifications/preferences');
    }
  }, [status, router]);

  // Fetch notification preferences
  useEffect(() => {
    if (session) {
      fetchPreferences();
    }
  }, [session]);

  // Fetch notification preferences from the API
  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/preferences');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }
      
      const data = await response.json();
      
      if (data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError('Failed to load your notification preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save notification preferences
  const savePreferences = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }
      
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError('Failed to save your notification preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    savePreferences();
  };

  // Handle checkbox change
  const handleCheckboxChange = (channel, type, checked) => {
    setPreferences(prevPreferences => ({
      ...prevPreferences,
      [channel]: {
        ...prevPreferences[channel],
        [type]: checked,
      },
    }));
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="shadow-sm">
              <Card.Body className="text-center py-5">
                <Spinner animation="border" role="status" variant="primary" />
                <p className="mt-3 text-muted">Loading your notification preferences...</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // Not authenticated state
  if (!session) {
    return null; // Will redirect to login
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <h2 className="mb-4">Notification Preferences</h2>
          
          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" className="mb-4">
              Your notification preferences have been saved successfully.
            </Alert>
          )}
          
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <h5>Email Notifications</h5>
                  <p className="text-muted small">
                    Configure which notifications you receive via email at {session.user.email}
                  </p>
                  
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="email-order-updates"
                        label="Order Updates"
                        checked={preferences.email.orderUpdates}
                        onChange={(e) => handleCheckboxChange('email', 'orderUpdates', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive updates about your orders
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="email-payment-confirmations"
                        label="Payment Confirmations"
                        checked={preferences.email.paymentConfirmations}
                        onChange={(e) => handleCheckboxChange('email', 'paymentConfirmations', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive payment receipts and confirmations
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="email-quote-notifications"
                        label="Quote Notifications"
                        checked={preferences.email.quoteNotifications}
                        onChange={(e) => handleCheckboxChange('email', 'quoteNotifications', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive notifications about new quotes
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="email-marketing-emails"
                        label="Marketing Emails"
                        checked={preferences.email.marketingEmails}
                        onChange={(e) => handleCheckboxChange('email', 'marketingEmails', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive promotional offers and updates
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="email-system-alerts"
                        label="System Alerts"
                        checked={preferences.email.systemAlerts}
                        onChange={(e) => handleCheckboxChange('email', 'systemAlerts', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive important system notifications
                      </Form.Text>
                    </Col>
                  </Row>
                </div>
                
                <div className="mb-4">
                  <h5>WhatsApp Notifications</h5>
                  <p className="text-muted small">
                    Configure which notifications you receive via WhatsApp
                  </p>
                  
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="whatsapp-order-updates"
                        label="Order Updates"
                        checked={preferences.whatsapp.orderUpdates}
                        onChange={(e) => handleCheckboxChange('whatsapp', 'orderUpdates', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive updates about your orders
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="whatsapp-payment-confirmations"
                        label="Payment Confirmations"
                        checked={preferences.whatsapp.paymentConfirmations}
                        onChange={(e) => handleCheckboxChange('whatsapp', 'paymentConfirmations', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive payment receipts and confirmations
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="whatsapp-quote-notifications"
                        label="Quote Notifications"
                        checked={preferences.whatsapp.quoteNotifications}
                        onChange={(e) => handleCheckboxChange('whatsapp', 'quoteNotifications', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive notifications about new quotes
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="whatsapp-marketing-messages"
                        label="Marketing Messages"
                        checked={preferences.whatsapp.marketingMessages}
                        onChange={(e) => handleCheckboxChange('whatsapp', 'marketingMessages', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive promotional offers and updates
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="whatsapp-system-alerts"
                        label="System Alerts"
                        checked={preferences.whatsapp.systemAlerts}
                        onChange={(e) => handleCheckboxChange('whatsapp', 'systemAlerts', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive important system notifications
                      </Form.Text>
                    </Col>
                  </Row>
                </div>
                
                <div className="mb-4">
                  <h5>In-App Notifications</h5>
                  <p className="text-muted small">
                    Configure which notifications you receive within the app
                  </p>
                  
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="inapp-order-updates"
                        label="Order Updates"
                        checked={preferences.inApp.orderUpdates}
                        onChange={(e) => handleCheckboxChange('inApp', 'orderUpdates', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive updates about your orders
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="inapp-payment-confirmations"
                        label="Payment Confirmations"
                        checked={preferences.inApp.paymentConfirmations}
                        onChange={(e) => handleCheckboxChange('inApp', 'paymentConfirmations', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive payment receipts and confirmations
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="inapp-quote-notifications"
                        label="Quote Notifications"
                        checked={preferences.inApp.quoteNotifications}
                        onChange={(e) => handleCheckboxChange('inApp', 'quoteNotifications', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive notifications about new quotes
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="inapp-marketing-notifications"
                        label="Marketing Notifications"
                        checked={preferences.inApp.marketingNotifications}
                        onChange={(e) => handleCheckboxChange('inApp', 'marketingNotifications', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive promotional offers and updates
                      </Form.Text>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Check 
                        type="switch"
                        id="inapp-system-alerts"
                        label="System Alerts"
                        checked={preferences.inApp.systemAlerts}
                        onChange={(e) => handleCheckboxChange('inApp', 'systemAlerts', e.target.checked)}
                      />
                      <Form.Text className="text-muted">
                        Receive important system notifications
                      </Form.Text>
                    </Col>
                  </Row>
                </div>
                
                <div className="d-flex justify-content-end">
                  <Button 
                    variant="secondary" 
                    className="me-2"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Saving...
                      </>
                    ) : 'Save Preferences'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
} 