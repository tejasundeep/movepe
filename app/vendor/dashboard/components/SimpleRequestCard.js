import { useState, useEffect } from 'react'
import { Card, Badge, Button, Form, Spinner, Alert } from 'react-bootstrap'
import { FaMapMarkerAlt, FaCalendarAlt, FaRupeeSign, FaCheck, FaTimes, FaTruck } from 'react-icons/fa'
import { formatDate } from '../../../../lib/utils'
import { useRouter } from 'next/navigation'

export default function SimpleRequestCard({ request, onSubmitQuote }) {
  const [quoteAmount, setQuoteAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [recommendedPrice, setRecommendedPrice] = useState(null)
  const [loadingRecommendation, setLoadingRecommendation] = useState(false)
  const [showPriceInput, setShowPriceInput] = useState(false)
  const router = useRouter()

  const navigateTo = (path) => {
    router.push(path)
  }

  // Fetch recommended price when component mounts
  useEffect(() => {
    if (request && request.orderId && !request.submittedQuote && !recommendedPrice) {
      fetchRecommendedPrice();
    }
  }, [request, recommendedPrice]);

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

  const handleSubmit = async () => {
    if (!quoteAmount || isNaN(Number(quoteAmount)) || Number(quoteAmount) < 1000) {
      setError('Please enter a valid amount (minimum ₹1,000)');
      return;
    }
    
    setError('');
    setSubmitting(true);
    
    try {
      if (!onSubmitQuote) {
        throw new Error('Quote submission function not available');
      }
      
      await onSubmitQuote(request.orderId, Number(quoteAmount));
      setShowPriceInput(false);
    } catch (error) {
      setError(error.message || 'Could not send your price. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get status color
  const getStatusColor = () => {
    if (request.wonOpportunity) return 'success';
    if (request.lostOpportunity) return 'danger';
    if (request.submittedQuote) return 'warning';
    return 'primary';
  };

  // Get status text
  const getStatusText = () => {
    if (request.wonOpportunity) return 'Confirmed';
    if (request.lostOpportunity) return 'Not Selected';
    if (request.submittedQuote) return 'Waiting';
    return 'New Request';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (request.wonOpportunity) return <FaCheck size={18} />;
    if (request.lostOpportunity) return <FaTimes size={18} />;
    if (request.submittedQuote) return <FaTruck size={18} />;
    return null;
  };

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Badge bg={getStatusColor()} className="px-3 py-2">
            <div className="d-flex align-items-center">
              {getStatusIcon()}
              <span className="ms-1">{getStatusText()}</span>
            </div>
          </Badge>
          <div className="fw-bold">
            {request.moveSize || 'Parcel'} Move
          </div>
        </div>

        <div className="location-info mb-3">
          <div className="d-flex align-items-center mb-2">
            <FaMapMarkerAlt className="text-primary me-2" />
            <div>
              <strong>From:</strong> {request.pickupPincode || 'N/A'} 
              <strong className="ms-2">To:</strong> {request.destinationPincode || 'N/A'}
            </div>
          </div>
          <div className="d-flex align-items-center">
            <FaCalendarAlt className="text-primary me-2" />
            <div>
              <strong>Date:</strong> {formatDate(request.moveDate) || 'Flexible'}
            </div>
          </div>
        </div>

        {/* For new requests */}
        {!request.submittedQuote && !request.wonOpportunity && !request.lostOpportunity && (
          <div className="price-section">
            {!showPriceInput ? (
              <div className="text-center">
                {loadingRecommendation ? (
                  <div className="my-3">
                    <Spinner animation="border" size="sm" /> 
                    <span className="ms-2">Finding best price...</span>
                  </div>
                ) : recommendedPrice ? (
                  <div className="mb-3">
                    <div className="recommended-price-box">
                      <div className="recommended-label">Suggested Price</div>
                      <div className="price-value">{formatCurrency(recommendedPrice)}</div>
                    </div>
                    <Button 
                      variant="primary" 
                      size="lg" 
                      className="mt-3 w-100"
                      onClick={() => setShowPriceInput(true)}
                    >
                      Send Price Quote
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="primary" 
                    onClick={() => setShowPriceInput(true)}
                    className="w-100"
                  >
                    Send Your Price
                  </Button>
                )}
              </div>
            ) : (
              <div className="price-input-section">
                <h5 className="text-center mb-3">Enter Your Price</h5>
                
                {error && (
                  <Alert variant="danger" className="mb-3">
                    {error}
                  </Alert>
                )}
                
                <div className="price-input-container mb-3">
                  <div className="price-input-wrapper">
                    <FaRupeeSign size={24} className="price-icon" />
                    <input
                      type="number"
                      className="price-input"
                      value={quoteAmount}
                      onChange={(e) => {
                        setQuoteAmount(e.target.value);
                        setError('');
                      }}
                      placeholder="Enter amount"
                      min="1000"
                    />
                  </div>
                </div>
                
                <div className="d-flex justify-content-between">
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setShowPriceInput(false)}
                    disabled={submitting}
                    className="px-4"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="success" 
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4"
                  >
                    {submitting ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Sending...
                      </>
                    ) : 'Send Price'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* For submitted quotes */}
        {request.submittedQuote && !request.wonOpportunity && !request.lostOpportunity && (
          <div className="text-center">
            <div className="quote-info-box">
              <div className="quote-label">Your Price</div>
              <div className="price-value">{formatCurrency(request.quoteAmount)}</div>
              <div className="quote-date">Sent on {formatDate(request.quoteSubmittedAt)}</div>
            </div>
            <div className="waiting-message mt-3">
              Waiting for customer to respond
            </div>
          </div>
        )}

        {/* For won opportunities */}
        {request.wonOpportunity && (
          <div className="text-center">
            <div className="success-box">
              <div className="success-icon">
                <FaCheck size={32} />
              </div>
              <div className="success-message">Customer selected your price!</div>
              <div className="price-value">{formatCurrency(request.quoteAmount)}</div>
              <div className="payment-date">Paid on {formatDate(request.paidAt)}</div>
            </div>
            <Button 
              variant="success" 
              className="mt-3"
              onClick={() => navigateTo(`/order/${request.orderId}`)}
              aria-label="View order details"
            >
              View Order Details
            </Button>
          </div>
        )}

        {/* For lost opportunities */}
        {request.lostOpportunity && (
          <div className="text-center">
            <div className="lost-box">
              {request.didQuote ? (
                <>
                  <div className="lost-message">Customer selected another vendor</div>
                  <div className="price-value">Your price: {formatCurrency(request.quoteAmount)}</div>
                  <div className="selected-vendor">
                    Selected: {request.selectedVendorName || 'Another vendor'}
                  </div>
                </>
              ) : (
                <div className="lost-message">
                  You did not send a price in time
                </div>
              )}
            </div>
          </div>
        )}
      </Card.Body>

      <style jsx global>{`
        .recommended-price-box {
          background-color: #e8f4ff;
          border-radius: 10px;
          padding: 15px;
          text-align: center;
        }
        
        .recommended-label {
          font-size: 14px;
          color: #0066cc;
          margin-bottom: 5px;
        }
        
        .price-value {
          font-size: 24px;
          font-weight: bold;
        }
        
        .price-input-container {
          display: flex;
          justify-content: center;
        }
        
        .price-input-wrapper {
          position: relative;
          width: 100%;
          max-width: 300px;
        }
        
        .price-icon {
          position: absolute;
          left: 15px;
          top: 12px;
          color: #495057;
        }
        
        .price-input {
          width: 100%;
          padding: 10px 10px 10px 45px;
          font-size: 20px;
          border: 2px solid #ced4da;
          border-radius: 10px;
          text-align: center;
        }
        
        .price-input:focus {
          border-color: #80bdff;
          outline: 0;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
        }
        
        .quote-info-box {
          background-color: #fff8e1;
          border-radius: 10px;
          padding: 15px;
          text-align: center;
        }
        
        .quote-label {
          font-size: 14px;
          color: #ff8f00;
          margin-bottom: 5px;
        }
        
        .quote-date {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
        }
        
        .waiting-message {
          color: #ff8f00;
          font-weight: 500;
        }
        
        .success-box {
          background-color: #e8f5e9;
          border-radius: 10px;
          padding: 15px;
          text-align: center;
        }
        
        .success-icon {
          color: #2e7d32;
          margin-bottom: 10px;
        }
        
        .success-message {
          color: #2e7d32;
          font-weight: 500;
          margin-bottom: 5px;
        }
        
        .payment-date {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
        }
        
        .lost-box {
          background-color: #ffebee;
          border-radius: 10px;
          padding: 15px;
          text-align: center;
        }
        
        .lost-message {
          color: #c62828;
          font-weight: 500;
          margin-bottom: 5px;
        }
        
        .selected-vendor {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
        }
      `}</style>
    </Card>
  );
} 