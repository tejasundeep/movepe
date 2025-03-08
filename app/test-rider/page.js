'use client';

import { useState, useEffect } from 'react';
import { Container, Button, Alert, Spinner, Card } from 'react-bootstrap';
import Link from 'next/link';

export default function TestRiderPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Test 1: Check if the rider exists in users.json with the correct role
      console.log('Test 1: Checking rider in users.json');
      const userResponse = await fetch('/api/test/check-rider-user?email=lucky@gmail.com');
      if (!userResponse.ok) {
        throw new Error('Failed to check rider user');
      }
      const userData = await userResponse.json();
      
      // Test 2: Check if the rider exists in riders.json with the correct status
      console.log('Test 2: Checking rider in riders.json');
      const riderResponse = await fetch('/api/test/check-rider?email=lucky@gmail.com');
      if (!riderResponse.ok) {
        throw new Error('Failed to check rider');
      }
      const riderData = await riderResponse.json();
      
      // Test 3: Check if there are available orders for the rider
      console.log('Test 3: Checking available orders');
      const ordersResponse = await fetch('/api/test/check-rider-orders?email=lucky@gmail.com');
      if (!ordersResponse.ok) {
        throw new Error('Failed to check rider orders');
      }
      const ordersData = await ordersResponse.json();
      
      setTestResults({
        user: userData,
        rider: riderData,
        orders: ordersData
      });
    } catch (error) {
      console.error('Error running tests:', error);
      setError(error.message || 'Failed to run tests');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p>Running tests...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <h4>Error</h4>
          <p>{error}</p>
          <Button onClick={runTests} variant="primary">Try Again</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Rider Dashboard Test Results</h2>
      
      <Card className="mb-4">
        <Card.Header>
          <h4>Test 1: Rider User</h4>
        </Card.Header>
        <Card.Body>
          {testResults?.user?.success ? (
            <Alert variant="success">
              <p><strong>Success!</strong> Rider user found with correct role.</p>
              <p>Name: {testResults.user.name}</p>
              <p>Email: {testResults.user.email}</p>
              <p>Role: {testResults.user.role}</p>
            </Alert>
          ) : (
            <Alert variant="danger">
              <p><strong>Failed!</strong> {testResults?.user?.error || 'Rider user not found or has incorrect role.'}</p>
            </Alert>
          )}
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Header>
          <h4>Test 2: Rider Status</h4>
        </Card.Header>
        <Card.Body>
          {testResults?.rider?.success ? (
            <Alert variant="success">
              <p><strong>Success!</strong> Rider found with correct status.</p>
              <p>Name: {testResults.rider.name}</p>
              <p>Email: {testResults.rider.email}</p>
              <p>Status: {testResults.rider.status}</p>
              <p>Service Areas: {testResults.rider.serviceAreas.join(', ')}</p>
            </Alert>
          ) : (
            <Alert variant="danger">
              <p><strong>Failed!</strong> {testResults?.rider?.error || 'Rider not found or has incorrect status.'}</p>
            </Alert>
          )}
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Header>
          <h4>Test 3: Available Orders</h4>
        </Card.Header>
        <Card.Body>
          {testResults?.orders?.success ? (
            <Alert variant="success">
              <p><strong>Success!</strong> Found {testResults.orders.availableOrders.length} available orders for rider.</p>
              {testResults.orders.availableOrders.map(order => (
                <div key={order.orderId} className="mb-3 p-3 border rounded">
                  <p><strong>Order ID:</strong> {order.orderId}</p>
                  <p><strong>Pickup:</strong> {order.pickupAddress}</p>
                  <p><strong>Destination:</strong> {order.destinationAddress}</p>
                </div>
              ))}
            </Alert>
          ) : (
            <Alert variant="danger">
              <p><strong>Failed!</strong> {testResults?.orders?.error || 'No available orders found for rider.'}</p>
            </Alert>
          )}
        </Card.Body>
      </Card>
      
      <div className="d-flex justify-content-between">
        <Button onClick={runTests} variant="primary">Run Tests Again</Button>
        <Link href="/rider-dashboard" passHref>
          <Button variant="success">Go to Rider Dashboard</Button>
        </Link>
      </div>
    </Container>
  );
} 