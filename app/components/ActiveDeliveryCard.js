'use client';

import { useState } from 'react';
import { Card, Badge, Button, Row, Col, Spinner, Form, Modal } from 'react-bootstrap';
import { FaMapMarkerAlt, FaBox, FaUser, FaPhone, FaClock, FaMoneyBillWave, FaRoute } from 'react-icons/fa';

export default function ActiveDeliveryCard({ delivery, onUpdateStatus }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    notes: ''
  });

  const handleStatusChange = () => {
    setShowStatusModal(true);
  };

  const handleCloseModal = () => {
    setShowStatusModal(false);
  };

  const handleUpdateStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      await onUpdateStatus(delivery.orderId, statusUpdate.status, statusUpdate.notes);
      setShowStatusModal(false);
    } catch (err) {
      setError('Failed to update status. Please try again.');
      console.error('Error updating status:', err);
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
      case 'accepted':
        return <Badge bg="success">Accepted</Badge>;
      case 'picked_up':
        return <Badge bg="primary">Picked Up</Badge>;
      case 'in_transit':
        return <Badge bg="info">In Transit</Badge>;
      case 'out_for_delivery':
        return <Badge bg="warning">Out for Delivery</Badge>;
      case 'delivered':
        return <Badge bg="success">Delivered</Badge>;
      case 'failed_delivery':
        return <Badge bg="danger">Failed Delivery</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getNextStatusOptions = (currentStatus) => {
    switch (currentStatus) {
      case 'accepted':
        return [
          { value: 'picked_up', label: 'Picked Up' },
          { value: 'cancelled', label: 'Cancel Delivery' }
        ];
      case 'picked_up':
        return [
          { value: 'in_transit', label: 'In Transit' },
          { value: 'failed_pickup', label: 'Failed Pickup' }
        ];
      case 'in_transit':
        return [
          { value: 'out_for_delivery', label: 'Out for Delivery' },
          { value: 'delivery_delayed', label: 'Delivery Delayed' }
        ];
      case 'out_for_delivery':
        return [
          { value: 'delivered', label: 'Delivered' },
          { value: 'failed_delivery', label: 'Failed Delivery' }
        ];
      case 'failed_delivery':
        return [
          { value: 'reattempt_delivery', label: 'Reattempt Delivery' },
          { value: 'returned', label: 'Return to Sender' }
        ];
      default:
        return [];
    }
  };

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Order #{delivery.orderId.substring(0, 8)}</h5>
          {getStatusBadge(delivery.status)}
        </div>
        <div>
          <FaMoneyBillWave className="me-1" />
          ₹{delivery.amount || 'N/A'}
        </div>
      </Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col xs={12} md={6}>
            <div className="mb-2">
              <FaMapMarkerAlt className="text-danger me-2" />
              <strong>Pickup:</strong> {delivery.pickupAddress}
            </div>
            <div>
              <FaMapMarkerAlt className="text-success me-2" />
              <strong>Destination:</strong> {delivery.destinationAddress}
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div className="mb-2">
              <FaBox className="me-2" />
              <strong>Package:</strong> {delivery.packageDetails || 'Standard Package'}
            </div>
            <div>
              <FaClock className="me-2" />
              <strong>Accepted at:</strong> {formatDate(delivery.acceptedTime || delivery.createdAt)}
            </div>
          </Col>
        </Row>
        
        <Row className="mb-3">
          <Col xs={12}>
            <div className="mb-2">
              <FaUser className="me-2" />
              <strong>Customer:</strong> {delivery.customerName}
            </div>
            <div>
              <FaPhone className="me-2" />
              <strong>Contact:</strong> {delivery.customerPhone}
            </div>
          </Col>
        </Row>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="d-flex justify-content-between align-items-center">
          <Button 
            variant="outline-primary" 
            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(delivery.pickupAddress)}&destination=${encodeURIComponent(delivery.destinationAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaRoute className="me-1" /> Get Directions
          </Button>
          
          <Button 
            variant="primary" 
            onClick={handleStatusChange}
            disabled={loading || getNextStatusOptions(delivery.status).length === 0}
          >
            {loading ? <Spinner animation="border" size="sm" /> : 'Update Status'}
          </Button>
        </div>
      </Card.Body>

      {/* Status Update Modal */}
      <Modal show={showStatusModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Update Delivery Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>New Status</Form.Label>
              <Form.Select 
                value={statusUpdate.status}
                onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
                required
              >
                <option value="">Select new status</option>
                {getNextStatusOptions(delivery.status).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes (Optional)</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3}
                value={statusUpdate.notes}
                onChange={(e) => setStatusUpdate({...statusUpdate, notes: e.target.value})}
                placeholder="Add any additional notes about this status update"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateStatus}
            disabled={loading || !statusUpdate.status}
          >
            {loading ? <Spinner animation="border" size="sm" /> : 'Update Status'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
} 