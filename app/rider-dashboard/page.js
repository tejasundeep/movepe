'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert, Form, Modal, Nav, Tab } from 'react-bootstrap';
import { FaMotorcycle, FaMapMarkerAlt, FaBox, FaUser, FaPhone, FaCheckCircle, FaTimesCircle, FaRoute, FaHistory, FaClipboardList } from 'react-icons/fa';
import RideRequestCard from '../components/RideRequestCard';
import ActiveDeliveryCard from '../components/ActiveDeliveryCard';

export default function RiderDashboard() {
  const { data: session, status } = useSession();
  console.log('Session in rider dashboard:', session);
  console.log('Session status:', status);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rider, setRider] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [locationUpdateInterval, setLocationUpdateInterval] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [pendingApproval, setPendingApproval] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      console.log('User authenticated, fetching rider data...');
      console.log('Session user:', session?.user);
      console.log('User role:', session?.user?.role);
      
      fetchRiderData();
      
      // Only fetch orders and deliveries if rider is not pending approval
      if (!pendingApproval) {
        fetchAvailableOrders();
        fetchActiveDeliveries();
        fetchCompletedDeliveries();
        
        // Start location tracking
        startLocationTracking();
        
        // Set up refresh intervals
        const ordersInterval = setInterval(fetchAvailableOrders, 30000); // Refresh available orders every 30 seconds
        const deliveriesInterval = setInterval(fetchActiveDeliveries, 30000); // Refresh active deliveries every 30 seconds
        
        // Clean up on unmount
        return () => {
          if (locationUpdateInterval) {
            clearInterval(locationUpdateInterval);
          }
          clearInterval(ordersInterval);
          clearInterval(deliveriesInterval);
        };
      }
    }
  }, [status, pendingApproval]);

  // Check online status
  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);
    
    // Add event listeners for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Try to send any pending updates
      if (pendingUpdates.length > 0) {
        processPendingUpdates();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingUpdates]);

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return;
    }
    
    // Get initial location
    navigator.geolocation.getCurrentPosition(
      position => {
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        setCurrentLocation(location);
        updateRiderLocation(location);
      },
      error => {
        console.error('Error getting location:', error);
      }
    );
    
    // Set up interval to update location
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        position => {
          const location = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          setCurrentLocation(location);
          updateRiderLocation(location);
        },
        error => {
          console.error('Error getting location:', error);
        }
      );
    }, 60000); // Update location every minute
    
    setLocationUpdateInterval(interval);
  };

  const updateRiderLocation = async (location) => {
    if (!isOnline || !rider) {
      // Store update for later if offline
      setPendingUpdates(prev => [...prev, {
        type: 'location',
        data: location,
        timestamp: new Date().toISOString()
      }]);
      return;
    }
    
    try {
      const response = await fetch('/api/rider/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ location })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      // Store update for later if request fails
      setPendingUpdates(prev => [...prev, {
        type: 'location',
        data: location,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const processPendingUpdates = async () => {
    if (!isOnline || pendingUpdates.length === 0) return;
    
    const updates = [...pendingUpdates];
    setPendingUpdates([]);
    
    for (const update of updates) {
      try {
        if (update.type === 'location') {
          await updateRiderLocation(update.data);
        } else if (update.type === 'status') {
          await updateDeliveryStatus(update.data.orderId, update.data.status, update.data.notes);
        }
      } catch (error) {
        console.error('Error processing pending update:', error);
        // Put the update back in the queue
        setPendingUpdates(prev => [...prev, update]);
      }
    }
  };

  const fetchRiderData = async () => {
    try {
      const response = await fetch('/api/rider/profile');
      
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 403) {
          if (data.pendingApproval) {
            setPendingApproval(true);
          } else if (data.error === 'User is not a rider') {
            setError('You are not registered as a rider. Please register as a rider to access this dashboard.');
          } else {
            setError(data.error || 'You do not have permission to access this page.');
          }
        } else {
          setError(data.error || 'Failed to fetch rider data');
        }
        throw new Error(data.error || 'Failed to fetch rider data');
      }
      
      const data = await response.json();
      setRider(data.rider);
    } catch (error) {
      console.error('Error fetching rider data:', error);
      if (!error.message.includes('Failed to fetch rider data')) {
        setError('Failed to load rider profile. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      console.log('Fetching available orders...');
      const response = await fetch('/api/rider/available-orders');
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to fetch available orders:', data);
        if (response.status === 403 && data.pendingApproval) {
          setPendingApproval(true);
          return;
        }
        console.error('Failed to fetch available orders:', data.error);
        return;
      }
      
      const data = await response.json();
      console.log('Available orders:', data.orders);
      setAvailableOrders(data.orders);
    } catch (error) {
      console.error('Error fetching available orders:', error);
    }
  };

  const fetchActiveDeliveries = async () => {
    try {
      const response = await fetch('/api/rider/active-deliveries');
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to fetch active deliveries:', data.error);
        return;
      }
      
      const data = await response.json();
      setActiveDeliveries(data.deliveries);
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    }
  };

  const fetchCompletedDeliveries = async () => {
    try {
      const response = await fetch('/api/rider/completed-deliveries');
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to fetch completed deliveries:', data.error);
        return;
      }
      
      const data = await response.json();
      setCompletedDeliveries(data.deliveries);
    } catch (error) {
      console.error('Error fetching completed deliveries:', error);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const response = await fetch('/api/rider/accept-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept order');
      }
      
      // Refresh data
      fetchAvailableOrders();
      fetchActiveDeliveries();
      
      // Switch to active tab
      setActiveTab('active');
    } catch (error) {
      console.error('Error accepting order:', error);
      throw error;
    }
  };

  const handleDeclineOrder = async (orderId) => {
    try {
      const response = await fetch('/api/rider/decline-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to decline order');
      }
      
      // Refresh available orders
      fetchAvailableOrders();
    } catch (error) {
      console.error('Error declining order:', error);
      throw error;
    }
  };

  const handleUpdateDeliveryStatus = async (orderId, status, notes) => {
    if (!isOnline) {
      // Store update for later if offline
      setPendingUpdates(prev => [...prev, {
        type: 'status',
        data: { orderId, status, notes },
        timestamp: new Date().toISOString()
      }]);
      return;
    }
    
    try {
      const response = await fetch('/api/rider/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId, status, notes })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }
      
      // Refresh data
      fetchActiveDeliveries();
      fetchCompletedDeliveries();
      
      // If delivery is completed, switch to completed tab
      if (status === 'delivered' || status === 'failed_delivery' || status === 'cancelled') {
        setActiveTab('completed');
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p>Loading dashboard...</p>
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <h4>Not Authenticated</h4>
          <p>Please sign in to access the rider dashboard.</p>
          <Button href="/auth/signin" variant="primary">Sign In</Button>
        </Alert>
      </Container>
    );
  }

  if (status === 'authenticated' && session?.user?.role !== 'rider') {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <h4>Access Denied</h4>
          <p>You do not have permission to access the rider dashboard. Your current role is: {session?.user?.role || 'not set'}.</p>
          <p>If you are a rider, please contact support to fix your account.</p>
          <Button href="/" variant="primary">Go Home</Button>
        </Alert>
      </Container>
    );
  }

  if (pendingApproval) {
    return (
      <Container className="py-5">
        <Alert variant="info">
          <h4>Account Pending Approval</h4>
          <p>Your rider account is currently pending approval by our team. You will be notified once your account is approved.</p>
          <p>Thank you for your patience!</p>
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
          <Button onClick={fetchRiderData} variant="primary">Try Again</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <Row>
                <Col md={8}>
                  <h2 className="mb-3">
                    <FaMotorcycle className="me-2" />
                    Rider Dashboard
                  </h2>
                  <h5>Welcome, {rider?.name || session?.user?.name}!</h5>
                  <p className="text-muted">
                    {!isOnline && <Badge bg="danger" className="me-2">Offline</Badge>}
                    <Badge bg={rider?.status === 'available' ? 'success' : 'warning'} className="me-2">
                      {rider?.status === 'available' ? 'Available' : 'Busy'}
                    </Badge>
                    <span>Vehicle: {rider?.vehicleDetails?.type} - {rider?.vehicleDetails?.model}</span>
                  </p>
                </Col>
                <Col md={4} className="text-end">
                  <div className="mb-2">
                    <strong>Completed Deliveries:</strong> {rider?.completedDeliveries || 0}
                  </div>
                  <div className="mb-2">
                    <strong>Rating:</strong> {rider?.rating || 'N/A'} ⭐
                  </div>
                  <div>
                    <strong>Service Areas:</strong> {rider?.serviceAreas?.join(', ') || 'Not specified'}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <Row className="mb-3">
          <Col>
            <Nav variant="tabs">
              <Nav.Item>
                <Nav.Link eventKey="available">
                  <FaClipboardList className="me-1" />
                  Available Orders {availableOrders.length > 0 && `(${availableOrders.length})`}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="active">
                  <FaRoute className="me-1" />
                  Active Deliveries {activeDeliveries.length > 0 && `(${activeDeliveries.length})`}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="completed">
                  <FaHistory className="me-1" />
                  Completed Deliveries
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
        </Row>

        <Row>
          <Col>
            <Tab.Content>
              <Tab.Pane eventKey="available">
                {console.log('Rendering available orders tab, orders:', availableOrders)}
                {availableOrders.length === 0 ? (
                  <Alert variant="info">
                    No available orders at the moment. Check back later!
                  </Alert>
                ) : (
                  availableOrders.map(order => (
                    <RideRequestCard
                      key={order.orderId}
                      request={order}
                      onAccept={handleAcceptOrder}
                      onDecline={handleDeclineOrder}
                    />
                  ))
                )}
              </Tab.Pane>

              <Tab.Pane eventKey="active">
                {activeDeliveries.length === 0 ? (
                  <Alert variant="info">
                    You don't have any active deliveries. Accept an order to get started!
                  </Alert>
                ) : (
                  activeDeliveries.map(delivery => (
                    <ActiveDeliveryCard
                      key={delivery.orderId}
                      delivery={delivery}
                      onUpdateStatus={handleUpdateDeliveryStatus}
                    />
                  ))
                )}
              </Tab.Pane>

              <Tab.Pane eventKey="completed">
                {completedDeliveries.length === 0 ? (
                  <Alert variant="info">
                    You haven't completed any deliveries yet.
                  </Alert>
                ) : (
                  <Card>
                    <Card.Body>
                      <Table responsive>
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Pickup</th>
                            <th>Destination</th>
                            <th>Status</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedDeliveries.map(delivery => (
                            <tr key={delivery.orderId}>
                              <td>#{delivery.orderId.substring(0, 8)}</td>
                              <td>{new Date(delivery.completedAt || delivery.updatedAt).toLocaleDateString()}</td>
                              <td>{delivery.customerName}</td>
                              <td>{delivery.pickupAddress}</td>
                              <td>{delivery.destinationAddress}</td>
                              <td>
                                <Badge bg={delivery.status === 'delivered' ? 'success' : 'danger'}>
                                  {delivery.status === 'delivered' ? 'Delivered' : 'Failed'}
                                </Badge>
                              </td>
                              <td>₹{delivery.amount || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                )}
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </Container>
  );
} 