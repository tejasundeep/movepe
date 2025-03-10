import React, { useState } from 'react';
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { useSession } from 'next-auth/react';

/**
 * Review Response Form Component
 * 
 * This component provides a form for vendors to respond to customer reviews.
 * 
 * @param {Object} props - Component props
 * @param {string} props.reviewId - The ID of the review to respond to
 * @param {Function} props.onResponseSubmitted - Callback function called when a response is successfully submitted
 */
const ReviewResponseForm = ({ reviewId, onResponseSubmitted }) => {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Handle content change
  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!content.trim()) {
      setError('Please enter a response');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/reviews/${reviewId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit response');
      }
      
      setSuccess(true);
      
      // Reset form
      setContent('');
      
      // Call the callback function if provided
      if (onResponseSubmitted) {
        onResponseSubmitted();
      }
    } catch (err) {
      console.error('Error submitting response:', err);
      setError(err.message || 'Failed to submit response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If not authenticated or not a vendor, don't render the form
  if (!session || (session.user.role !== 'vendor' && session.user.role !== 'admin')) {
    return null;
  }

  // If response was successfully submitted, show success message
  if (success) {
    return (
      <Alert variant="success">
        Your response has been submitted successfully.
      </Alert>
    );
  }

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-white">
        <h6 className="mb-0">Respond to this Review</h6>
      </Card.Header>
      
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Control
              as="textarea"
              rows={3}
              value={content}
              onChange={handleContentChange}
              placeholder="Thank the customer for their feedback or address their concerns..."
            />
            <Form.Text className="text-muted">
              Your response will be visible to all users. Keep it professional and constructive.
            </Form.Text>
          </Form.Group>
          
          <div className="d-flex justify-content-end">
            <Button 
              type="submit" 
              variant="primary"
              size="sm"
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
                    className="me-1"
                  />
                  Submitting...
                </>
              ) : (
                'Submit Response'
              )}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ReviewResponseForm; 