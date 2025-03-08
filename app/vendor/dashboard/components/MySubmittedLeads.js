import { useState, useEffect } from 'react'
import { 
  Card, 
  Badge, 
  Alert, 
  Spinner, 
  Button, 
  Row, 
  Col, 
  Modal,
  Container,
  ProgressBar,
  Tabs,
  Tab,
  Form,
  InputGroup
} from 'react-bootstrap'
import Link from 'next/link'
import VendorList from '../../../../components/VendorList'
import PaymentModal from '../../../../components/PaymentModal'

export default function MySubmittedLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [vendors, setVendors] = useState([])
  const [viewMode, setViewMode] = useState('list')
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchMyLeads()
  }, [])

  const fetchMyLeads = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/vendor/cross-leads/my-leads')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch my leads: ${response.status}`)
      }
      
      const data = await response.json()
      setLeads(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching my submitted leads:', error)
      setError('Failed to load your submitted leads. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeadDetails = async (leadId) => {
    try {
      setLoading(true)
      setError('')
      
      // Fetch lead details
      const orderResponse = await fetch(`/api/orders/${leadId}`)
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || 'Failed to fetch lead details')
      }
      const orderData = await orderResponse.json()
      
      // Fetch vendors for this lead
      const vendorsResponse = await fetch('/api/vendors')
      if (!vendorsResponse.ok) {
        const errorData = await vendorsResponse.json()
        throw new Error(errorData.error || 'Failed to fetch vendors')
      }
      const vendorsData = await vendorsResponse.json()
      
      setSelectedLead(orderData)
      setVendors(vendorsData)
      setViewMode('detail')
    } catch (error) {
      console.error('Error fetching lead details:', error)
      setError(error.message || 'Failed to load lead details')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptQuote = (quote) => {
    setSelectedQuote(quote)
    setShowPayment(true)
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedLead(null)
    setError('')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'Initiated': { variant: 'primary', label: 'New' },
      'Requests Sent': { variant: 'info', label: 'Quotes Requested' },
      'Quotes Received': { variant: 'warning', text: 'dark', label: 'Quotes Available' },
      'Completed': { variant: 'success', label: 'Completed' },
      'Paid': { variant: 'success', label: 'Paid' },
      'Pending': { variant: 'secondary', label: 'Pending' }
    };
    
    const defaultBadge = { variant: 'secondary', label: status || 'Unknown' };
    const badgeInfo = statusMap[status] || defaultBadge;
    
    return (
      <Badge 
        bg={badgeInfo.variant} 
        text={badgeInfo.text || undefined}
        pill
      >
        {badgeInfo.label}
      </Badge>
    );
  }

  const viewLeadDetails = (leadId) => {
    fetchLeadDetails(leadId)
  }

  const getProgressPercentage = (status) => {
    const statusMap = {
      'Initiated': 15,
      'Requests Sent': 30,
      'Quotes Received': 60,
      'Accepted': 80, 
      'Paid': 100
    };
    
    return statusMap[status] || 0;
  }

  const getProgressVariant = (status) => {
    const statusMap = {
      'Initiated': 'info',
      'Requests Sent': 'info',
      'Quotes Received': 'warning',
      'Accepted': 'success',
      'Paid': 'success'
    };
    
    return statusMap[status] || 'secondary';
  }

  const filterLeadsByStatus = (status) => {
    if (status === 'all') return leads;
    if (status === 'active') return leads.filter(lead => lead.status !== 'Paid');
    if (status === 'completed') return leads.filter(lead => lead.status === 'Paid');
    if (status === 'quotes') return leads.filter(lead => lead.quotesReceived > 0);
    return leads;
  }

  // Render the lead details view
  if (viewMode === 'detail' && selectedLead) {
    return (
      <div className="animated fadeIn">
        <div className="mb-4">
          <Button 
            variant="outline-primary" 
            onClick={handleBackToList}
            className="mb-3"
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to all leads
          </Button>

          {error && (
            <Alert variant="danger" className="mb-3">
              <Alert.Heading>Error</Alert.Heading>
              <p>{error}</p>
            </Alert>
          )}
          
          <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  Move Request #{selectedLead.orderId?.substring(0, 8)}
                </h5>
                {getStatusBadge(selectedLead.status)}
              </div>
            </Card.Header>
            <Card.Body>
              <ProgressBar 
                now={getProgressPercentage(selectedLead.status)} 
                variant={getProgressVariant(selectedLead.status)}
                className="mb-4" 
              />
              
              <Row>
                <Col md={6}>
                  <h6 className="mb-3 text-muted">Move Details</h6>
                  <p>
                    <strong>From:</strong> {selectedLead.pickupPincode}<br />
                    <strong>To:</strong> {selectedLead.destinationPincode}<br />
                    <strong>Size:</strong> {selectedLead.moveSize}<br />
                    <strong>Date:</strong> {formatDate(selectedLead.moveDate)}
                  </p>
                </Col>
                <Col md={6}>
                  <h6 className="mb-3 text-muted">Customer Information</h6>
                  <p>
                    <strong>Name:</strong> {selectedLead.customerName || 'Self'}<br />
                    <strong>Email:</strong> {selectedLead.userEmail || 'Not available'}<br />
                    <strong>Phone:</strong> {selectedLead.customerPhone || 'Not available'}<br />
                    <strong>Created:</strong> {formatDate(selectedLead.createdAt)}
                  </p>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <div className="mb-4">
            {selectedLead.quotes && selectedLead.quotes.length > 0 && (
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">Available Quotes</h5>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted mb-3">
                    Compare quotes from different vendors and select the best one for your move.
                  </p>
                  <Row>
                    {selectedLead.quotes.map(quote => {
                      const vendor = vendors.find(v => v.vendorId === quote.vendorId);
                      return (
                        <Col key={quote.vendorId} md={6} className="mb-3">
                          <Card className={`h-100 ${selectedLead.selectedVendorId === quote.vendorId ? 'border-success' : ''}`}>
                            <Card.Body>
                              <Card.Title className="d-flex justify-content-between align-items-center">
                                {vendor?.name || 'Unknown Vendor'}
                                {selectedLead.selectedVendorId === quote.vendorId && (
                                  <Badge bg="success" pill>Selected</Badge>
                                )}
                              </Card.Title>
                              <div className="mb-2">
                                {vendor?.rating && (
                                  <div className="text-warning mb-1">
                                    {'★'.repeat(Math.floor(vendor.rating))}
                                    {vendor.rating % 1 >= 0.5 ? '½' : ''}
                                    {'☆'.repeat(Math.floor(5 - vendor.rating))}
                                    <span className="text-muted ms-1">
                                      ({vendor.reviews?.length || 0})
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-baseline">
                                  <span className="text-muted">Price:</span>
                                  <span className="h5 text-success mb-0">
                                    ₹{quote.amount ? quote.amount.toLocaleString('en-IN') : 'N/A'}
                                  </span>
                                </div>
                                <div className="text-muted small">
                                  Quoted on {formatDate(quote.submittedAt)}
                                </div>
                              </div>
                              {!selectedLead.selectedVendorId && selectedLead.status !== 'Paid' && (
                                <Button
                                  variant="success"
                                  onClick={() => handleAcceptQuote(quote)}
                                  className="w-100"
                                >
                                  Select & Pay
                                </Button>
                              )}
                            </Card.Body>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </Card.Body>
              </Card>
            )}

            {selectedLead.status !== 'Paid' && (
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">Request More Quotes</h5>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted mb-3">
                    Get quotes from additional vendors in your area to compare options.
                  </p>
                  <VendorList 
                    vendors={vendors} 
                    orderId={selectedLead.orderId}
                    selectedVendors={selectedLead.vendorRequests || []}
                    pickupPincode={selectedLead.pickupPincode}
                    destinationPincode={selectedLead.destinationPincode}
                    quotes={selectedLead.quotes || []}
                  />
                </Card.Body>
              </Card>
            )}

            {selectedLead.status === 'Paid' && (
              <Card className="shadow-sm border-success">
                <Card.Header className="bg-success text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-check-circle me-2"></i>
                    Payment Confirmed
                  </h5>
                </Card.Header>
                <Card.Body>
                  <p>
                    Good news! Your payment has been confirmed. The vendor will contact you 
                    shortly to coordinate the move.
                  </p>
                  <hr />
                  <Row>
                    <Col md={6}>
                      <h6 className="text-muted mb-2">Payment Details</h6>
                      <p className="mb-0">
                        <strong>Amount:</strong> ₹{selectedLead.payment?.amount?.toLocaleString('en-IN') || 'N/A'}<br />
                        <strong>Date:</strong> {formatDate(selectedLead.payment?.paidAt)}<br />
                        <strong>Payment ID:</strong> {selectedLead.payment?.razorpayPaymentId || 'N/A'}<br />
                        <strong>Commission Rate:</strong> {selectedLead.payment?.commissionRate || 20}%
                      </p>
                    </Col>
                    <Col md={6}>
                      <h6 className="text-muted mb-2">Selected Vendor</h6>
                      <p className="mb-0">
                        <strong>Vendor:</strong> {vendors.find(v => v.vendorId === selectedLead.selectedVendorId)?.name || 'Unknown'}<br />
                        <strong>Status:</strong> <Badge bg="success" pill>Confirmed</Badge>
                      </p>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
        
        {showPayment && selectedQuote && (
          <PaymentModal
            show={showPayment}
            onHide={() => setShowPayment(false)}
            orderId={selectedLead.orderId}
            vendorId={selectedQuote.vendorId}
            amount={selectedQuote.amount}
          />
        )}
      </div>
    );
  }

  // Default list view
  return (
    <div>
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-0">My Submitted Leads</h5>
              <p className="text-muted mb-0 small">
                Manage and track leads that you've submitted for yourself
              </p>
            </div>
            <div>
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={fetchMyLeads}
                className="d-flex align-items-center"
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Refresh
              </Button>
            </div>
          </div>
          
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2 text-muted">Loading your leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-4 text-muted"></i>
              <h5 className="mt-3">No leads found</h5>
              <p className="text-muted mb-4">
                You haven't submitted any leads for yourself yet. When you submit a lead with 
                "Manage this lead myself" option, it will appear here.
              </p>
              <Button 
                variant="primary" 
                onClick={() => setShowModal(true)}
              >
                Submit a New Lead
              </Button>
            </div>
          ) : (
            <>
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                <Tab eventKey="all" title="All Leads">
                  <p className="text-muted small mb-3">
                    Showing all {leads.length} leads you've submitted
                  </p>
                </Tab>
                <Tab eventKey="active" title="Active">
                  <p className="text-muted small mb-3">
                    Showing your active leads that need attention
                  </p>
                </Tab>
                <Tab eventKey="quotes" title="With Quotes">
                  <p className="text-muted small mb-3">
                    Showing leads that have received quotes
                  </p>
                </Tab>
                <Tab eventKey="completed" title="Completed">
                  <p className="text-muted small mb-3">
                    Showing your completed and paid leads
                  </p>
                </Tab>
              </Tabs>

              {/* Search bar */}
              <Form className="mb-3">
                <InputGroup>
                  <InputGroup.Text className="bg-light">
                    <i className="bi bi-search"></i>
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search by customer name, location, or move size..."
                    aria-label="Search leads"
                  />
                </InputGroup>
              </Form>

              <div className="lead-cards">
                <Row>
                  {filterLeadsByStatus(activeTab).map(lead => (
                    <Col key={lead.orderId} md={6} lg={4} className="mb-3">
                      <Card className="h-100 hover-shadow cursor-pointer" onClick={() => viewLeadDetails(lead.orderId)}>
                        <Card.Body>
                          <div className="d-flex justify-content-between mb-2">
                            <div>
                              <h6 className="mb-0">{lead.customerName || 'Self'}</h6>
                              <p className="text-muted small mb-0">
                                Created: {formatDate(lead.createdAt)}
                              </p>
                            </div>
                            {getStatusBadge(lead.status)}
                          </div>
                          
                          <div className="border-top pt-2 mt-2">
                            <div className="text-muted small">
                              <div className="mb-1"><i className="bi bi-box me-2"></i>{lead.moveSize}</div>
                              <div className="mb-1"><i className="bi bi-geo-alt me-2"></i>{lead.pickupPincode} to {lead.destinationPincode}</div>
                              <div><i className="bi bi-calendar me-2"></i>{formatDate(lead.moveDate)}</div>
                            </div>
                          </div>
                          
                          <div className="border-top mt-2 pt-2">
                            <div className="d-flex justify-content-between">
                              <span>
                                <Badge bg="info" pill className="me-1">
                                  {lead.quotesReceived} quote{lead.quotesReceived !== 1 ? 's' : ''}
                                </Badge>
                                <Badge bg="secondary" pill>
                                  {lead.vendorRequests?.length || 0} vendor{lead.vendorRequests?.length !== 1 ? 's' : ''}
                                </Badge>
                              </span>
                              <Button 
                                variant="link" 
                                className="p-0 text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewLeadDetails(lead.orderId);
                                }}
                              >
                                View <i className="bi bi-arrow-right ms-1"></i>
                              </Button>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
} 