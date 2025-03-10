import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Spinner, Alert, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import ReviewResponseForm from './ReviewResponseForm';

/**
 * Enhanced Review List Component
 * 
 * This component displays a list of reviews with their criteria and responses.
 * 
 * @param {Object} props - Component props
 * @param {string} props.targetUserId - The ID of the user whose reviews to display (optional)
 * @param {string} props.orderId - The ID of the order whose reviews to display (optional)
 * @param {boolean} props.showAnalytics - Whether to show analytics (default: false)
 */
const EnhancedReviewList = ({ targetUserId, orderId, showAnalytics = false }) => {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    },
    criteriaAverages: {},
  });
  const [activeTab, setActiveTab] = useState('all');

  // Fetch reviews on component mount
  useEffect(() => {
    fetchReviews();
  }, [targetUserId, orderId]);

  // Calculate analytics when reviews change
  useEffect(() => {
    if (reviews.length > 0) {
      calculateAnalytics();
    }
  }, [reviews]);

  // Fetch reviews from the API
  const fetchReviews = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (targetUserId) params.append('targetUserId', targetUserId);
      if (orderId) params.append('orderId', orderId);
      
      const response = await fetch(`/api/reviews?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics from reviews
  const calculateAnalytics = () => {
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    // Calculate rating distribution
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    
    reviews.forEach(review => {
      ratingDistribution[Math.floor(review.rating)] = (ratingDistribution[Math.floor(review.rating)] || 0) + 1;
    });
    
    // Calculate criteria averages
    const criteriaMap = {};
    
    reviews.forEach(review => {
      if (review.criteria && review.criteria.length > 0) {
        review.criteria.forEach(criterion => {
          if (!criteriaMap[criterion.name]) {
            criteriaMap[criterion.name] = {
              total: 0,
              count: 0,
            };
          }
          
          criteriaMap[criterion.name].total += criterion.rating;
          criteriaMap[criterion.name].count += 1;
        });
      }
    });
    
    const criteriaAverages = {};
    
    Object.entries(criteriaMap).forEach(([name, data]) => {
      criteriaAverages[name] = data.total / data.count;
    });
    
    setAnalytics({
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
      criteriaAverages,
    });
  };

  // Handle response submitted
  const handleResponseSubmitted = () => {
    // Refresh reviews
    fetchReviews();
  };

  // Filter reviews based on active tab
  const filteredReviews = () => {
    if (activeTab === 'all') {
      return reviews;
    }
    
    const rating = parseInt(activeTab, 10);
    return reviews.filter(review => Math.floor(review.rating) === rating);
  };

  // Render star rating
  const StarRating = ({ rating, size = 'md' }) => {
    const stars = [1, 2, 3, 4, 5];
    
    return (
      <div className="star-rating">
        {stars.map(star => (
          <i
            key={star}
            className={`bi ${star <= rating ? 'bi-star-fill' : 'bi-star'} ${size === 'sm' ? 'small' : ''}`}
            style={{ 
              color: star <= rating ? '#ffc107' : '#e4e5e9',
              fontSize: size === 'sm' ? '0.875rem' : '1rem',
              marginRight: '0.25rem'
            }}
          ></i>
        ))}
      </div>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Loading state
  if (loading && reviews.length === 0) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-3 text-muted">Loading reviews...</p>
        </Card.Body>
      </Card>
    );
  }

  // Error state
  if (error && reviews.length === 0) {
    return (
      <Alert variant="danger" className="mb-4">
        {error}
      </Alert>
    );
  }

  // No reviews state
  if (reviews.length === 0) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-5">
          <i className="bi bi-star text-muted" style={{ fontSize: '2rem' }}></i>
          <p className="mt-3 text-muted">No reviews yet</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="mb-4">
      {/* Analytics Section */}
      {showAnalytics && (
        <Card className="shadow-sm mb-4">
          <Card.Body>
            <h5 className="mb-4">Review Summary</h5>
            
            <Row className="g-4">
              <Col md={4}>
                <div className="text-center">
                  <div className="display-4 fw-bold text-primary mb-2">
                    {analytics.averageRating.toFixed(1)}
                  </div>
                  <div className="d-flex justify-content-center mb-2">
                    <StarRating rating={analytics.averageRating} />
                  </div>
                  <div className="text-muted">
                    Based on {analytics.totalReviews} reviews
                  </div>
                </div>
              </Col>
              
              <Col md={4}>
                <h6 className="mb-3">Rating Distribution</h6>
                {[5, 4, 3, 2, 1].map(rating => (
                  <div key={rating} className="d-flex align-items-center mb-2">
                    <div className="me-2" style={{ width: '12px' }}>
                      {rating}
                    </div>
                    <div className="progress flex-grow-1" style={{ height: '8px' }}>
                      <div
                        className="progress-bar bg-primary"
                        role="progressbar"
                        style={{ 
                          width: `${(analytics.ratingDistribution[rating] / analytics.totalReviews) * 100}%` 
                        }}
                        aria-valuenow={(analytics.ratingDistribution[rating] / analytics.totalReviews) * 100}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                    <div className="ms-2 text-muted small">
                      {analytics.ratingDistribution[rating]}
                    </div>
                  </div>
                ))}
              </Col>
              
              <Col md={4}>
                <h6 className="mb-3">Criteria Ratings</h6>
                {Object.entries(analytics.criteriaAverages).map(([name, average]) => (
                  <div key={name} className="mb-2">
                    <div className="d-flex justify-content-between mb-1">
                      <span>{name}</span>
                      <span className="text-muted">{average.toFixed(1)}</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div
                        className="progress-bar bg-primary"
                        role="progressbar"
                        style={{ width: `${(average / 5) * 100}%` }}
                        aria-valuenow={(average / 5) * 100}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </div>
                ))}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
      
      {/* Reviews List */}
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <Tabs
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
            className="border-bottom-0"
          >
            <Tab eventKey="all" title={`All (${reviews.length})`} />
            {[5, 4, 3, 2, 1].map(rating => (
              <Tab 
                key={rating} 
                eventKey={rating.toString()} 
                title={
                  <div className="d-flex align-items-center">
                    <span>{rating}</span>
                    <i className="bi bi-star-fill ms-1 text-warning"></i>
                    <span className="ms-1">({analytics.ratingDistribution[rating] || 0})</span>
                  </div>
                }
              />
            ))}
          </Tabs>
        </Card.Header>
        
        <Card.Body>
          {filteredReviews().map(review => (
            <div key={review.id} className="mb-4 pb-4 border-bottom">
              <div className="d-flex mb-3">
                <div className="me-3">
                  <div className="rounded-circle bg-light text-primary d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                    {review.user.profilePicture ? (
                      <img 
                        src={review.user.profilePicture} 
                        alt={review.user.name} 
                        className="rounded-circle" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <i className="bi bi-person"></i>
                    )}
                  </div>
                </div>
                
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-0">{review.user.name}</h6>
                      <div className="d-flex align-items-center">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="ms-2 text-muted small">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    {review.order && (
                      <Badge bg="light" text="dark" className="border">
                        Order #{review.order.orderNumber}
                      </Badge>
                    )}
                  </div>
                  
                  {review.comment && (
                    <p className="mt-2 mb-3">{review.comment}</p>
                  )}
                  
                  {review.criteria && review.criteria.length > 0 && (
                    <div className="bg-light p-2 rounded mb-3">
                      <div className="row g-2">
                        {review.criteria.map(criterion => (
                          <div key={criterion.id} className="col-md-6 col-lg-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="small">{criterion.name}</span>
                              <div className="d-flex align-items-center">
                                <span className="me-1 small">{criterion.rating}</span>
                                <i className="bi bi-star-fill text-warning small"></i>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Review Responses */}
                  {review.responses && review.responses.length > 0 && (
                    <div className="ms-4 mt-3 border-start ps-3">
                      {review.responses.map(response => (
                        <div key={response.id} className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <div className="me-2">
                              <div className="rounded-circle bg-light text-primary d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                                {response.user.profilePicture ? (
                                  <img 
                                    src={response.user.profilePicture} 
                                    alt={response.user.name} 
                                    className="rounded-circle" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <i className="bi bi-person"></i>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="d-flex align-items-center">
                                <span className="fw-bold small">{response.user.name}</span>
                                <Badge bg="secondary" className="ms-2 small">
                                  {response.user.role === 'vendor' ? 'Vendor' : 'Admin'}
                                </Badge>
                              </div>
                              <div className="text-muted small">
                                {formatDate(response.createdAt)}
                              </div>
                            </div>
                          </div>
                          <p className="mb-0 small">{response.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Response Form for Vendors */}
              {session && 
               (session.user.role === 'vendor' || session.user.role === 'admin') && 
               (!review.responses || review.responses.length === 0) && (
                <div className="ms-5 mt-2">
                  <ReviewResponseForm 
                    reviewId={review.id} 
                    onResponseSubmitted={handleResponseSubmitted} 
                  />
                </div>
              )}
            </div>
          ))}
          
          {filteredReviews().length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted">No reviews in this category</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EnhancedReviewList; 