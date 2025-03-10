import React, { useState, useEffect } from 'react';
import { Card, ProgressBar, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { useSocket } from '../lib/hooks/useSocket';

/**
 * Order Tracker Component
 * 
 * This component provides real-time tracking for an order, showing its current status,
 * location, and estimated delivery time.
 * 
 * @param {Object} props - Component props
 * @param {string} props.orderId - The ID of the order to track
 * @param {Object} props.initialOrderData - Initial order data (optional)
 */
const OrderTracker = ({ orderId, initialOrderData }) => {
  const [orderData, setOrderData] = useState(initialOrderData || null);
  const [loading, setLoading] = useState(!initialOrderData);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Connect to the WebSocket for real-time updates
  const { isConnected, error: socketError } = useSocket({
    autoConnect: true,
    events: {
      'order-status-update': handleOrderStatusUpdate,
      'rider-location-update': handleRiderLocationUpdate,
    },
  });

  // Handle order status updates
  function handleOrderStatusUpdate(data) {
    if (data.orderId === orderId) {
      setOrderData(prevData => ({
        ...prevData,
        ...data,
      }));
      setLastUpdated(new Date());
    }
  }

  // Handle rider location updates
  function handleRiderLocationUpdate(data) {
    if (data.orderId === orderId) {
      setOrderData(prevData => ({
        ...prevData,
        riderLocation: data.location,
        estimatedArrival: data.estimatedArrival,
      }));
      setLastUpdated(new Date());
    }
  }

  // Fetch order data on component mount
  useEffect(() => {
    if (!initialOrderData) {
      fetchOrderData();
    }
  }, [initialOrderData]);

  // Fetch order data from the API
  async function fetchOrderData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order data');
      }
      
      const data = await response.json();
      setOrderData(data.order);
    } catch (err) {
      console.error('Error fetching order data:', err);
      setError('Failed to load order data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Calculate progress percentage based on order status
  function calculateProgress() {
    const statusMap = {
      'initiated': 0,
      'quotes_received': 10,
      'accepted': 20,
      'paid': 30,
      'scheduled': 40,
      'in_progress': 60,
      'picked_up': 70,
      'in_transit': 80,
      'delivered': 100,
      'cancelled': 0,
    };
    
    return statusMap[orderData?.status] || 0;
  }

  // Get status badge variant based on order status
  function getStatusBadgeVariant() {
    const variantMap = {
      'initiated': 'info',
      'quotes_received': 'info',
      'accepted': 'primary',
      'paid': 'primary',
      'scheduled': 'primary',
      'in_progress': 'warning',
      'picked_up': 'warning',
      'in_transit': 'warning',
      'delivered': 'success',
      'cancelled': 'danger',
    };
    
    return variantMap[orderData?.status] || 'secondary';
  }

  // Format the status for display
  function formatStatus(status) {
    if (!status) return '';
    
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Render loading state
  if (loading) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-3 text-muted">Loading order details...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="danger" className="mb-4">
        <Alert.Heading>Error Loading Order</Alert.Heading>
        <p>{error}</p>
        <div className="d-flex justify-content-end">
          <Button variant="outline-danger" onClick={fetchOrderData}>
            Try Again
          </Button>
        </div>
      </Alert>
    );
  }

  // Render when no order data is available
  if (!orderData) {
    return (
      <Alert variant="warning" className="mb-4">
        <Alert.Heading>Order Not Found</Alert.Heading>
        <p>The requested order could not be found or you don't have permission to view it.</p>
      </Alert>
    );
  }

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-white border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Order Tracking</h5>
          <Badge bg={getStatusBadgeVariant()} className="px-3 py-2">
            {formatStatus(orderData.status)}
          </Badge>
        </div>
      </Card.Header>
      
      <Card.Body>
        {/* Order Progress */}
        <div className="mb-4">
          <ProgressBar 
            now={calculateProgress()} 
            variant={getStatusBadgeVariant()}
            className="mb-2"
          />
          <div className="d-flex justify-content-between text-muted small">
            <span>Order Placed</span>
            <span>In Progress</span>
            <span>Delivered</span>
          </div>
        </div>
        
        {/* Order Details */}
        <div className="mb-4">
          <h6 className="text-uppercase text-muted small">Order Details</h6>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="border rounded p-3">
                <div className="small text-muted">Order Number</div>
                <div className="fw-bold">{orderData.orderNumber}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border rounded p-3">
                <div className="small text-muted">Order Type</div>
                <div className="fw-bold text-capitalize">{orderData.orderType}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Location Information */}
        <div className="mb-4">
          <h6 className="text-uppercase text-muted small">Location Information</h6>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="border rounded p-3">
                <div className="small text-muted">Pickup</div>
                <div className="fw-bold">{orderData.pickupAddress}</div>
                <div className="small text-muted mt-1">Pincode: {orderData.pickupPincode}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border rounded p-3">
                <div className="small text-muted">Destination</div>
                <div className="fw-bold">{orderData.destinationAddress}</div>
                <div className="small text-muted mt-1">Pincode: {orderData.destinationPincode}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Rider Information (if assigned) */}
        {orderData.riderId && (
          <div className="mb-4">
            <h6 className="text-uppercase text-muted small">Rider Information</h6>
            <div className="border rounded p-3">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <div className={`rounded-circle bg-${isConnected ? 'success' : 'secondary'} text-white d-flex align-items-center justify-content-center`} style={{ width: '48px', height: '48px' }}>
                    <i className="bi bi-person"></i>
                  </div>
                </div>
                <div>
                  <div className="fw-bold">{orderData.riderName || 'Assigned Rider'}</div>
                  <div className="small text-muted">
                    {isConnected ? (
                      <span className="text-success">
                        <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>
                        Online - Tracking Active
                      </span>
                    ) : (
                      <span className="text-secondary">
                        <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>
                        Offline - Tracking Unavailable
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {orderData.estimatedArrival && (
                <div className="mt-3 p-2 bg-light rounded">
                  <div className="small text-muted">Estimated Arrival</div>
                  <div className="fw-bold">{new Date(orderData.estimatedArrival).toLocaleTimeString()}</div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Status History */}
        {orderData.statusHistory && orderData.statusHistory.length > 0 && (
          <div>
            <h6 className="text-uppercase text-muted small">Status Updates</h6>
            <div className="border rounded p-3">
              <ul className="list-unstyled mb-0">
                {orderData.statusHistory.map((update, index) => (
                  <li key={index} className={index !== orderData.statusHistory.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}>
                    <div className="d-flex">
                      <div className="me-3">
                        <Badge bg={update.status === orderData.status ? getStatusBadgeVariant() : 'secondary'} className="px-2 py-1">
                          {formatStatus(update.status)}
                        </Badge>
                      </div>
                      <div>
                        <div className="small text-muted">
                          {new Date(update.timestamp).toLocaleString()}
                        </div>
                        {update.notes && <div className="mt-1">{update.notes}</div>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card.Body>
      
      <Card.Footer className="bg-white border-top text-center">
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </small>
          <Button variant="outline-primary" size="sm" onClick={fetchOrderData}>
            Refresh
          </Button>
        </div>
        
        {socketError && (
          <Alert variant="warning" className="mt-3 mb-0 py-2 px-3 small">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Live tracking unavailable. Using periodic updates instead.
          </Alert>
        )}
      </Card.Footer>
    </Card>
  );
};

export default OrderTracker; 