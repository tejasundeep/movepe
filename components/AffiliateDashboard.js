import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Tabs, Tab, Alert, Spinner, Form, InputGroup } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

/**
 * Affiliate Dashboard Component
 * 
 * This component displays the affiliate dashboard with referrals, earnings, and settings.
 */
const AffiliateDashboard = () => {
  const { data: session } = useSession();
  const [affiliate, setAffiliate] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    paid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  });
  const [savingPaymentDetails, setSavingPaymentDetails] = useState(false);
  const [paymentDetailsError, setPaymentDetailsError] = useState(null);
  const [paymentDetailsSuccess, setPaymentDetailsSuccess] = useState(false);

  // Fetch affiliate data on component mount
  useEffect(() => {
    if (session) {
      fetchAffiliateData();
    }
  }, [session]);

  // Reset copied state after 3 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Fetch affiliate data from the API
  const fetchAffiliateData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch affiliate info
      const response = await fetch('/api/affiliate');
      
      if (!response.ok) {
        throw new Error('Failed to fetch affiliate data');
      }
      
      const data = await response.json();
      
      setAffiliate(data.affiliate);
      
      // If user has an affiliate account, fetch referrals and earnings
      if (data.affiliate) {
        setPaymentDetails(JSON.parse(data.affiliate.paymentDetails || '{}'));
        
        // Fetch referrals
        const referralsResponse = await fetch('/api/affiliate/referrals');
        
        if (!referralsResponse.ok) {
          throw new Error('Failed to fetch referrals');
        }
        
        const referralsData = await referralsResponse.json();
        setReferrals(referralsData.referrals || []);
        
        // Fetch earnings
        const earningsResponse = await fetch('/api/affiliate/earnings');
        
        if (!earningsResponse.ok) {
          throw new Error('Failed to fetch earnings');
        }
        
        const earningsData = await earningsResponse.json();
        setEarnings(earningsData.earnings || []);
        setSummary(earningsData.summary || { total: 0, pending: 0, paid: 0 });
      }
    } catch (err) {
      console.error('Error fetching affiliate data:', err);
      setError('Failed to load affiliate data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create affiliate account
  const createAffiliateAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/affiliate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create affiliate account');
      }
      
      // Refresh data
      await fetchAffiliateData();
    } catch (err) {
      console.error('Error creating affiliate account:', err);
      setError('Failed to create affiliate account. Please try again.');
      setLoading(false);
    }
  };

  // Handle payment details input change
  const handlePaymentDetailsChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails(prevDetails => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  // Save payment details
  const savePaymentDetails = async (e) => {
    e.preventDefault();
    
    setSavingPaymentDetails(true);
    setPaymentDetailsError(null);
    setPaymentDetailsSuccess(false);

    try {
      const response = await fetch('/api/affiliate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentDetails,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save payment details');
      }
      
      setPaymentDetailsSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPaymentDetailsSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving payment details:', err);
      setPaymentDetailsError('Failed to save payment details. Please try again.');
    } finally {
      setSavingPaymentDetails(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'warning';
      case 'COMPLETED':
      case 'PAID':
      case 'ACTIVE':
        return 'success';
      case 'CANCELLED':
      case 'SUSPENDED':
      case 'INACTIVE':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Loading state
  if (loading && !affiliate) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-3 text-muted">Loading affiliate dashboard...</p>
        </Card.Body>
      </Card>
    );
  }

  // Error state
  if (error && !affiliate) {
    return (
      <Alert variant="danger" className="mb-4">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <div className="d-flex justify-content-end">
          <Button variant="outline-danger" onClick={fetchAffiliateData}>
            Try Again
          </Button>
        </div>
      </Alert>
    );
  }

  // No affiliate account state
  if (!affiliate) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-5">
          <div className="mb-4">
            <i className="bi bi-person-plus-fill text-primary" style={{ fontSize: '3rem' }}></i>
          </div>
          <h4 className="mb-3">Become an Affiliate</h4>
          <p className="text-muted mb-4">
            Join our affiliate program to earn commissions by referring customers and vendors to our platform.
          </p>
          <Button 
            variant="primary" 
            onClick={createAffiliateAccount}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Creating Account...
              </>
            ) : (
              'Join Affiliate Program'
            )}
          </Button>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="mb-4">
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <h5 className="mb-3">Your Affiliate Account</h5>
              <p className="mb-1">
                <strong>Status:</strong>{' '}
                <Badge bg={getStatusBadgeVariant(affiliate.status)}>
                  {affiliate.status}
                </Badge>
              </p>
              <p className="mb-1">
                <strong>Joined:</strong> {formatDate(affiliate.createdAt)}
              </p>
              <p className="mb-3">
                <strong>Referral Code:</strong>{' '}
                <span className="font-monospace">{affiliate.referralCode}</span>
                <CopyToClipboard 
                  text={affiliate.referralCode}
                  onCopy={() => setCopied(true)}
                >
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 ms-2"
                  >
                    <i className="bi bi-clipboard"></i>
                  </Button>
                </CopyToClipboard>
                {copied && (
                  <Badge bg="success" className="ms-2">Copied!</Badge>
                )}
              </p>
              <div className="mb-3">
                <InputGroup>
                  <Form.Control
                    type="text"
                    value={`${window.location.origin}/register?ref=${affiliate.referralCode}`}
                    readOnly
                  />
                  <CopyToClipboard 
                    text={`${window.location.origin}/register?ref=${affiliate.referralCode}`}
                    onCopy={() => setCopied(true)}
                  >
                    <Button variant="outline-secondary">
                      <i className="bi bi-clipboard"></i> Copy Link
                    </Button>
                  </CopyToClipboard>
                </InputGroup>
                <Form.Text className="text-muted">
                  Share this link with potential customers or vendors
                </Form.Text>
              </div>
            </Col>
            <Col md={6}>
              <div className="bg-light p-3 rounded h-100">
                <h5 className="mb-3">Earnings Summary</h5>
                <Row className="g-3">
                  <Col xs={4}>
                    <div className="text-center">
                      <div className="text-primary fw-bold" style={{ fontSize: '1.5rem' }}>
                        {formatCurrency(summary.total)}
                      </div>
                      <div className="text-muted small">Total Earnings</div>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="text-center">
                      <div className="text-warning fw-bold" style={{ fontSize: '1.5rem' }}>
                        {formatCurrency(summary.pending)}
                      </div>
                      <div className="text-muted small">Pending</div>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="text-center">
                      <div className="text-success fw-bold" style={{ fontSize: '1.5rem' }}>
                        {formatCurrency(summary.paid)}
                      </div>
                      <div className="text-muted small">Paid</div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      <Tabs defaultActiveKey="referrals" className="mb-4">
        <Tab eventKey="referrals" title="Referrals">
          <Card className="shadow-sm">
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status" variant="primary" />
                  <p className="mt-3 text-muted">Loading referrals...</p>
                </div>
              ) : referrals.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-people text-muted" style={{ fontSize: '2rem' }}></i>
                  <p className="mt-3 text-muted">No referrals yet</p>
                  <p className="text-muted small">
                    Share your referral code or link to start earning commissions
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map(referral => (
                        <tr key={referral.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="rounded-circle bg-light text-primary d-flex align-items-center justify-content-center me-2" style={{ width: '40px', height: '40px' }}>
                                <i className="bi bi-person"></i>
                              </div>
                              <div>
                                <div>{referral.referredUser.name}</div>
                                <div className="text-muted small">{referral.referredUser.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>{formatDate(referral.createdAt)}</td>
                          <td>
                            <Badge bg={getStatusBadgeVariant(referral.status)}>
                              {referral.status}
                            </Badge>
                          </td>
                          <td>
                            {referral.status === 'COMPLETED' ? (
                              formatCurrency(50) // Example fixed commission
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="earnings" title="Earnings">
          <Card className="shadow-sm">
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status" variant="primary" />
                  <p className="mt-3 text-muted">Loading earnings...</p>
                </div>
              ) : earnings.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-cash-stack text-muted" style={{ fontSize: '2rem' }}></i>
                  <p className="mt-3 text-muted">No earnings yet</p>
                  <p className="text-muted small">
                    Refer users to start earning commissions
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map(earning => (
                        <tr key={earning.id}>
                          <td>
                            <div>{earning.description}</div>
                            {earning.referral && (
                              <div className="text-muted small">
                                Referral: {earning.referral.referredUser.name}
                              </div>
                            )}
                          </td>
                          <td>{formatDate(earning.createdAt)}</td>
                          <td className="fw-bold">{formatCurrency(earning.amount)}</td>
                          <td>
                            <Badge bg={getStatusBadgeVariant(earning.status)}>
                              {earning.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="settings" title="Payment Settings">
          <Card className="shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Payment Details</h5>
              <p className="text-muted mb-4">
                Update your payment details to receive affiliate commissions
              </p>
              
              {paymentDetailsError && (
                <Alert variant="danger" className="mb-4">
                  {paymentDetailsError}
                </Alert>
              )}
              
              {paymentDetailsSuccess && (
                <Alert variant="success" className="mb-4">
                  Payment details saved successfully
                </Alert>
              )}
              
              <Form onSubmit={savePaymentDetails}>
                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Account Holder Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="accountName"
                        value={paymentDetails.accountName || ''}
                        onChange={handlePaymentDetailsChange}
                        placeholder="Enter account holder name"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Account Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="accountNumber"
                        value={paymentDetails.accountNumber || ''}
                        onChange={handlePaymentDetailsChange}
                        placeholder="Enter account number"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>IFSC Code</Form.Label>
                      <Form.Control
                        type="text"
                        name="ifscCode"
                        value={paymentDetails.ifscCode || ''}
                        onChange={handlePaymentDetailsChange}
                        placeholder="Enter IFSC code"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>UPI ID (Optional)</Form.Label>
                      <Form.Control
                        type="text"
                        name="upiId"
                        value={paymentDetails.upiId || ''}
                        onChange={handlePaymentDetailsChange}
                        placeholder="Enter UPI ID"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <div className="d-flex justify-content-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingPaymentDetails}
                  >
                    {savingPaymentDetails ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Saving...
                      </>
                    ) : (
                      'Save Payment Details'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
};

export default AffiliateDashboard; 