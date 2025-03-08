'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Container, Card, Alert, Button, Spinner } from 'react-bootstrap';
import Link from 'next/link';

export default function TestSessionPage() {
  const { data: session, status } = useSession();
  const [apiSession, setApiSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApiSession();
  }, []);

  const fetchApiSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/test/session');
      
      if (!response.ok) {
        throw new Error('Failed to fetch session data');
      }
      
      const data = await response.json();
      setApiSession(data);
    } catch (error) {
      console.error('Error fetching session data:', error);
      setError(error.message || 'Failed to fetch session data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p>Loading session data...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <h4>Error</h4>
          <p>{error}</p>
          <Button onClick={fetchApiSession} variant="primary">Try Again</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Session Test</h2>
      
      <Card className="mb-4">
        <Card.Header>
          <h4>Client-Side Session (useSession)</h4>
        </Card.Header>
        <Card.Body>
          {status === 'loading' ? (
            <Spinner animation="border" />
          ) : status === 'authenticated' ? (
            <div>
              <Alert variant="success">
                <p><strong>Authenticated!</strong></p>
                <p>Name: {session.user.name}</p>
                <p>Email: {session.user.email}</p>
                <p>Role: {session.user.role || 'Not set'}</p>
                <p>ID: {session.user.id}</p>
                <p>Phone: {session.user.phone}</p>
                <p>WhatsApp: {session.user.whatsapp}</p>
                <p>Expires: {session.expires}</p>
              </Alert>
              <pre className="bg-light p-3 rounded">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          ) : (
            <Alert variant="warning">
              <p><strong>Not authenticated</strong></p>
              <p>Please sign in to see session data.</p>
              <Link href="/auth/signin" passHref>
                <Button variant="primary">Sign In</Button>
              </Link>
            </Alert>
          )}
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Header>
          <h4>Server-Side Session (getServerSession)</h4>
        </Card.Header>
        <Card.Body>
          {apiSession ? (
            <div>
              {apiSession.authenticated ? (
                <div>
                  <Alert variant="success">
                    <p><strong>Authenticated!</strong></p>
                    <p>Name: {apiSession.session.user.name}</p>
                    <p>Email: {apiSession.session.user.email}</p>
                    <p>Role: {apiSession.session.user.role || 'Not set'}</p>
                    <p>ID: {apiSession.session.user.id}</p>
                    <p>Phone: {apiSession.session.user.phone}</p>
                    <p>WhatsApp: {apiSession.session.user.whatsapp}</p>
                    <p>Expires: {apiSession.session.expires}</p>
                  </Alert>
                  <pre className="bg-light p-3 rounded">
                    {JSON.stringify(apiSession, null, 2)}
                  </pre>
                </div>
              ) : (
                <Alert variant="warning">
                  <p><strong>Not authenticated</strong></p>
                  <p>Please sign in to see session data.</p>
                  <Link href="/auth/signin" passHref>
                    <Button variant="primary">Sign In</Button>
                  </Link>
                </Alert>
              )}
            </div>
          ) : (
            <Alert variant="danger">
              <p><strong>Failed to fetch session data</strong></p>
              <Button onClick={fetchApiSession} variant="primary">Try Again</Button>
            </Alert>
          )}
        </Card.Body>
      </Card>
      
      <div className="d-flex justify-content-between">
        <Button onClick={fetchApiSession} variant="primary">Refresh Session Data</Button>
        <Link href="/rider-dashboard" passHref>
          <Button variant="success">Go to Rider Dashboard</Button>
        </Link>
      </div>
    </Container>
  );
} 