import { useEffect, useState, useCallback } from 'react'
import { Card, Table, Badge, Spinner, Alert, Button, Row, Col } from 'react-bootstrap'
import { formatDate } from '../../../../lib/utils'
import { FaSync, FaExclamationTriangle, FaChartLine } from 'react-icons/fa'

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
      <div className="text-center py-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3 text-muted">Loading your affiliate statistics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger" className="d-flex align-items-start">
        <FaExclamationTriangle className="me-3 mt-1" size={20} />
        <div>
          <p className="mb-2">{error}</p>
          <Button variant="outline-danger" size="sm" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0 d-flex align-items-center">
          <FaChartLine className="me-2 text-primary" /> Affiliate Performance
        </h4>
        <Button 
          variant="light" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="d-flex align-items-center"
        >
          {isRefreshing ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Refreshing...
            </>
          ) : (
            <>
              <FaSync className="me-2" /> Refresh
            </>
          )}
        </Button>
      </div>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body>
              <h2 className="display-4 fw-bold text-primary">{stats?.crossLeadsSubmitted || 0}</h2>
              <p className="text-muted mb-0">Cross Leads Submitted</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body>
              <h2 className="display-4 fw-bold text-success">{stats?.discountedCommissionsRemaining || 0}</h2>
              <p className="text-muted mb-0">Discounted Orders Remaining</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 text-center shadow-sm">
            <Card.Body>
              <h2 className="display-4 fw-bold text-info">{stats?.discountedCommissionsUsed || 0}</h2>
              <p className="text-muted mb-0">Discounted Orders Used</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-4">
          <h5>Your current commission rate</h5>
          <h2>
            <Badge bg={stats?.currentRate === 5 ? 'success' : 'primary'} className="px-4 py-2">
              {stats?.currentRate || 20}%
            </Badge>
          </h2>
          <p className="text-muted mt-2 mb-0">
            {stats?.discountedCommissionsRemaining > 0 
              ? `You have a discounted commission rate of 5% for your next ${stats.discountedCommissionsRemaining} orders!` 
              : 'Submit cross leads to earn discounted commission rates!'
            }
          </p>
        </Card.Body>
      </Card>

      {stats?.history?.length > 0 && (
        <Card className="shadow-sm">
          <Card.Header className="bg-light">
            <h5 className="mb-0">Recent Affiliate Activity</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="table-light">
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
                    <td>
                      <code>{item.orderId ? item.orderId.substring(0, 8) + '...' : 'N/A'}</code>
                    </td>
                    <td>
                      {item.action === 'Submitted cross lead' && (
                        <span className="text-success">Earned 1 discounted commission</span>
                      )}
                      {item.action === 'Used discounted commission' && (
                        <span className="text-primary">Applied {item.rate}% commission rate</span>
                      )}
                      {!['Submitted cross lead', 'Used discounted commission'].includes(item.action) && (
                        'Action processed'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </>
  )
} 