'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap';

export default function TestRiderAuthPage() {
  const { data: session, status } = useSession();
  const [riderAuth, setRiderAuth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRiderAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test/rider-auth');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to fetch rider authentication data');
      }
      
      setRiderAuth(data);
    } catch (err) {
      console.error('Error fetching rider auth data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRiderAuth();
    }
  }, [status]);

  const getStatusBadge = (status) => {
    const statusColors = {
      'approved': 'success',
      'pending': 'warning',
      'rejected': 'danger',
      'available': 'info',
      'unavailable': 'secondary',
      'delivering': 'primary'
    };
    
    return (
      <Badge bg={statusColors[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  return (
    <Container className="py-5">
      <h1 className="mb-4">Rider Authentication Test</h1>
      
      {status === 'loading' && (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading session...</p>
        </div>
      )}
      
      {status === 'unauthenticated' && (
        <Card className="mb-4">
          <Card.Body className="text-center">
            <Card.Title>Not Signed In</Card.Title>
            <Card.Text>You need to sign in to test rider authentication.</Card.Text>
            <Button variant="primary" onClick={() => signIn()}>Sign In</Button>
          </Card.Body>
        </Card>
      )}
      
      {status === 'authenticated' && (
        <>
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Session Information</h5>
                <Button variant="outline-secondary" size="sm" onClick={() => signOut()}>
                  Sign Out
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <p><strong>Name:</strong> {session.user.name}</p>
              <p><strong>Email:</strong> {session.user.email}</p>
              <p><strong>Role:</strong> {session.user.role || 'Not set'}</p>
              {session.user.id && <p><strong>ID:</strong> {session.user.id}</p>}
              {session.user.phone && <p><strong>Phone:</strong> {session.user.phone}</p>}
              {session.user.whatsapp && <p><strong>WhatsApp:</strong> {session.user.whatsapp}</p>}
              <p><strong>Session Expires:</strong> {new Date(session.expires).toLocaleString()}</p>
            </Card.Body>
          </Card>
          
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Rider Authentication</h5>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={fetchRiderAuth} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Loading...</span>
                    </>
                  ) : 'Refresh'}
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {loading && (
                <div className="text-center my-3">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                  <p className="mt-2">Checking rider authentication...</p>
                </div>
              )}
              
              {error && (
                <Alert variant="danger">
                  <Alert.Heading>Error</Alert.Heading>
                  <p>{error}</p>
                </Alert>
              )}
              
              {!loading && !error && riderAuth && (
                <div>
                  <Alert variant={riderAuth.isApproved ? 'success' : 'warning'}>
                    <Alert.Heading>{riderAuth.message}</Alert.Heading>
                    <p>
                      <strong>Authenticated:</strong> {riderAuth.authenticated ? 'Yes' : 'No'}<br />
                      <strong>Has Rider Role:</strong> {riderAuth.hasRiderRole ? 'Yes' : 'No'}<br />
                      <strong>Is Approved:</strong> {riderAuth.isApproved ? 'Yes' : 'No'}
                    </p>
                  </Alert>
                  
                  {riderAuth.rider && (
                    <div className="mt-4">
                      <h5>Rider Details</h5>
                      <p><strong>ID:</strong> {riderAuth.rider.id}</p>
                      <p><strong>Name:</strong> {riderAuth.rider.name}</p>
                      <p><strong>Email:</strong> {riderAuth.rider.email}</p>
                      <p>
                        <strong>Status:</strong> {getStatusBadge(riderAuth.rider.status)}
                      </p>
                      {riderAuth.rider.location && (
                        <p>
                          <strong>Location:</strong> {JSON.stringify(riderAuth.rider.location)}
                        </p>
                      )}
                      {riderAuth.rider.currentOrder && (
                        <p>
                          <strong>Current Order:</strong> {riderAuth.rider.currentOrder}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {!loading && !error && !riderAuth && (
                <Alert variant="info">
                  <p>No rider authentication data available. Click Refresh to check.</p>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
} 