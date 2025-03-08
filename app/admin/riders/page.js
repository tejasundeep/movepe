'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { FaMotorcycle, FaCheck, FaTimes, FaUser } from 'react-icons/fa';

export default function AdminRidersPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [riders, setRiders] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState({});

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      fetchRiders();
    }
  }, [status, session]);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/riders');
      
      if (!response.ok) {
        throw new Error('Failed to fetch riders');
      }
      
      const data = await response.json();
      setRiders(data.riders);
    } catch (error) {
      console.error('Error fetching riders:', error);
      setError('Failed to load riders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRider = async (riderId) => {
    try {
      setApprovalLoading(prev => ({ ...prev, [riderId]: true }));
      
      const response = await fetch('/api/admin/approve-rider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ riderId })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve rider');
      }
      
      // Refresh riders list
      fetchRiders();
    } catch (error) {
      console.error('Error approving rider:', error);
      setError(error.message || 'Failed to approve rider. Please try again.');
    } finally {
      setApprovalLoading(prev => ({ ...prev, [riderId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      case 'available':
        return <Badge bg="success">Available</Badge>;
      case 'busy':
        return <Badge bg="primary">Busy</Badge>;
      case 'offline':
        return <Badge bg="secondary">Offline</Badge>;
      case 'suspended':
        return <Badge bg="danger">Suspended</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p>Loading riders...</p>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <h4>Not Authenticated</h4>
          <p>Please sign in as an admin to access this page.</p>
          <Button href="/auth/signin" variant="primary">Sign In</Button>
        </Alert>
      </Container>
    );
  }

  if (session?.user?.role !== 'admin') {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <h4>Unauthorized</h4>
          <p>You do not have permission to access this page.</p>
          <Button href="/" variant="primary">Go Home</Button>
        </Alert>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <h4>Error</h4>
          <p>{error}</p>
          <Button onClick={fetchRiders} variant="primary">Try Again</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">
        <FaMotorcycle className="me-2" />
        Manage Riders
      </h2>
      
      <Card>
        <Card.Body>
          <Table responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Completed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {riders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">No riders found</td>
                </tr>
              ) : (
                riders.map(rider => (
                  <tr key={rider.riderId}>
                    <td>{rider.name}</td>
                    <td>{rider.email}</td>
                    <td>{rider.phone}</td>
                    <td>
                      {rider.vehicleDetails?.type} - {rider.vehicleDetails?.model}
                    </td>
                    <td>{getStatusBadge(rider.status)}</td>
                    <td>{rider.completedDeliveries || 0}</td>
                    <td>
                      {rider.status === 'pending' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApproveRider(rider.riderId)}
                          disabled={approvalLoading[rider.riderId]}
                        >
                          {approvalLoading[rider.riderId] ? (
                            <Spinner animation="border" size="sm" />
                          ) : (
                            <>
                              <FaCheck className="me-1" /> Approve
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="ms-2"
                        href={`/admin/riders/${rider.riderId}`}
                      >
                        <FaUser className="me-1" /> Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
} 