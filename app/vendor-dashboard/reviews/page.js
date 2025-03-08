'use client'

import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Spinner, Alert, Tabs, Tab } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import ReviewList from '../../../components/ReviewList'
import VendorResponseForm from '../../../components/VendorResponseForm'
import { formatDateTime, getStarRating } from '../../../lib/utils'

export default function VendorReviewsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [vendor, setVendor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [pendingResponses, setPendingResponses] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchVendorData()
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false)
    }
  }, [sessionStatus])

  const fetchVendorData = async () => {
    try {
      // Fetch vendor profile
      const profileResponse = await fetch('/api/vendor/profile')
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch vendor profile')
      }
      const profileData = await profileResponse.json()
      setVendor(profileData)

      // Fetch reviews that need responses
      await fetchPendingResponses(profileData.vendorId)
    } catch (err) {
      console.error('Error fetching vendor data:', err)
      setError('Failed to load vendor data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingResponses = async (vendorId) => {
    if (!vendorId) return;
    
    try {
      // Use query parameters for better efficiency
      const params = new URLSearchParams({
        vendorId,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      const reviewsResponse = await fetch(`/api/reviews?${params.toString()}`);
      if (!reviewsResponse.ok) {
        throw new Error('Failed to fetch reviews');
      }
      
      const reviewsData = await reviewsResponse.json();
      
      // Filter for reviews without vendor responses
      const pending = reviewsData.reviews.filter(review => !review.vendorResponse);
      setPendingResponses(pending);
    } catch (err) {
      console.error('Error fetching pending responses:', err);
      // Don't set error state here to avoid disrupting the main page
    }
  }

  const handleResponseSubmitted = (data) => {
    // Refresh the reviews list
    setRefreshTrigger(prev => prev + 1)
    
    // Update the pending responses list
    setPendingResponses(prev => 
      prev.filter(review => review.reviewId !== data.reviewId)
    )
  }

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    )
  }

  if (!session) {
    return (
      <Container className="py-5">
        <Alert variant="info">
          <Alert.Heading>Authentication Required</Alert.Heading>
          <p>Please sign in to view your vendor dashboard.</p>
        </Alert>
      </Container>
    )
  }

  if (error || !vendor) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error || 'Failed to load vendor data'}</p>
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">Manage Reviews</h1>
      
      <Row className="mb-4">
        <Col md={4}>
          <Card className="h-100">
            <Card.Body className="d-flex flex-column">
              <Card.Title>Review Summary</Card.Title>
              <div className="d-flex align-items-center mb-3">
                <div className="me-2">
                  {getStarRating(vendor.rating || 0)}
                </div>
                <span>
                  <strong>{vendor.rating?.toFixed(1) || '0.0'}</strong>
                  <span className="text-muted ms-1">
                    ({vendor.reviewCount || 0} reviews)
                  </span>
                </span>
              </div>
              <div className="mt-auto">
                <Alert variant={pendingResponses.length > 0 ? 'warning' : 'success'} className="mb-0">
                  {pendingResponses.length > 0 
                    ? `${pendingResponses.length} reviews need your response`
                    : 'All reviews have been responded to'}
                </Alert>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Review Analytics</Card.Title>
              <p>Track your review performance over time and identify trends.</p>
              <ul>
                <li>Monitor your average rating over time</li>
                <li>Identify common themes in customer feedback</li>
                <li>Compare your performance against similar vendors</li>
              </ul>
              <p className="text-muted">
                Responding to reviews promptly can improve your overall rating and customer satisfaction.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="all" title="All Reviews">
          <ReviewList 
            vendorId={vendor.vendorId} 
            refreshTrigger={refreshTrigger}
          />
        </Tab>
        <Tab 
          eventKey="pending" 
          title={`Pending Responses (${pendingResponses.length})`}
        >
          {pendingResponses.length === 0 ? (
            <Alert variant="success">
              You have responded to all reviews. Great job!
            </Alert>
          ) : (
            <div>
              {pendingResponses.map(review => (
                <Card key={review.reviewId} className="mb-4">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <div className="d-flex align-items-center mb-1">
                          <div className="me-2">
                            {getStarRating(review.rating)}
                          </div>
                          <strong>{review.rating.toFixed(1)}</strong>
                        </div>
                        <div className="text-muted small">
                          {review.userName || 'Anonymous'} • {formatDateTime(review.createdAt)}
                        </div>
                      </div>
                      {review.orderDetails && (
                        <div className="text-muted small">
                          Order #{review.orderDetails.orderNumber || review.orderId}
                        </div>
                      )}
                    </div>
                    
                    <p className="mb-4">{review.comment || 'No comment provided.'}</p>
                    
                    <VendorResponseForm 
                      reviewId={review.reviewId}
                      orderId={review.orderId}
                      vendorId={vendor.vendorId}
                      onResponseSubmitted={handleResponseSubmitted}
                    />
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Tab>
      </Tabs>
    </Container>
  )
} 