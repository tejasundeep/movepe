import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useSession } from 'next-auth/react';

/**
 * Enhanced Review Form Component
 * 
 * This component provides a form for submitting multi-criteria reviews.
 * 
 * @param {Object} props - Component props
 * @param {string} props.orderId - The ID of the order being reviewed
 * @param {string} props.targetUserId - The ID of the user being reviewed (vendor or rider)
 * @param {string} props.targetUserName - The name of the user being reviewed
 * @param {string} props.targetUserRole - The role of the user being reviewed (vendor or rider)
 * @param {Function} props.onReviewSubmitted - Callback function called when a review is successfully submitted
 */
const EnhancedReviewForm = ({ 
  orderId, 
  targetUserId, 
  targetUserName, 
  targetUserRole,
  onReviewSubmitted 
}) => {
  const { data: session } = useSession();
  const [overallRating, setOverallRating] = useState(0);
  const [comment, setComment] = useState('');
  const [criteria, setCriteria] = useState([
    { name: 'Communication', rating: 0 },
    { name: 'Timeliness', rating: 0 },
    { name: 'Professionalism', rating: 0 },
    { name: 'Value for Money', rating: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Handle overall rating change
  const handleOverallRatingChange = (rating) => {
    setOverallRating(rating);
  };

  // Handle criteria rating change
  const handleCriteriaRatingChange = (index, rating) => {
    const updatedCriteria = [...criteria];
    updatedCriteria[index].rating = rating;
    setCriteria(updatedCriteria);
    
    // Update overall rating based on average of criteria ratings
    const sum = updatedCriteria.reduce((total, criterion) => total + criterion.rating, 0);
    const average = sum / updatedCriteria.length;
    setOverallRating(Math.round(average));
  };

  // Handle comment change
  const handleCommentChange = (e) => {
    setComment(e.target.value);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (overallRating === 0) {
      setError('Please provide an overall rating');
      return;
    }
    
    // Check if all criteria have ratings
    const hasUnratedCriteria = criteria.some(criterion => criterion.rating === 0);
    if (hasUnratedCriteria) {
      setError('Please rate all criteria');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          targetUserId,
          rating: overallRating,
          comment,
          criteria,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit review');
      }
      
      setSuccess(true);
      
      // Reset form
      setOverallRating(0);
      setComment('');
      setCriteria(criteria.map(criterion => ({ ...criterion, rating: 0 })));
      
      // Call the callback function if provided
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render star rating component
  const StarRating = ({ rating, onChange, size = 'md' }) => {
    const stars = [1, 2, 3, 4, 5];
    
    return (
      <div className="star-rating">
        {stars.map(star => (
          <i
            key={star}
            className={`bi ${star <= rating ? 'bi-star-fill' : 'bi-star'} ${size === 'sm' ? 'small' : ''}`}
            style={{ 
              color: star <= rating ? '#ffc107' : '#e4e5e9',
              cursor: 'pointer',
              fontSize: size === 'sm' ? '1rem' : '1.5rem',
              marginRight: '0.25rem'
            }}
            onClick={() => onChange(star)}
          ></i>
        ))}
      </div>
    );
  };

  // If not authenticated, don't render the form
  if (!session) {
    return (
      <Alert variant="warning">
        Please sign in to leave a review.
      </Alert>
    );
  }

  // If review was successfully submitted, show success message
  if (success) {
    return (
      <Alert variant="success">
        <Alert.Heading>Thank you for your review!</Alert.Heading>
        <p>
          Your feedback helps improve our service and helps others make informed decisions.
        </p>
      </Alert>
    );
  }

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-white">
        <h5 className="mb-0">Rate Your Experience with {targetUserName}</h5>
      </Card.Header>
      
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <div className="mb-4 text-center">
            <Form.Label>Overall Rating</Form.Label>
            <div className="d-flex justify-content-center mb-2">
              <StarRating rating={overallRating} onChange={handleOverallRatingChange} />
            </div>
            <div className="text-muted small">
              {overallRating === 0 ? 'Select a rating' : `${overallRating} out of 5 stars`}
            </div>
          </div>
          
          <hr className="my-4" />
          
          <h6 className="mb-3">Rate Specific Aspects</h6>
          <Row className="g-3 mb-4">
            {criteria.map((criterion, index) => (
              <Col md={6} key={criterion.name}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Form.Label className="mb-0">{criterion.name}</Form.Label>
                  <StarRating 
                    rating={criterion.rating} 
                    onChange={(rating) => handleCriteriaRatingChange(index, rating)} 
                    size="sm"
                  />
                </div>
              </Col>
            ))}
          </Row>
          
          <Form.Group className="mb-4">
            <Form.Label>Your Review (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={comment}
              onChange={handleCommentChange}
              placeholder={`Share your experience with ${targetUserName}...`}
            />
          </Form.Group>
          
          <div className="d-flex justify-content-end">
            <Button 
              type="submit" 
              variant="primary"
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
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default EnhancedReviewForm; 