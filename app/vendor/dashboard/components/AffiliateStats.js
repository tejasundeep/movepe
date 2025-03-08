import { useEffect, useState, useCallback } from 'react'
import { Card, Table, Badge, Spinner, Alert, Button } from 'react-bootstrap'
import { formatDate } from '../../../../lib/utils'

export default function AffiliateStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchAffiliateStats = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    
    setError('')
    
    try {
      const response = await fetch('/api/vendor/affiliate-stats')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch affiliate stats: ${response.status}`)
      }
      
      let data;
      try {
        data = await response.json()
      } catch (parseError) {
        throw new Error('Invalid response from server')
      }
      
      // Validate and sanitize data
      const sanitizedData = {
        crossLeadsSubmitted: Number(data?.crossLeadsSubmitted) || 0,
        discountedCommissionsRemaining: Number(data?.discountedCommissionsRemaining) || 0,
        discountedCommissionsUsed: Number(data?.discountedCommissionsUsed) || 0,
        currentRate: Number(data?.currentRate) || 20,
        history: Array.isArray(data?.history) ? data.history.map(item => ({
          date: item.date || null,
          action: item.action || 'Unknown action',
          orderId: item.orderId || 'Unknown',
          rate: Number(item.rate) || 0
        })) : []
      }
      
      setStats(sanitizedData)
    } catch (error) {
      console.error('Error fetching affiliate stats:', error)
      setError('Failed to load affiliate statistics. Please try again later.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAffiliateStats()
  }, [fetchAffiliateStats])

  const handleRefresh = () => {
    fetchAffiliateStats(true)
  }

  if (loading) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <Card.Title>Affiliate Program Stats</Card.Title>
        </Card.Header>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </Card.Body>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <Card.Title>Affiliate Program Stats</Card.Title>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            {error}
            <div className="mt-2">
              <Button variant="outline-danger" size="sm" onClick={handleRefresh}>
                Try Again
              </Button>
            </div>
          </Alert>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <Card.Title>Affiliate Program Stats</Card.Title>
        <Button 
          variant="outline-secondary" 
          size="sm" 
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
      </Card.Header>
      <Card.Body>
        <div className="d-flex mb-4">
          <div className="text-center flex-grow-1 border-end">
            <h3>{stats?.crossLeadsSubmitted || 0}</h3>
            <p className="text-muted mb-0">Cross Leads Submitted</p>
          </div>
          <div className="text-center flex-grow-1 border-end">
            <h3>{stats?.discountedCommissionsRemaining || 0}</h3>
            <p className="text-muted mb-0">Discounted Orders Remaining</p>
          </div>
          <div className="text-center flex-grow-1">
            <h3>{stats?.discountedCommissionsUsed || 0}</h3>
            <p className="text-muted mb-0">Discounted Orders Used</p>
          </div>
        </div>
        
        <div className="mb-3">
          <p className="text-center fw-bold">
            Your current commission rate: 
            <Badge bg={stats?.currentRate === 15 ? 'success' : 'primary'} className="ms-2">
              {stats?.currentRate || 20}%
            </Badge>
          </p>
          <p className="text-center text-muted small">
            {stats?.discountedCommissionsRemaining > 0 
              ? `You have a discounted commission rate of 15% for your next ${stats.discountedCommissionsRemaining} orders!` 
              : 'Submit cross leads to earn discounted commission rates!'
            }
          </p>
        </div>

        {stats?.history?.length > 0 && (
          <>
            <h6 className="mt-4 mb-3">Recent Affiliate Activity</h6>
            <Table responsive striped hover size="sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Order ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {stats.history.slice(0, 5).map((item, index) => (
                  <tr key={index}>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.action}</td>
                    <td>{item.orderId ? item.orderId.substring(0, 8) + '...' : 'N/A'}</td>
                    <td>
                      {item.action === 'Submitted cross lead' && 'Earned 1 discounted commission'}
                      {item.action === 'Used discounted commission' && `Applied ${item.rate}% commission rate`}
                      {!['Submitted cross lead', 'Used discounted commission'].includes(item.action) && 'Action processed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Card.Body>
    </Card>
  )
} 