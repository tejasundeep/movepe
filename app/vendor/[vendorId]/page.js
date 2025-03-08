'use client'

import { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Spinner, Alert, Badge, ListGroup } from 'react-bootstrap'
import { formatCurrency, getStarRating } from '../../../lib/utils'
import ReviewList from '../../../components/ReviewList'

export default function VendorDetailsPage({ params }) {
  const { vendorId } = params
  const [vendor, setVendor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshReviews, setRefreshReviews] = useState(0)

  useEffect(() => {
    const fetchVendorDetails = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/vendors/${vendorId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch vendor details')
        }

        const data = await response.json()
        setVendor(data)
      } catch (err) {
        console.error('Error fetching vendor details:', err)
        setError('Failed to load vendor details. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchVendorDetails()
  }, [vendorId])

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading vendor details...</span>
        </Spinner>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    )
  }

  if (!vendor) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Vendor not found</Alert>
      </Container>
    )
  }

  return (
    <Container className="py-5">
      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h1 className="mb-0">{vendor.name}</h1>
                <Badge 
                  bg={vendor.isAvailable ? 'success' : 'danger'}
                  className="ms-2"
                >
                  {vendor.isAvailable ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
              
              <div className="d-flex align-items-center mb-3">
                <div className="me-2">
                  {getStarRating(vendor.rating || 0)}
                </div>
                <span className="text-muted">
                  {vendor.rating?.toFixed(1) || 'No ratings'} ({vendor.reviewCount || 0} reviews)
                </span>
              </div>
              
              <h5>Base Price: {formatCurrency(vendor.basePrice)}</h5>
              
              <div className="mt-4">
                <h4>About</h4>
                <p>{vendor.description || 'No description available.'}</p>
              </div>
            </Card.Body>
          </Card>
          
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">Services</h4>
            </Card.Header>
            <ListGroup variant="flush">
              {vendor.services && vendor.services.length > 0 ? (
                vendor.services.map((service, index) => (
                  <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">{service.name}</h5>
                      <p className="mb-0 text-muted">{service.description}</p>
                    </div>
                    <Badge bg="primary" pill>
                      {formatCurrency(service.price)}
                    </Badge>
                  </ListGroup.Item>
                ))
              ) : (
                <ListGroup.Item>No services listed</ListGroup.Item>
              )}
            </ListGroup>
          </Card>
          
          <Card className="mb-4">
            <Card.Body>
              <ReviewList 
                vendorId={vendorId} 
                refreshTrigger={refreshReviews}
              />
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">Service Areas</h4>
            </Card.Header>
            <ListGroup variant="flush">
              {vendor.serviceAreas && vendor.serviceAreas.length > 0 ? (
                vendor.serviceAreas.map((area, index) => (
                  <ListGroup.Item key={index}>
                    {area}
                  </ListGroup.Item>
                ))
              ) : (
                <ListGroup.Item>No service areas specified</ListGroup.Item>
              )}
            </ListGroup>
          </Card>
          
          <Card>
            <Card.Header>
              <h4 className="mb-0">Contact Information</h4>
            </Card.Header>
            <Card.Body>
              <p><strong>Email:</strong> {vendor.email || 'Not provided'}</p>
              <p><strong>Phone:</strong> {vendor.phone || 'Not provided'}</p>
              <p><strong>Address:</strong> {vendor.address || 'Not provided'}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
} 