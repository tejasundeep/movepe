'use client'

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Badge, Form, Button, Alert, Spinner, Tabs, Tab } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import RequestCard from './components/RequestCard'
import CrossLeadForm from './components/CrossLeadForm'
import AffiliateStats from './components/AffiliateStats'
import CrossLeadsList from './components/CrossLeadsList'
import MySubmittedLeads from './components/MySubmittedLeads'
import { toast } from 'react-hot-toast'

// Quote Form Component
function QuoteForm({ onSubmit }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    // Validate amount
    const numAmount = Number(amount)
    if (!amount || isNaN(numAmount)) {
      setError('Please enter a valid amount')
      return
    }
    
    if (numAmount < 1000) {
      setError('Minimum quote amount is ₹1,000')
      return
    }
    
    setSubmitting(true)
    
    try {
      onSubmit(numAmount)
        .catch(err => {
          setError(err.message || 'Failed to submit quote. Please try again.')
          setSubmitting(false)
        })
    } catch (err) {
      setError('Failed to submit quote. Please try again.')
      setSubmitting(false)
    }
  }
  
  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Quote Amount (₹)</Form.Label>
        <Form.Control
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setError('')
          }}
          required
          min="1000"
          placeholder="Enter your quote amount"
          disabled={submitting}
        />
        <Form.Text className="text-muted">
          Minimum quote amount is ₹1,000
        </Form.Text>
        {error && <div className="text-danger mt-1">{error}</div>}
      </Form.Group>
      <Button 
        type="submit" 
        variant="primary" 
        className="w-100"
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit Quote'}
      </Button>
    </Form>
  )
}

// Helper function to safely format dates
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
}

export default function VendorDashboard() {
  const { data: session, status } = useSession()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState('available')
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchRequests()
    }
  }, [session])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/vendor/requests')
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests')
      }
      
      const data = await response.json()
      setRequests(data)
    } catch (error) {
      console.error('Error fetching requests:', error)
      setError('Failed to load requests. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitQuote = async (orderId, amount) => {
    try {
      const response = await fetch(`/api/vendor/quotes/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to submit quote')
      }

      const responseData = await response.json();
      
      // Refresh requests after submitting quote
      fetchRequests()
      
      // Return the response data so the component can use it
      return responseData;
    } catch (error) {
      console.error('Error submitting quote:', error)
      toast.error(error.message || 'Failed to submit quote')
      throw error
    }
  }

  const handleAvailabilityChange = async (e) => {
    const newAvailability = e.target.value
    setAvailability(newAvailability)
    
    try {
      const response = await fetch('/api/vendor/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ availability: newAvailability })
      })

      if (!response.ok) {
        throw new Error('Failed to update availability')
      }
    } catch (error) {
      console.error('Error updating availability:', error)
      // Revert availability if update fails
      setAvailability(availability)
    }
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

  if (!session) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Please sign in to access the vendor dashboard.
        </Alert>
      </Container>
    )
  }

  // Filter requests by category
  const newRequests = requests.filter(r => !r.submittedQuote && !r.wonOpportunity && !r.lostOpportunity)
  const submittedQuotes = requests.filter(r => r.submittedQuote && !r.wonOpportunity && !r.lostOpportunity)
  const wonOpportunities = requests.filter(r => r.wonOpportunity)
  const lostOpportunities = requests.filter(r => r.lostOpportunity)

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="mb-0">Vendor Dashboard</h2>
            <div className="d-flex align-items-center">
              <Form.Select 
                value={availability}
                onChange={handleAvailabilityChange}
                style={{ width: 'auto' }}
                className="me-2"
              >
                <option value="available">Available for Orders</option>
                <option value="unavailable">Not Available</option>
              </Form.Select>
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={fetchRequests}
              >
                Refresh
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <AffiliateStats />
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <CrossLeadForm onSubmitSuccess={fetchRequests} />
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Cross Leads</h5>
            </Card.Header>
            <Card.Body>
              <Tabs 
                defaultActiveKey="submitted"
                className="mb-3"
                fill
              >
                <Tab eventKey="submitted" title="Submitted Leads">
                  <CrossLeadsList />
                </Tab>
                <Tab eventKey="manage" title="My Cross Leads">
                  <MySubmittedLeads />
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Order Requests</h5>
            </Card.Header>
            <Card.Body className="p-0">
              {error ? (
                <Alert variant="danger" className="m-3">
                  {error}
                </Alert>
              ) : loading ? (
                <div className="text-center p-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : requests.length === 0 ? (
                <Alert variant="info" className="m-3">
                  No order requests found. Make sure your service areas are set up correctly.
                </Alert>
              ) : (
                <Tabs defaultActiveKey="new" className="mb-3">
                  <Tab eventKey="new" title={`New Requests (${newRequests.length})`}>
                    <div className="p-3">
                      {newRequests.length === 0 ? (
                        <Alert variant="info">No new requests.</Alert>
                      ) : (
                        newRequests.map(request => (
                          <RequestCard
                            key={request.orderId}
                            request={request}
                            onSubmitQuote={handleSubmitQuote}
                          />
                        ))
                      )}
                    </div>
                  </Tab>
                  <Tab eventKey="submitted" title={`Submitted Quotes (${submittedQuotes.length})`}>
                    <div className="p-3">
                      {submittedQuotes.length === 0 ? (
                        <Alert variant="info">No submitted quotes.</Alert>
                      ) : (
                        submittedQuotes.map(request => (
                          <RequestCard
                            key={request.orderId}
                            request={request}
                            onSubmitQuote={handleSubmitQuote}
                          />
                        ))
                      )}
                    </div>
                  </Tab>
                  <Tab eventKey="won" title={`Won Opportunities (${wonOpportunities.length})`}>
                    <div className="p-3">
                      {wonOpportunities.length === 0 ? (
                        <Alert variant="info">No won opportunities.</Alert>
                      ) : (
                        wonOpportunities.map(request => (
                          <RequestCard
                            key={request.orderId}
                            request={request}
                            onSubmitQuote={handleSubmitQuote}
                          />
                        ))
                      )}
                    </div>
                  </Tab>
                  <Tab eventKey="lost" title={`Lost Opportunities (${lostOpportunities.length})`}>
                    <div className="p-3">
                      {lostOpportunities.length === 0 ? (
                        <Alert variant="info">No lost opportunities.</Alert>
                      ) : (
                        lostOpportunities.map(request => (
                          <RequestCard
                            key={request.orderId}
                            request={request}
                            onSubmitQuote={handleSubmitQuote}
                          />
                        ))
                      )}
                    </div>
                  </Tab>
                </Tabs>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
} 