'use client'

import { useState, useEffect, useCallback } from 'react'
import { Container, Row, Col, Card, Button, Alert, Badge, Spinner } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import VendorList from '../../../components/VendorList'
import PaymentModal from '../../../components/PaymentModal'
import { formatDate, formatDateTime, formatCurrency, getStatusBadgeVariant } from '../../../lib/utils'
import { BsStarFill, BsStar } from 'react-icons/bs'
import ReviewForm from '../../../components/ReviewForm'
import PriceBreakdownTooltip, { getPricingExplanations } from '../../../components/PriceBreakdownTooltip'
import VendorPriceComparison from '../../../components/VendorPriceComparison'

export default function OrderPage({ params }) {
  const { data: session, status: sessionStatus } = useSession()
  const [order, setOrder] = useState(null)
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const fetchData = useCallback(async () => {
    if (!params?.orderId) {
      setError('Invalid order ID')
      setLoading(false)
      return
    }
    
    try {
      // Fetch order details
      const orderResponse = await fetch(`/api/orders/${params.orderId}`)
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch order: ${orderResponse.status}`)
      }
      const orderData = await orderResponse.json()
      setOrder(orderData)

      // Fetch vendors if order is in Initiated or Requests Sent status
      if (orderData.status === 'Initiated' || orderData.status === 'Requests Sent') {
        const vendorsResponse = await fetch('/api/vendors')
        if (!vendorsResponse.ok) {
          const errorData = await vendorsResponse.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch vendors: ${vendorsResponse.status}`)
        }
        const vendorsData = await vendorsResponse.json()
        setVendors(vendorsData || [])
      } else if (orderData.status === 'Paid' && orderData.selectedVendorId) {
        // If order is paid, fetch just the selected vendor
        const vendorResponse = await fetch(`/api/vendors/${orderData.selectedVendorId}`)
        if (vendorResponse.ok) {
          const vendorData = await vendorResponse.json()
          setVendors([vendorData])
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error.message || 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }, [params?.orderId])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchData()
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false)
    }

    // Add event listener for order updates
    const handleOrderUpdate = (event) => {
      const updatedOrder = event.detail
      if (updatedOrder && updatedOrder.orderId === params?.orderId) {
        setOrder(updatedOrder)
      }
    }

    window.addEventListener('orderUpdated', handleOrderUpdate)

    return () => {
      window.removeEventListener('orderUpdated', handleOrderUpdate)
    }
  }, [sessionStatus, params?.orderId, fetchData])

  const handleAcceptQuote = (quote) => {
    if (isProcessingPayment) return
    
    if (!quote || !quote.vendorId || !quote.amount) {
      setError('Invalid quote selected')
      return
    }
    
    setSelectedQuote(quote)
    setShowPayment(true)
    setIsProcessingPayment(true)
  }

  const handlePaymentModalClose = () => {
    setShowPayment(false)
    setIsProcessingPayment(false)
    // Refresh order data when payment modal is closed
    fetchData()
  }

  const handleReviewSubmitted = (review) => {
    setReviewSubmitted(true)
    // Optionally refresh the order data to show the review
    fetchData()
  }

  const renderStars = (rating) => {
    if (rating === undefined || rating === null) {
      return Array(5).fill().map((_, i) => <BsStar key={i} className="text-warning" />)
    }
    
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= rating ? 
          <BsStarFill key={i} className="text-warning" /> : 
          <BsStar key={i} className="text-warning" />
      )
    }
    return stars
  }

  const renderReviewSection = () => {
    if (!order || !order.selectedVendorId) {
      return null
    }

    // Don't show review form if order is not completed or paid
    if (order.status !== 'Completed' && order.status !== 'Paid') {
      return null
    }

    // Don't show review form if review already exists
    if (order.review || reviewSubmitted) {
      return (
        <div className="mt-4">
          <h4>Your Review</h4>
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <div className="me-2">Rating: {order.review?.rating || 0} stars</div>
              </div>
              <p>{order.review?.comment || 'No comment provided.'}</p>
              <small className="text-muted">
                Submitted on {formatDateTime(order.review?.createdAt)}
              </small>
            </Card.Body>
          </Card>
        </div>
      )
    }

    // Show review form
    return (
      <div className="mt-4">
        <ReviewForm 
          orderId={order.orderId}
          vendorId={order.selectedVendorId}
          vendorName={vendors.find(v => v?.vendorId === order.selectedVendorId)?.name || 'this vendor'}
          onReviewSubmitted={handleReviewSubmitted}
        />
      </div>
    )
  }

  if (sessionStatus === 'loading' || loading) {
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
          <p>Please sign in to view order details.</p>
        </Alert>
      </Container>
    )
  }

  if (error || !order) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error || 'Order not found'}</p>
          <Button 
            variant="outline-primary" 
            onClick={() => {
              setError('')
              setLoading(true)
              fetchData()
            }}
          >
            Try Again
          </Button>
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="py-5">
      <Row>
        <Col lg={12}>
          <Card className="mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="mb-0">Order #{order.orderId.slice(0, 8)}</h2>
                <Badge bg={getStatusBadgeVariant(order.status)}>
                  {order.status}
                </Badge>
              </div>
              <Card.Text>
                <strong>From:</strong> {order.pickupPincode}<br />
                <strong>To:</strong> {order.destinationPincode}<br />
                <strong>Size:</strong> {order.moveSize}<br />
                <strong>Date:</strong> {formatDate(order.moveDate)}
              </Card.Text>
            </Card.Body>
          </Card>

          {(order.status === 'Initiated' || order.status === 'Requests Sent') && (
            <div>
              {order.quotes && order.quotes.length > 0 && (
                <>
                  <h3 className="mb-4">Quotes Received</h3>
                  {order.quotes && order.quotes.length > 1 && (
                    <VendorPriceComparison 
                      quotes={order.quotes} 
                      vendors={vendors} 
                      priceEstimate={order.priceEstimate}
                    />
                  )}
                  <Row className="mb-4">
                    {order.quotes.map(quote => {
                      const vendor = vendors.find(v => v?.vendorId === quote.vendorId)
                      return (
                        <Col key={quote.vendorId} md={6} className="mb-3">
                          <Card className="h-100 border-success">
                            <Card.Body>
                              <Card.Title className="d-flex justify-content-between align-items-center">
                                {vendor?.name || 'Unknown Vendor'}
                                <Badge bg="success">Quote Received</Badge>
                              </Card.Title>
                              <div className="mb-2">
                                {renderStars(vendor?.rating)}
                                <span className="ms-2 align-middle">({vendor?.reviews?.length || 0} reviews)</span>
                              </div>
                              <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-baseline mb-1">
                                  <strong>
                                    Base Price
                                    <PriceBreakdownTooltip 
                                      componentName="Base Price" 
                                      explanation="Starting price based on vendor tier and location. This is subject to change based on move details."
                                    />
                                  </strong>
                                  <span>{formatCurrency(vendor?.basePrice)}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-baseline">
                                  <strong>
                                    Estimated Price
                                    <PriceBreakdownTooltip 
                                      componentName="Estimated Price" 
                                      explanation="Final price quoted by the vendor based on your specific move details. This is the amount you'll pay if you select this vendor."
                                    />
                                  </strong>
                                  <span className="text-success fw-bold">
                                    {formatCurrency(quote.amount)}
                                  </span>
                                </div>
                              </div>
                              <div className="mb-3">
                                <strong>Submitted:</strong> {formatDate(quote.submittedAt)}<br />
                                {vendor?.description && (
                                  <small className="text-muted">{vendor.description}</small>
                                )}
                              </div>
                              <Button
                                variant="success"
                                onClick={() => handleAcceptQuote(quote)}
                                className="w-100"
                                disabled={isProcessingPayment}
                              >
                                {isProcessingPayment && selectedQuote?.vendorId === quote.vendorId ? (
                                  <>
                                    <Spinner
                                      as="span"
                                      animation="border"
                                      size="sm"
                                      role="status"
                                      aria-hidden="true"
                                      className="me-2"
                                    />
                                    Processing...
                                  </>
                                ) : 'Accept & Pay'}
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      )
                    })}
                  </Row>
                </>
              )}

              <div className={order.quotes?.length > 0 ? "mt-5" : ""}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h3 className="mb-0">Available Vendors</h3>
                  {order.quotes?.length > 0 && (
                    <Badge bg="info" className="fs-6">
                      Compare More Options
                    </Badge>
                  )}
                </div>

                {order.vendorRequests?.length > 0 && (
                  <Alert variant="info" className="mb-4">
                    <Alert.Heading>Quotes Requested</Alert.Heading>
                    <p>We've sent your request to {order.vendorRequests.length} vendor(s). You'll be notified when they submit their quotes.</p>
                    <p className="mb-0">Meanwhile, you can request quotes from other vendors below to compare more options.</p>
                  </Alert>
                )}

                <VendorList 
                  vendors={vendors} 
                  orderId={order.orderId}
                  selectedVendors={order.vendorRequests || []}
                  pickupPincode={order.pickupPincode}
                  destinationPincode={order.destinationPincode}
                  quotes={order.quotes || []}
                />
              </div>
            </div>
          )}

          {order.status === 'Paid' && (
            <>
              <Alert variant="success">
                <h4>Payment Confirmed</h4>
                <p>Your payment has been confirmed. The vendor will contact you shortly to coordinate the move.</p>
                <hr />
                <p className="mb-0">
                  <strong>Payment ID:</strong> {order.payment?.razorpayPaymentId || 'N/A'}<br />
                  <strong>Paid on:</strong> {formatDateTime(order.payment?.paidAt)}
                </p>
              </Alert>
              <Card className="mt-4">
                <Card.Body>
                  <h4>Selected Vendor</h4>
                  <div className="mb-3">
                    <strong>Vendor:</strong> {vendors.find(v => v?.vendorId === order.selectedVendorId)?.name || 'Unknown Vendor'}<br />
                    <strong>Amount Paid:</strong> {formatCurrency(order.payment?.amount)}
                  </div>
                </Card.Body>
              </Card>
            </>
          )}

          {renderReviewSection()}
        </Col>
      </Row>

      {showPayment && selectedQuote && (
        <PaymentModal
          show={showPayment}
          onHide={handlePaymentModalClose}
          orderId={order.orderId}
          vendorId={selectedQuote.vendorId}
          amount={selectedQuote.amount}
        />
      )}
    </Container>
  )
} 