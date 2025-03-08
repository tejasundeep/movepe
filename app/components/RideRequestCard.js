'use client';

import { useState } from 'react';
import { Card, Badge, Button, Row, Col, Spinner } from 'react-bootstrap';
import { FaMapMarkerAlt, FaBox, FaUser, FaPhone, FaClock, FaMoneyBillWave } from 'react-icons/fa';

export default function RideRequestCard({ request, onAccept, onDecline }) {
  console.log('RideRequestCard rendering with request:', request);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAccept = async () => {
    try {
      setLoading(true);
      setError(null);
      await onAccept(request.orderId);
    } catch (err) {
      setError('Failed to accept request. Please try again.');
      console.error('Error accepting request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      setLoading(true);
      setError(null);
      await onDecline(request.orderId);
    } catch (err) {
      setError('Failed to decline request. Please try again.');
      console.error('Error declining request:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      case 'accepted':
        return <Badge bg="success">Accepted</Badge>;
      case 'in_progress':
        return <Badge bg="primary">In Progress</Badge>;
      case 'completed':
        return <Badge bg="success">Completed</Badge>;
      case 'cancelled':
        return <Badge bg="danger">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Order #{request.orderId.substring(0, 8)}</h5>
          {getStatusBadge(request.status)}
        </div>
        <div>
          <FaMoneyBillWave className="me-1" />
          ₹{request.amount || 'N/A'}
        </div>
      </Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col xs={12} md={6}>
            <div className="mb-2">
              <FaMapMarkerAlt className="text-danger me-2" />
              <strong>Pickup:</strong> {request.pickupAddress}
            </div>
            <div>
              <FaMapMarkerAlt className="text-success me-2" />
              <strong>Destination:</strong> {request.destinationAddress}
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div className="mb-2">
              <FaBox className="me-2" />
              <strong>Package:</strong> {request.packageDetails || 'Standard Package'}
            </div>
            <div>
              <FaClock className="me-2" />
              <strong>Requested for:</strong> {formatDate(request.requestedTime)}
            </div>
          </Col>
        </Row>
        
        <Row className="mb-3">
          <Col xs={12}>
            <div className="mb-2">
              <FaUser className="me-2" />
              <strong>Customer:</strong> {request.customerName}
            </div>
            <div>
              <FaPhone className="me-2" />
              <strong>Contact:</strong> {request.customerPhone}
            </div>
          </Col>
        </Row>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="d-flex justify-content-end">
          {request.status === 'pending' && (
            <>
              <Button 
                variant="outline-danger" 
                className="me-2" 
                onClick={handleDecline}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Decline'}
              </Button>
              <Button 
                variant="success" 
                onClick={handleAccept}
                disabled={loading}
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Accept'}
              </Button>
            </>
          )}
        </div>
      </Card.Body>
    </Card>
  );
} 