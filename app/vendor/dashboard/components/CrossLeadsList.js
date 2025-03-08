import React, { useState, useEffect } from 'react'
import { Card, Table, Badge, Alert, Spinner, Button, Accordion, Row, Col } from 'react-bootstrap'

export default function CrossLeadsList() {
  const [crossLeads, setCrossLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedLead, setExpandedLead] = useState(null)

  useEffect(() => {
    fetchCrossLeads()
  }, [])

  const fetchCrossLeads = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/vendor/cross-leads/list')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch cross leads: ${response.status}`)
      }
      
      const data = await response.json()
      setCrossLeads(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching cross leads:', error)
      setError('Failed to load cross leads. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    
    try {
      const date = new Date(dateString)
      return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString()
    } catch (error) {
      return 'N/A'
    }
  }

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0'
    
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(amount)
    } catch (error) {
      console.error('Error formatting currency:', error)
      return `₹${amount}` // Fallback formatting
    }
  }

  const getStatusBadge = (status) => {
    if (!status) return <Badge bg="secondary">Unknown</Badge>
    
    switch (status) {
      case 'Pending':
        return <Badge bg="secondary">Pending</Badge>
      case 'Quotes Received':
        return <Badge bg="info">Quotes Received</Badge>
      case 'Completed':
        return <Badge bg="success">Completed</Badge>
      default:
        return <Badge bg="secondary">{status}</Badge>
    }
  }

  const toggleLeadDetails = (leadId) => {
    if (expandedLead === leadId) {
      setExpandedLead(null)
    } else {
      setExpandedLead(leadId)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2 text-muted">Loading cross leads...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
        <div className="mt-3">
          <Button variant="outline-danger" size="sm" onClick={fetchCrossLeads}>
            Try Again
          </Button>
        </div>
      </Alert>
    )
  }

  if (!Array.isArray(crossLeads) || crossLeads.length === 0) {
    return (
      <Alert variant="info">
        You haven't submitted any cross leads yet. Submit a cross lead by referring a customer to earn a 15% commission discount on your future orders.
      </Alert>
    )
  }

  // Group leads by status with safeguards for missing status
  const groupedLeads = {
    Pending: crossLeads.filter(lead => lead && lead.status === 'Pending'),
    'Quotes Received': crossLeads.filter(lead => lead && lead.status === 'Quotes Received'),
    Completed: crossLeads.filter(lead => lead && lead.status === 'Completed')
  }
  
  // Add other statuses that might exist but aren't expected
  crossLeads.forEach(lead => {
    if (lead && lead.status && !['Pending', 'Quotes Received', 'Completed'].includes(lead.status)) {
      if (!groupedLeads[lead.status]) {
        groupedLeads[lead.status] = []
      }
      groupedLeads[lead.status].push(lead)
    }
  })

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Your Cross Leads</h5>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={fetchCrossLeads}
          className="px-3"
        >
          Refresh
        </Button>
      </div>

      <div className="lead-status-summary d-flex mb-4">
        <div className="text-center flex-grow-1 border-end px-2">
          <h3>{groupedLeads.Pending?.length || 0}</h3>
          <Badge bg="secondary" className="mb-1">Pending</Badge>
          <p className="text-muted small mb-0">Awaiting quotes</p>
        </div>
        <div className="text-center flex-grow-1 border-end px-2">
          <h3>{groupedLeads['Quotes Received']?.length || 0}</h3>
          <Badge bg="info" className="mb-1">In Progress</Badge>
          <p className="text-muted small mb-0">Quotes received</p>
        </div>
        <div className="text-center flex-grow-1 px-2">
          <h3>{groupedLeads.Completed?.length || 0}</h3>
          <Badge bg="success" className="mb-1">Completed</Badge>
          <p className="text-muted small mb-0">Jobs completed</p>
        </div>
      </div>

      <Accordion className="mb-4">
        {Object.entries(groupedLeads).map(([status, leads]) => 
          leads && leads.length > 0 && (
            <Accordion.Item key={status} eventKey={status}>
              <Accordion.Header>
                <div className="d-flex w-100 justify-content-between align-items-center">
                  <span>{status} Leads</span>
                  <Badge bg="secondary" pill className="me-3">{leads.length}</Badge>
                </div>
              </Accordion.Header>
              <Accordion.Body className="p-0">
                <Table responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Move Details</th>
                      <th>Date</th>
                      <th>Quotes</th>
                      <th>Commission</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <React.Fragment key={lead.orderId || `unknown-${Math.random()}`}>
                        <tr>
                          <td>
                            <div className="fw-bold">{lead.customerName || 'Unknown Customer'}</div>
                            <div className="text-muted small">{lead.customerEmail || 'No email'}</div>
                          </td>
                          <td>
                            <div>{lead.moveSize || 'N/A'}</div>
                            <div className="text-muted small">
                              ID: {lead.orderId ? `${lead.orderId.substring(0, 8)}...` : 'N/A'}
                            </div>
                          </td>
                          <td>
                            <div>{formatDate(lead.moveDate)}</div>
                            <div className="text-muted small">Submitted: {formatDate(lead.createdAt)}</div>
                          </td>
                          <td>
                            <Badge bg="light" text="dark">{lead.quotesReceived || 0}</Badge>
                          </td>
                          <td>
                            {lead.commissionInfo?.earned ? (
                              <div className="text-success">
                                {formatCurrency(lead.commissionInfo.amount)}
                                <div className="text-muted small">Earned</div>
                              </div>
                            ) : (
                              <div className="text-muted small">
                                {lead.isSelected ? 'Pending payment' : 'Pending selection'}
                              </div>
                            )}
                          </td>
                          <td>
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-0 text-decoration-none"
                              onClick={() => toggleLeadDetails(lead.orderId)}
                            >
                              {expandedLead === lead.orderId ? 'Hide' : 'Details'}
                            </Button>
                          </td>
                        </tr>
                        {expandedLead === lead.orderId && (
                          <tr className="expanded-details">
                            <td colSpan="6" className="bg-light">
                              <div className="p-3">
                                <h6 className="mb-3">Lead Details</h6>
                                <Row>
                                  <Col md={6}>
                                    <dl className="row mb-0">
                                      <dt className="col-sm-4">Status</dt>
                                      <dd className="col-sm-8">{getStatusBadge(lead.status)}</dd>
                                      
                                      <dt className="col-sm-4">Customer</dt>
                                      <dd className="col-sm-8">
                                        {lead.customerName || 'Unknown'}<br />
                                        <span className="text-muted small">{lead.customerEmail || 'No email'}</span>
                                      </dd>
                                      
                                      <dt className="col-sm-4">Phone</dt>
                                      <dd className="col-sm-8">{lead.customerPhone || 'N/A'}</dd>
                                    </dl>
                                  </Col>
                                  <Col md={6}>
                                    <dl className="row mb-0">
                                      <dt className="col-sm-4">Move Size</dt>
                                      <dd className="col-sm-8">{lead.moveSize || 'N/A'}</dd>
                                      
                                      <dt className="col-sm-4">From</dt>
                                      <dd className="col-sm-8">{lead.pickupPincode || 'N/A'}</dd>
                                      
                                      <dt className="col-sm-4">To</dt>
                                      <dd className="col-sm-8">{lead.destinationPincode || 'N/A'}</dd>
                                      
                                      <dt className="col-sm-4">Move Date</dt>
                                      <dd className="col-sm-8">{formatDate(lead.moveDate)}</dd>
                                    </dl>
                                  </Col>
                                </Row>
                                
                                {lead.commissionInfo?.earned && (
                                  <div className="mt-3 p-2 bg-success-subtle rounded">
                                    <span className="fw-bold">Commission earned: </span>
                                    {formatCurrency(lead.commissionInfo.amount)} 
                                    <span className="text-muted ms-2">({lead.commissionInfo.rate || 20}% platform fee share)</span>
                                  </div>
                                )}
                                
                                {!lead.commissionInfo?.earned && lead.quotesReceived > 0 && (
                                  <div className="mt-3 p-2 bg-info-subtle rounded">
                                    <span className="fw-bold">Status: </span>
                                    {lead.isSelected ? 'Customer selected a vendor, awaiting payment completion' : 'Customer reviewing quotes'}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </Table>
              </Accordion.Body>
            </Accordion.Item>
          )
        )}
      </Accordion>

      <div className="mt-4">
        <Card className="bg-light">
          <Card.Body>
            <Card.Title>How the Cross Lead System Works</Card.Title>
            <ol className="mb-0">
              <li>Submit a cross lead by referring a customer who needs moving services</li>
              <li>Other vendors will receive the lead and may submit quotes</li>
              <li>For each submitted cross lead, you earn a 15% commission rate on your next order (instead of 20%)</li>
              <li>If your referred customer completes an order, you also earn 20% of the platform fee</li>
            </ol>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
} 