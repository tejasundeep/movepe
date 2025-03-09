'use client'

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Badge, Button, Alert, Spinner, Tabs, Tab } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { FaCheck, FaTimes, FaMoneyBillWave, FaClipboardList, FaTruck, FaUserClock, FaExchangeAlt } from 'react-icons/fa'
import SimpleRequestCard from './components/SimpleRequestCard'

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
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    jobEarnings: 0,
    affiliateEarnings: 0,
    thisMonth: { total: 0, jobs: 0, affiliate: 0 },
    lastMonth: { total: 0, jobs: 0, affiliate: 0 },
    completedJobsCount: 0
  })
  const [earningsLoading, setEarningsLoading] = useState(false)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('new')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      refreshAllData()
    }
  }, [session])

  const refreshAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchRequests(false),
        fetchVendorProfile(),
        fetchEarnings()
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRequests = async (setLoadingState = true) => {
    if (setLoadingState) setLoading(true)
    setError('')
    
    try {
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
      if (setLoadingState) setLoading(false)
    }
  }

  const fetchVendorProfile = async () => {
    try {
      const response = await fetch('/api/vendor/profile')
      
      if (!response.ok) {
        throw new Error('Failed to fetch vendor profile')
      }
      
      const data = await response.json()
      if (data.vendor && data.vendor.availability) {
        setAvailability(data.vendor.availability)
      }
    } catch (error) {
      console.error('Error fetching vendor profile:', error)
      // Don't set an error state here as it's not critical for the page to function
    }
  }

  const fetchEarnings = async () => {
    setEarningsLoading(true)
    try {
      const response = await fetch('/api/vendor/earnings')
      
      if (!response.ok) {
        throw new Error('Failed to fetch earnings data')
      }
      
      const data = await response.json()
      setEarnings({
        totalEarnings: data.totalEarnings || 0,
        jobEarnings: data.jobEarnings || 0,
        affiliateEarnings: data.affiliateEarnings || 0,
        thisMonth: {
          total: data.thisMonth?.total || 0,
          jobs: data.thisMonth?.jobs || 0,
          affiliate: data.thisMonth?.affiliate || 0
        },
        lastMonth: {
          total: data.lastMonth?.total || 0,
          jobs: data.lastMonth?.jobs || 0,
          affiliate: data.lastMonth?.affiliate || 0
        },
        completedJobsCount: data.completedJobsCount || 0
      })
    } catch (error) {
      console.error('Error fetching earnings:', error)
      // Don't set an error state here as it's not critical for the page to function
    } finally {
      setEarningsLoading(false)
    }
  }

  const handleSubmitQuote = async (orderId, amount) => {
    try {
      if (!orderId || !amount) {
        throw new Error('Missing order ID or amount')
      }
      
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
      
      // Show success message
      toast.success('Your price has been sent to the customer!')
      
      // Refresh all data after submitting quote
      refreshAllData()
      
      // Return the response data so the component can use it
      return responseData;
    } catch (error) {
      console.error('Error submitting quote:', error)
      toast.error(error.message || 'Failed to submit quote')
      throw error
    }
  }

  const handleAvailabilityChange = async (newStatus) => {
    if (newStatus !== 'available' && newStatus !== 'unavailable') {
      console.error('Invalid availability status:', newStatus)
      return
    }
    
    const previousStatus = availability
    setAvailability(newStatus)
    
    try {
      const response = await fetch('/api/vendor/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ availability: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update availability')
      }
      
      toast.success(newStatus === 'available' 
        ? 'You are now available for new jobs' 
        : 'You are now marked as unavailable for new jobs')
        
      // Fetch the updated vendor profile to ensure state is in sync with the server
      await fetchVendorProfile()
    } catch (error) {
      console.error('Error updating availability:', error)
      // Revert availability if update fails
      setAvailability(previousStatus)
      toast.error('Could not update your status')
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
  const newRequests = requests.filter(r => !r.submittedQuote && !r.wonOpportunity && !r.lostOpportunity) || []
  const submittedQuotes = requests.filter(r => r.submittedQuote && !r.wonOpportunity && !r.lostOpportunity) || []
  const wonOpportunities = requests.filter(r => r.wonOpportunity) || []
  const lostOpportunities = requests.filter(r => r.lostOpportunity) || []

  return (
    <Container className="py-4">
      {/* Simple Status Bar */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body>
              <h3 className="text-center mb-4">Your Status</h3>
              <div className="d-flex justify-content-center mb-3">
                <div 
                  className={`status-indicator ${availability === 'available' ? 'active' : ''}`} 
                  onClick={() => handleAvailabilityChange('available')}
                  role="button"
                  tabIndex={0}
                  aria-label="Set status to available"
                >
                  <div className="icon-container">
                    <FaCheck size={24} color={availability === 'available' ? '#28a745' : '#6c757d'} />
                  </div>
                  <div className="text-center mt-2">Available</div>
                </div>
                <div 
                  className={`status-indicator ${availability === 'unavailable' ? 'active' : ''}`}
                  onClick={() => handleAvailabilityChange('unavailable')}
                  role="button"
                  tabIndex={0}
                  aria-label="Set status to unavailable"
                >
                  <div className="icon-container">
                    <FaTimes size={24} color={availability === 'unavailable' ? '#dc3545' : '#6c757d'} />
                  </div>
                  <div className="text-center mt-2">Not Available</div>
                </div>
              </div>
              <div className="text-center">
                <p className="mb-0">
                  {availability === 'available' 
                    ? 'You will receive new job requests' 
                    : 'You will not receive new job requests'}
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Dashboard Stats */}
      <Row className="mb-4">
        <Col xs={6} md={3} className="mb-3">
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <div className="icon-container mb-2">
                <FaMoneyBillWave size={32} color="#28a745" />
              </div>
              <h4>₹{earnings.totalEarnings.toLocaleString('en-IN')}</h4>
              <div>Total Earnings</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3} className="mb-3">
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <div className="icon-container mb-2">
                <FaMoneyBillWave size={32} color="#007bff" />
              </div>
              <h4>₹{earnings.thisMonth.total.toLocaleString('en-IN')}</h4>
              <div>This Month</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3} className="mb-3">
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <div className="icon-container mb-2">
                <FaTruck size={32} color="#ffc107" />
              </div>
              <h4>{earnings.completedJobsCount}</h4>
              <div>Completed Jobs</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3} className="mb-3">
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <div className="icon-container mb-2">
                <FaExchangeAlt size={32} color="#6c757d" />
              </div>
              <h4>₹{earnings.affiliateEarnings.toLocaleString('en-IN')}</h4>
              <div>Affiliate Earnings</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Affiliate Link */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Body className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <div className="icon-container me-3">
                  <FaExchangeAlt size={24} color="#007bff" />
                </div>
                <div>
                  <h5 className="mb-1">Affiliate Program</h5>
                  <p className="mb-0 text-muted">Earn commissions by referring customers to other vendors</p>
                </div>
              </div>
              <Link href="/vendor/affiliate" passHref legacyBehavior>
                <Button variant="primary">Manage Affiliate</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Simple Tab Navigation */}
      <Row className="mb-3">
        <Col>
          <div className="simple-tabs">
            <div 
              className={`simple-tab ${activeTab === 'new' ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
              role="button"
              tabIndex={0}
              aria-label="Show new requests"
            >
              <FaClipboardList className="me-2" />
              New Requests ({newRequests.length})
            </div>
            <div 
              className={`simple-tab ${activeTab === 'waiting' ? 'active' : ''}`}
              onClick={() => setActiveTab('waiting')}
              role="button"
              tabIndex={0}
              aria-label="Show waiting quotes"
            >
              <FaMoneyBillWave className="me-2" />
              Waiting ({submittedQuotes.length})
            </div>
            <div 
              className={`simple-tab ${activeTab === 'confirmed' ? 'active' : ''}`}
              onClick={() => setActiveTab('confirmed')}
              role="button"
              tabIndex={0}
              aria-label="Show confirmed jobs"
            >
              <FaTruck className="me-2" />
              Confirmed Jobs ({wonOpportunities.length})
            </div>
            <div 
              className={`simple-tab ${activeTab === 'not-selected' ? 'active' : ''}`}
              onClick={() => setActiveTab('not-selected')}
              role="button"
              tabIndex={0}
              aria-label="Show not selected requests"
            >
              <FaUserClock className="me-2" />
              Not Selected ({lostOpportunities.length})
            </div>
          </div>
        </Col>
      </Row>

      {/* Error Message */}
      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}

      {/* Loading Indicator */}
      {loading && (
        <Row className="mb-4">
          <Col className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </Col>
        </Row>
      )}

      {/* Tab Content */}
      <Row>
        <Col>
          {activeTab === 'new' && (
            <>
              {newRequests.length === 0 ? (
                <Card className="text-center p-4 shadow-sm">
                  <Card.Body>
                    <h4>No New Requests</h4>
                    <p>You don't have any new job requests at the moment.</p>
                  </Card.Body>
                </Card>
              ) : (
                newRequests.map(request => (
                  <SimpleRequestCard 
                    key={request.orderId} 
                    request={request} 
                    onSubmitQuote={handleSubmitQuote} 
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'waiting' && (
            <>
              {submittedQuotes.length === 0 ? (
                <Card className="text-center p-4 shadow-sm">
                  <Card.Body>
                    <h4>No Waiting Quotes</h4>
                    <p>You don't have any quotes waiting for customer response.</p>
                  </Card.Body>
                </Card>
              ) : (
                submittedQuotes.map(request => (
                  <SimpleRequestCard 
                    key={request.orderId} 
                    request={request} 
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'confirmed' && (
            <>
              {wonOpportunities.length === 0 ? (
                <Card className="text-center p-4 shadow-sm">
                  <Card.Body>
                    <h4>No Confirmed Jobs</h4>
                    <p>You don't have any confirmed jobs at the moment.</p>
                  </Card.Body>
                </Card>
              ) : (
                wonOpportunities.map(request => (
                  <SimpleRequestCard 
                    key={request.orderId} 
                    request={request} 
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'not-selected' && (
            <>
              {lostOpportunities.length === 0 ? (
                <Card className="text-center p-4 shadow-sm">
                  <Card.Body>
                    <h4>No Past Requests</h4>
                    <p>You don't have any past requests where you weren't selected.</p>
                  </Card.Body>
                </Card>
              ) : (
                lostOpportunities.map(request => (
                  <SimpleRequestCard 
                    key={request.orderId} 
                    request={request} 
                  />
                ))
              )}
            </>
          )}
        </Col>
      </Row>

      {/* Refresh Button */}
      <Row className="mt-4">
        <Col className="text-center">
          <Button 
            variant="primary" 
            size="lg" 
            onClick={refreshAllData}
            className="px-4 py-2"
            disabled={loading || earningsLoading}
            aria-label="Refresh dashboard data"
          >
            {loading || earningsLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Loading...
              </>
            ) : (
              <>Refresh Dashboard</>
            )}
          </Button>
        </Col>
      </Row>

      <style jsx global>{`
        .status-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 0 20px;
          cursor: pointer;
          padding: 10px;
          border-radius: 10px;
          transition: all 0.3s ease;
        }
        
        .status-indicator.active {
          background-color: #f8f9fa;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background-color: #f8f9fa;
          margin-bottom: 8px;
        }
        
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
  )
} 