'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { Container, Row, Col, Card, Badge, Spinner, Alert, ProgressBar, Button } from 'react-bootstrap';
import { FaBox, FaMapMarkerAlt, FaUser, FaMotorcycle, FaPhone, FaCalendarAlt, FaWeight, FaRuler, FaRoute } from 'react-icons/fa';

export default function TrackDeliveryPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const { orderId } = params;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [rider, setRider] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    if (status === 'authenticated' && orderId) {
      fetchOrderDetails();
      
      // Set up auto-refresh every 30 seconds for active deliveries
      const interval = setInterval(() => {
        fetchOrderDetails(false);
      }, 30000);
      
      setRefreshInterval(interval);
      
      // Clean up on unmount
      return () => {
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
      };
    }
  }, [status, orderId]);

  const fetchOrderDetails = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      const data = await response.json();
      setOrder(data);
      
      // If rider is assigned, fetch rider details
      if (data.assignedRiderId) {
        await fetchRiderDetails(data.assignedRiderId);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError(error.message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const fetchRiderDetails = async (riderId) => {
    try {
      const response = await fetch(`/api/riders/${riderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch rider details');
      }
      
      const data = await response.json();
      setRider(data);
    } catch (error) {
      console.error('Error fetching rider details:', error);
      // Don't set error state, as this is not critical
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Initiated':
        return 'secondary';
      case 'Rider Assigned':
        return 'info';
      case 'Picked Up':
        return 'primary';
      case 'In Transit':
        return 'warning';
      case 'Delivered':
        return 'success';
      case 'Failed Delivery':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getDeliveryProgress = (status) => {
    const statusProgress = {
      'Initiated': 0,
      'Rider Assigned': 25,
      'Picked Up': 50,
      'In Transit': 75,
      'Delivered': 100,
      'Failed Delivery': 100
    };
    
    return statusProgress[status] || 0;
  };

  const getProgressVariant = (status) => {
    if (status === 'Delivered') {
      return 'success';
    } else if (status === 'Failed Delivery') {
      return 'danger';
    } else {
      return 'primary';
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p>Loading delivery details...</p>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Please sign in to track your delivery.
        </Alert>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Order not found or you don't have permission to view it.
        </Alert>
      </Container>
    );
  }

  // Check if this is a parcel delivery order
  if (order.orderType !== 'parcel') {
    return (
      <Container className="py-5">
        <Alert variant="info">
          This is not a parcel delivery order. <a href={`/order/${orderId}`}>View order details</a>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">Track Your Delivery</h1>
      
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={8}>
              <h5 className="mb-3">Delivery Status</h5>
              <div className="mb-3">
                <Badge bg={getStatusBadgeVariant(order.status)} className="p-2 fs-6">
                  {order.status}
                </Badge>
              </div>
              
              <ProgressBar 
                now={getDeliveryProgress(order.status)} 
                variant={getProgressVariant(order.status)}
                className="mb-4"
                style={{ height: '10px' }}
              />
              
              <Row className="text-center g-3">
                <Col xs={3}>
                  <div className={`border rounded p-2 ${order.status !== 'Initiated' ? 'border-primary' : ''}`}>
                    <div className="mb-2">
                      <FaBox size={24} color={order.status !== 'Initiated' ? '#0d6efd' : '#6c757d'} />
                    </div>
                    <div className="small">Order Placed</div>
                    <div className="small text-muted">{formatDateTime(order.createdAt)}</div>
                  </div>
                </Col>
                <Col xs={3}>
                  <div className={`border rounded p-2 ${order.status !== 'Initiated' ? 'border-primary' : ''}`}>
                    <div className="mb-2">
                      <FaMotorcycle size={24} color={order.status !== 'Initiated' ? '#0d6efd' : '#6c757d'} />
                    </div>
                    <div className="small">Rider Assigned</div>
                    <div className="small text-muted">{formatDateTime(order.riderAssignedAt)}</div>
                  </div>
                </Col>
                <Col xs={3}>
                  <div className={`border rounded p-2 ${(order.status === 'Picked Up' || order.status === 'In Transit' || order.status === 'Delivered') ? 'border-primary' : ''}`}>
                    <div className="mb-2">
                      <FaBox size={24} color={(order.status === 'Picked Up' || order.status === 'In Transit' || order.status === 'Delivered') ? '#0d6efd' : '#6c757d'} />
                    </div>
                    <div className="small">Picked Up</div>
                    <div className="small text-muted">{formatDateTime(order.pickedUpAt)}</div>
                  </div>
                </Col>
                <Col xs={3}>
                  <div className={`border rounded p-2 ${order.status === 'Delivered' ? 'border-success' : (order.status === 'Failed Delivery' ? 'border-danger' : '')}`}>
                    <div className="mb-2">
                      <FaMapMarkerAlt size={24} color={order.status === 'Delivered' ? '#198754' : (order.status === 'Failed Delivery' ? '#dc3545' : '#6c757d')} />
                    </div>
                    <div className="small">{order.status === 'Failed Delivery' ? 'Delivery Failed' : 'Delivered'}</div>
                    <div className="small text-muted">{formatDateTime(order.deliveredAt || order.failedDeliveryAt)}</div>
                  </div>
                </Col>
              </Row>
            </Col>
            <Col md={4}>
              <h5 className="mb-3">Order Details</h5>
              <p className="mb-2">
                <strong>Order ID:</strong> {orderId}
              </p>
              <p className="mb-2">
                <FaCalendarAlt className="me-2" />
                <strong>Order Date:</strong> {formatDateTime(order.createdAt)}
              </p>
              {/* Weight and dimensions are still stored in the backend but not displayed in UI */}
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {order.orderType === 'parcel' && order.distanceCategory && (
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">Delivery Information</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <h6>Delivery Type</h6>
                <p className="mb-3">
                  {order.distanceCategory === 'intracity' && 'Intracity Delivery'}
                  {order.distanceCategory === 'nearbyCity' && 'Nearby City Delivery'}
                  {order.distanceCategory === 'intercity' && 'Intercity Delivery'}
                  {order.distanceCategory === 'longDistance' && 'Long Distance Delivery'}
                </p>
                
                <h6>Package Type</h6>
                <p className="mb-0">
                  {order.packageType ? order.packageType.charAt(0).toUpperCase() + order.packageType.slice(1) : 'Standard Package'}
                </p>
              </Col>
              <Col md={6}>
                <h6>Expected Pickup Time</h6>
                <p className="mb-3">
                  {order.expectedPickupTime ? formatDateTime(order.expectedPickupTime) : 'As soon as possible'}
                </p>
                
                <h6>Expected Delivery Time</h6>
                <p className="mb-3">
                  {order.expectedDeliveryTime ? formatDateTime(order.expectedDeliveryTime) : order.estimatedDeliveryTime || 'Calculating...'}
                </p>
                
                <h6>Special Instructions</h6>
                <p className="mb-0">
                  {order.deliveryInstructions || 'No special instructions'}
                </p>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
      
      <Row className="mb-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Body>
              <h5 className="mb-3">Pickup Details</h5>
              <p className="mb-2">
                <FaMapMarkerAlt className="me-2" />
                <strong>Pincode:</strong> {order.pickupPincode}
              </p>
              <p className="mb-0">
                <strong>Address:</strong> {order.pickupAddress || 'N/A'}
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100">
            <Card.Body>
              <h5 className="mb-3">Delivery Details</h5>
              <p className="mb-2">
                <FaMapMarkerAlt className="me-2" />
                <strong>Pincode:</strong> {order.destinationPincode}
              </p>
              <p className="mb-2">
                <strong>Address:</strong> {order.deliveryAddress || 'N/A'}
              </p>
              <p className="mb-2">
                <FaUser className="me-2" />
                <strong>Recipient:</strong> {order.recipientName || 'N/A'}
              </p>
              <p className="mb-0">
                <FaPhone className="me-2" />
                <strong>Contact:</strong> {order.recipientPhone || 'N/A'}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {rider && (
        <Card>
          <Card.Header className="bg-info text-white">
            <h5 className="mb-0">Rider Information</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-light rounded-circle p-3 me-3">
                    <FaUser size={24} />
                  </div>
                  <div>
                    <h5 className="mb-0">{rider.name}</h5>
                    <p className="text-muted mb-0">{rider.rating ? `${rider.rating.toFixed(1)} ★` : 'No ratings yet'}</p>
                  </div>
                </div>
                <p className="mb-2">
                  <FaPhone className="me-2" />
                  <strong>Contact:</strong> {rider.phone}
                </p>
                <p className="mb-0">
                  <FaMotorcycle className="me-2" />
                  <strong>Vehicle:</strong> {rider.vehicleDetails?.model || 'N/A'} ({rider.vehicleDetails?.registrationNumber || 'N/A'})
                </p>
              </Col>
              <Col md={6}>
                {order.status === 'In Transit' && (
                  <div className="border rounded p-3">
                    <h6 className="mb-3">Live Tracking</h6>
                    <p className="mb-2">
                      <strong>Current Location:</strong> {rider.currentLocation ? 
                        `${parseFloat(rider.currentLocation.lat).toFixed(4)}, ${parseFloat(rider.currentLocation.lon).toFixed(4)}` : 
                        'Updating...'}
                    </p>
                    <p className="mb-2">
                      <strong>Last Updated:</strong> {rider.currentLocation ? 
                        formatDateTime(rider.currentLocation.lastUpdated) : 
                        'Waiting for update...'}
                    </p>
                    <div className="d-grid">
                      <Button 
                        variant="primary" 
                        size="sm"
                        href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryAddress || order.destinationPincode}&travelmode=driving`}
                        target="_blank"
                      >
                        <FaRoute className="me-2" /> Open in Maps
                      </Button>
                    </div>
                  </div>
                )}
                
                {order.status === 'Rider Assigned' && (
                  <div className="border rounded p-3 bg-light">
                    <h6>Rider is on the way to pickup</h6>
                    <p className="mb-0">Your parcel will be picked up soon.</p>
                  </div>
                )}
                
                {order.status === 'Picked Up' && (
                  <div className="border rounded p-3 bg-light">
                    <h6>Parcel has been picked up</h6>
                    <p className="mb-0">Your parcel is being prepared for transit.</p>
                  </div>
                )}
                
                {order.status === 'Delivered' && (
                  <div className="border rounded p-3 bg-success text-white">
                    <h6>Delivery Completed</h6>
                    <p className="mb-0">Your parcel has been delivered successfully.</p>
                  </div>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
} 