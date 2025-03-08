import { useState, useEffect } from 'react'
import { Card, Badge, Button, Form, InputGroup, Spinner, Alert } from 'react-bootstrap'
import { formatDate, formatCurrency } from '../../../../lib/utils'

export default function RequestCard({ request, onSubmitQuote }) {
  const [quoteAmount, setQuoteAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')
  const [recommendedPrice, setRecommendedPrice] = useState(null)
  const [priceWarning, setPriceWarning] = useState(null)
  const [loadingRecommendation, setLoadingRecommendation] = useState(false)

  // Fetch recommended price when component mounts
  useEffect(() => {
    if (request && request.orderId && !request.submittedQuote && !recommendedPrice) {
      fetchRecommendedPrice();
    }
  }, [request]);

  const fetchRecommendedPrice = async () => {
    setLoadingRecommendation(true);
    try {
      const response = await fetch(`/api/vendor/price-recommendation/${request.orderId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.recommendedPrice) {
          setRecommendedPrice(data.recommendedPrice);
          // Pre-fill the quote amount with the recommended price
          setQuoteAmount(data.recommendedPrice.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching price recommendation:', error);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const validateAmount = (amount) => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return 'Please enter a valid amount';
    }
    if (numericAmount < 1000) {
      return 'Minimum quote amount is ₹1,000';
    }
    if (numericAmount > 1000000) {
      return 'Maximum quote amount is ₹10,00,000';
    }
    return '';
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setQuoteAmount(value);
    setValidationError(validateAmount(value));
    
    // Show price warning if amount deviates significantly from recommendation
    if (recommendedPrice) {
      const numericAmount = Number(value);
      if (!isNaN(numericAmount) && numericAmount > 0) {
        if (numericAmount < recommendedPrice * 0.7) {
          setPriceWarning('Your quote is significantly lower than the recommended price. This may affect your profit margin.');
        } else if (numericAmount > recommendedPrice * 1.3) {
          setPriceWarning('Your quote is significantly higher than the recommended price. This may reduce your chances of being selected.');
        } else {
          setPriceWarning(null);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate amount before submission
    const validationMessage = validateAmount(quoteAmount);
    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }
    
    setError('')
    setValidationError('')
    setSubmitting(true)
    
    try {
      if (!request || !request.orderId) {
        throw new Error('Invalid request data');
      }
      
      const result = await onSubmitQuote(request.orderId, Number(quoteAmount));
      
      // Update warning from server response if available
      if (result && result.priceWarning) {
        setPriceWarning(result.priceWarning);
      }
      
      setQuoteAmount('')
    } catch (error) {
      console.error('Error submitting quote:', error);
      setError(error.message || 'Failed to submit quote')
    } finally {
      setSubmitting(false)
    }
  }

  if (!request) {
    return null;
  }

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <span className="fw-bold">
            Order #{request.orderId ? request.orderId.substring(0, 8) : 'Unknown'}...
          </span>
          {request.wonOpportunity && (
            <Badge bg="success" className="ms-2">Won</Badge>
          )}
          {request.lostOpportunity && (
            <Badge bg="danger" className="ms-2">Lost</Badge>
          )}
          {request.submittedQuote && (
            <Badge bg="warning" text="dark" className="ms-2">Quote Submitted</Badge>
          )}
        </div>
        <Badge bg="primary">
          {request.moveSize || 'Unknown'}
        </Badge>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <strong>From:</strong> {request.pickupPincode || 'N/A'} <strong>To:</strong> {request.destinationPincode || 'N/A'}
        </div>
        <div className="mb-3">
          <strong>Move Date:</strong> {formatDate(request.moveDate)}
        </div>

        {request.submittedQuote && (
          <div className="mb-3">
            <strong>Your Quote:</strong> {formatCurrency(request.quoteAmount)}
            <br />
            <small className="text-muted">Submitted on {formatDate(request.quoteSubmittedAt)}</small>
          </div>
        )}

        {request.wonOpportunity && (
          <div className="mb-3">
            <strong>Payment Amount:</strong> {formatCurrency(request.quoteAmount)}
            <br />
            <small className="text-muted">Paid on {formatDate(request.paidAt)}</small>
          </div>
        )}

        {request.lostOpportunity && (
          <div className="mb-3">
            {request.didQuote ? (
              <>
                <strong>Your Quote:</strong> {formatCurrency(request.quoteAmount)}
                <br />
                <strong>Selected Vendor:</strong> {request.selectedVendorName || 'Another vendor'}
                <br />
                <small className="text-muted">{request.priceComparisonMessage || 'Customer selected another vendor'}</small>
              </>
            ) : (
              <small className="text-muted">{request.priceComparisonMessage || 'You did not submit a quote in time'}</small>
            )}
          </div>
        )}

        {!request.submittedQuote && !request.wonOpportunity && !request.lostOpportunity && (
          <>
            {recommendedPrice && (
              <div className="mb-3">
                <strong>Recommended Price:</strong> {formatCurrency(recommendedPrice)}
                <br />
                <small className="text-muted">Based on distance, move size, and market conditions</small>
              </div>
            )}
            
            {loadingRecommendation && (
              <div className="mb-3 text-center">
                <Spinner animation="border" size="sm" /> Calculating recommended price...
              </div>
            )}
            
            {priceWarning && (
              <Alert variant="warning" className="mb-3">
                {priceWarning}
              </Alert>
            )}
            
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Submit Your Quote</Form.Label>
                <InputGroup>
                  <InputGroup.Text>₹</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min="1000"
                    max="1000000"
                    placeholder="Enter amount"
                    value={quoteAmount}
                    onChange={handleAmountChange}
                    isInvalid={!!validationError}
                    required
                  />
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={submitting || !quoteAmount || !!validationError}
                  >
                    {submitting ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                        />
                        <span className="visually-hidden">Submitting...</span>
                      </>
                    ) : 'Submit Quote'}
                  </Button>
                  <Form.Control.Feedback type="invalid">
                    {validationError}
                  </Form.Control.Feedback>
                </InputGroup>
                {error && (
                  <Form.Text className="text-danger">
                    {error}
                  </Form.Text>
                )}
              </Form.Group>
            </Form>
          </>
        )}
      </Card.Body>
    </Card>
  )
} 