'use client'

import { useEffect, useState, useCallback } from 'react'
import { Container, Row, Col, Card, Badge, Alert, Spinner, Button } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime, getStatusBadgeVariant } from '../../lib/utils'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const fetchOrders = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    
    setError('')
    
    try {
      const response = await fetch('/api/orders/user')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch orders: ${response.status}`)
      }
      
      const data = await response.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError('Failed to load your orders. Please try again later.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Redirect vendors to vendor dashboard
    if (status === 'authenticated' && session?.user?.role === 'vendor') {
      router.push('/vendor/dashboard')
      return
    }

    if (session && session.user && session.user.role !== 'vendor') {
      fetchOrders()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [session, status, router, fetchOrders])

  const handleRefresh = () => {
    fetchOrders(true)
  }

  if (status === 'loading') {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    )
  }

  // If user is a vendor, show a loading indicator while redirecting
  if (session?.user?.role === 'vendor') {
    return (
      <Container className="py-5 text-center">
        <p>Redirecting to vendor dashboard...</p>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Redirecting...</span>
        </Spinner>
      </Container>
    )
  }

  if (!session) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>Please sign in to view your dashboard.</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Link href="/auth/signin" className="btn btn-warning">
              Sign In
            </Link>
          </div>
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>My Orders</h2>
        <div>
          <Button 
            variant="outline-secondary" 
            className="me-2" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-1"
                />
                Refreshing...
              </>
            ) : 'Refresh'}
          </Button>
          <Link href="/" className="btn btn-primary">
            Create New Order
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4" dismissible onClose={() => setError('')}>
          {error}
          <div className="mt-2">
            <Button variant="outline-danger" size="sm" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        </Alert>
      )}
      
      {loading ? (
        <div className="text-center py-3">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : orders.length === 0 ? (
        <Alert variant="info">
          <Alert.Heading>No Orders Found</Alert.Heading>
          <p>You haven't placed any orders yet. Create your first order to get started!</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Link href="/" className="btn btn-primary">
              Create First Order
            </Link>
          </div>
        </Alert>
      ) : (
        <Row>
          {orders.map(order => {
            if (!order || !order.orderId) return null;
            
            return (
              <Col key={order.orderId} md={6} className="mb-4">
                <Card>
                  <Card.Body>
                    <Card.Title className="d-flex justify-content-between align-items-center">
                      Order #{order.orderId.slice(0, 8)}
                      <Badge bg={getStatusBadgeVariant(order.status)}>
                        {order.status || 'Unknown'}
                      </Badge>
                    </Card.Title>
                    <Card.Text>
                      <strong>From:</strong> {order.pickupPincode || 'N/A'}<br />
                      <strong>To:</strong> {order.destinationPincode || 'N/A'}<br />
                      <strong>Size:</strong> {order.moveSize || 'N/A'}<br />
                      <strong>Date:</strong> {formatDate(order.moveDate)}
                    </Card.Text>
                    <Link 
                      href={`/order/${order.orderId}`}
                      className="btn btn-outline-primary w-100"
                    >
                      View Details
                    </Link>
                  </Card.Body>
                  <Card.Footer className="text-muted">
                    <small>Created: {formatDateTime(order.createdAt)}</small>
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  )
} 