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

  // Fetch rider data when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      console.log('User authenticated, fetching rider data...');
      console.log('Session user:', session?.user);
      console.log('User role:', session?.user?.role);
      
      fetchRiderData();
    }
  }, [status, session]);
  
  // Fetch orders and deliveries when rider is authenticated and not pending approval
  useEffect(() => {
    if (status === 'authenticated' && rider && !pendingApproval) {
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
  }, [status, rider, pendingApproval]);

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

  const processPendingUpdates = useCallback(async () => {
    if (!isOnline || pendingUpdates.length === 0) return;
    
    // Create a copy of the updates to process
    const updates = [...pendingUpdates];
    // Clear the pending updates immediately to prevent duplicate processing
    setPendingUpdates([]);
    
    // Track failed updates to add back to the queue
    const failedUpdates = [];
    
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
        failedUpdates.push(update);
      }
    }
    
    // Add failed updates back to the queue
    if (failedUpdates.length > 0) {
      setPendingUpdates(prev => [...prev, ...failedUpdates]);
    }
  }, [isOnline, pendingUpdates, updateRiderLocation, updateDeliveryStatus]);

  // Move updateRiderLocation function before startLocationTracking
  const updateRiderLocation = useCallback(async (location) => {
    if (!isOnline || !rider) {
      // Store update for later if offline
      setPendingUpdates(prev => [...prev, {
        type: 'location',
        data: location,
        timestamp: new Date().toISOString()
      }]);
      return Promise.reject(new Error('Offline or rider not available'));
    }
    
    try {
      // Ensure location has the correct format
      const normalizedLocation = {
        lat: location.lat.toString(),
        lon: location.lon.toString(),
        accuracy: location.accuracy ? location.accuracy.toString() : undefined
      };
      
      const response = await fetch('/api/rider/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          location: normalizedLocation, 
          riderId: rider.riderId || rider.id 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update location');
      }
      
      return true;
    } catch (error) {
      console.error('Error updating location:', error);
      // Store update for later if request fails
      setPendingUpdates(prev => [...prev, {
        type: 'location',
        data: location,
        timestamp: new Date().toISOString()
      }]);
      throw error;
    }
  }, [isOnline, rider, setPendingUpdates]);

  const updateDeliveryStatus = useCallback(async (orderId, status, notes) => {
    if (!orderId || !status) {
      console.error('Invalid order ID or status');
      throw new Error('Invalid order ID or status');
    }
    
    if (!isOnline) {
      // Store update for later if offline
      setPendingUpdates(prev => [...prev, {
        type: 'status',
        data: { orderId, status, notes },
        timestamp: new Date().toISOString()
      }]);
      return Promise.reject(new Error('Cannot update status while offline'));
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
      
      return true;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      // Store for retry if it's a network error
      if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
        setPendingUpdates(prev => [...prev, {
          type: 'status',
          data: { orderId, status, notes },
          timestamp: new Date().toISOString()
        }]);
      }
      throw error;
    }
  }, [isOnline, setPendingUpdates]);

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return;
    }
    
    // Last known location
    let lastLocation = null;
    // Last successful update timestamp
    let lastUpdateTime = Date.now();
    // Failed update count for exponential backoff
    let failedUpdates = 0;
    // Minimum distance (in meters) to trigger a location update
    const minDistanceThreshold = 100; // 100 meters
    // Maximum time between updates regardless of movement
    const maxUpdateInterval = 15 * 60 * 1000; // 15 minutes
    // Store timeout IDs for cleanup
    let locationCheckTimeout = null;
    
    // Calculate distance between two points using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
          typeof lat2 !== 'number' || typeof lon2 !== 'number') {
        return Infinity; // Force update if any coordinate is invalid
      }
      
      const R = 6371e3; // Earth radius in meters
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c; // Distance in meters
    };
    
    // Determine update interval based on rider status and activity
    const getUpdateInterval = () => {
      // If we've had consecutive failures, use exponential backoff
      if (failedUpdates > 0) {
        const backoffTime = Math.min(60000 * Math.pow(2, failedUpdates - 1), 15 * 60 * 1000);
        console.log(`Using backoff time of ${backoffTime}ms after ${failedUpdates} failed updates`);
        return backoffTime;
      }
      
      // If rider is busy (has active delivery), update more frequently
      if (rider?.status === 'busy' || activeDeliveries?.length > 0) {
        return 30000; // 30 seconds
      }
      
      // If rider is available but no active deliveries, update less frequently
      if (rider?.status === 'available') {
        return 60000; // 1 minute
      }
      
      // If rider is offline or in another state, update very infrequently
      return 300000; // 5 minutes
    };
    
    // Validate and normalize location data
    const normalizeLocation = (position) => {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Basic validation
        if (typeof lat !== 'number' || typeof lon !== 'number' ||
            isNaN(lat) || isNaN(lon) || 
            lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          console.error('Invalid coordinates:', lat, lon);
          return null;
        }
        
        return {
          lat,
          lon,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp || Date.now()
        };
      } catch (error) {
        console.error('Error normalizing location:', error);
        return null;
      }
    };
    
    // Get initial location
    navigator.geolocation.getCurrentPosition(
      position => {
        const location = normalizeLocation(position);
        if (location) {
          setCurrentLocation(location);
          updateRiderLocation(location)
            .then(() => {
              lastLocation = location;
              lastUpdateTime = Date.now();
              failedUpdates = 0;
            })
            .catch(error => {
              console.error('Failed to update initial location:', error);
              failedUpdates++;
            });
        }
      },
      error => {
        console.error('Error getting initial location:', error);
        failedUpdates++;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
    
    // Set up interval to update location with adaptive frequency
    const checkLocation = () => {
      navigator.geolocation.getCurrentPosition(
        position => {
          const newLocation = normalizeLocation(position);
          if (!newLocation) {
            console.error('Invalid location data received');
            failedUpdates++;
            locationCheckTimeout = setTimeout(checkLocation, getUpdateInterval());
            return;
          }
          
          // Calculate distance from last update
          let shouldUpdate = false;
          const now = Date.now();
          
          if (lastLocation) {
            const distance = calculateDistance(
              lastLocation.lat, lastLocation.lon,
              newLocation.lat, newLocation.lon
            );
            
            const timeSinceLastUpdate = now - lastUpdateTime;
            
            // Update if:
            // 1. Moved more than threshold distance, OR
            // 2. Maximum time between updates has elapsed
            shouldUpdate = distance > minDistanceThreshold || 
                          timeSinceLastUpdate > maxUpdateInterval;
                          
            if (shouldUpdate) {
              console.log(`Updating location: moved ${distance.toFixed(2)}m, time since last update: ${(timeSinceLastUpdate/1000).toFixed(0)}s`);
            }
          } else {
            // Always update if we don't have a last location
            shouldUpdate = true;
          }
          
          if (shouldUpdate) {
            setCurrentLocation(newLocation);
            updateRiderLocation(newLocation)
              .then(() => {
                lastLocation = newLocation;
                lastUpdateTime = now;
                failedUpdates = 0;
              })
              .catch(error => {
                console.error('Failed to update location on server:', error);
                failedUpdates++;
              });
          } else {
            console.log('Skipping location update - not enough movement');
          }
          
          // Schedule next check with adaptive interval
          locationCheckTimeout = setTimeout(checkLocation, getUpdateInterval());
        },
        error => {
          console.error('Error getting location:', error);
          failedUpdates++;
          // Even on error, continue checking with backoff interval
          locationCheckTimeout = setTimeout(checkLocation, getUpdateInterval());
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };
    
    // Start the adaptive location checking
    locationCheckTimeout = setTimeout(checkLocation, getUpdateInterval());
    
    // Store the timeout ID for cleanup
    setLocationUpdateInterval(locationCheckTimeout);
    
    // Return cleanup function
    return () => {
      if (locationCheckTimeout) {
        clearTimeout(locationCheckTimeout);
      }
    };
  }, [rider, activeDeliveries, updateRiderLocation, setCurrentLocation]);

  const fetchRiderData = useCallback(async () => {
    try {
      setLoading(true);
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
  }, []);

  const fetchAvailableOrders = useCallback(async () => {
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
      setAvailableOrders(data.orders || []); // Added fallback for null/undefined
    } catch (error) {
      console.error('Error fetching available orders:', error);
    }
  }, []);

  const fetchActiveDeliveries = useCallback(async () => {
    try {
      const response = await fetch('/api/rider/active-deliveries');
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to fetch active deliveries:', data.error);
        return;
      }
      
      const data = await response.json();
      setActiveDeliveries(data.deliveries || []); // Added fallback for null/undefined
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    }
  }, []);

  const fetchCompletedDeliveries = useCallback(async () => {
    try {
      const response = await fetch('/api/rider/completed-deliveries');
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to fetch completed deliveries:', data.error);
        return;
      }
      
      const data = await response.json();
      setCompletedDeliveries(data.deliveries || []); // Added fallback for null/undefined
    } catch (error) {
      console.error('Error fetching completed deliveries:', error);
    }
  }, []);

  const handleAcceptOrder = async (orderId) => {
    if (!orderId) {
      console.error('Invalid order ID');
      throw new Error('Invalid order ID');
    }
    
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
    if (!orderId) {
      console.error('Invalid order ID');
      throw new Error('Invalid order ID');
    }
    
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
    if (!orderId || !status) {
      console.error('Invalid order ID or status');
      throw new Error('Invalid order ID or status');
    }
    
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
                  <h5>Welcome, {rider?.name || session?.user?.name || 'Rider'}!</h5>
                  <p className="text-muted">
                    {!isOnline && <Badge bg="danger" className="me-2">Offline</Badge>}
                    <Badge bg={rider?.status === 'available' ? 'success' : 'warning'} className="me-2">
                      {rider?.status === 'available' ? 'Available' : 'Busy'}
                    </Badge>
                    <span>Vehicle: {rider?.vehicleDetails?.type || 'N/A'} - {rider?.vehicleDetails?.model || 'N/A'}</span>
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

      <Row className="mb-3">
        <Col>
          <div className="simple-tabs">
            <div 
              className={`simple-tab ${activeTab === 'available' ? 'active' : ''}`}
              onClick={() => setActiveTab('available')}
              role="button"
              tabIndex={0}
              aria-label="Show available orders"
            >
              <FaClipboardList className="me-2" />
              Available Orders {availableOrders?.length > 0 && `(${availableOrders.length})`}
            </div>
            <div 
              className={`simple-tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
              role="button"
              tabIndex={0}
              aria-label="Show active deliveries"
            >
              <FaRoute className="me-2" />
              Active Deliveries {activeDeliveries?.length > 0 && `(${activeDeliveries.length})`}
            </div>
            <div 
              className={`simple-tab ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
              role="button"
              tabIndex={0}
              aria-label="Show completed deliveries"
            >
              <FaHistory className="me-2" />
              Completed Deliveries
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          {activeTab === 'available' && (
            <>
              {console.log('Rendering available orders tab, orders:', availableOrders)}
              {!availableOrders || availableOrders.length === 0 ? (
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
            </>
          )}

          {activeTab === 'active' && (
            <>
              {!activeDeliveries || activeDeliveries.length === 0 ? (
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
            </>
          )}

          {activeTab === 'completed' && (
            <>
              {!completedDeliveries || completedDeliveries.length === 0 ? (
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
                            <td>{delivery.orderId.substring(0, 8)}...</td>
                            <td>{new Date(delivery.completedAt || delivery.updatedAt || delivery.createdAt).toLocaleDateString()}</td>
                            <td>{delivery.customerName || 'N/A'}</td>
                            <td>{delivery.pickupAddress?.substring(0, 15) || 'N/A'}...</td>
                            <td>{delivery.destinationAddress?.substring(0, 15) || 'N/A'}...</td>
                            <td>
                              <Badge bg={
                                delivery.status === 'delivered' ? 'success' :
                                delivery.status === 'failed_delivery' ? 'danger' :
                                'secondary'
                              }>
                                {delivery.status}
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
            </>
          )}
        </Col>
      </Row>

      <style jsx global>{`
        .simple-tabs {
          display: flex;
          overflow-x: auto;
          background-color: #f8f9fa;
          border-radius: 10px;
          padding: 5px;
        }
        
        .simple-tab {
          padding: 12px 16px;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          border-radius: 8px;
          margin: 0 5px;
          transition: all 0.3s ease;
        }
        
        .simple-tab.active {
          background-color: #007bff;
          color: white;
        }
        
        @media (max-width: 768px) {
          .simple-tabs {
            flex-wrap: wrap;
          }
          
          .simple-tab {
            flex: 1 1 40%;
            margin: 5px;
            justify-content: center;
          }
        }
      `}</style>
    </Container>
  );
} 