'use client'

import { useState, useEffect } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { BsStarFill, BsStar } from 'react-icons/bs'
import { useSession } from 'next-auth/react'

export default function ReviewForm({ orderId, vendorId, vendorName, onReviewSubmitted }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hoverRating, setHoverRating] = useState(0)
  const [existingReview, setExistingReview] = useState(null)
  const { data: session } = useSession()

  useEffect(() => {
    // Check if a review already exists for this order
    if (orderId) {
      const checkExistingReview = async () => {
        try {
          const response = await fetch(`/api/reviews?orderId=${orderId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.reviews && data.reviews.length > 0) {
              setExistingReview(data.reviews[0])
              setRating(data.reviews[0].rating)
              setComment(data.reviews[0].comment || '')
            }
          }
        } catch (error) {
          console.error('Error checking for existing review:', error)
        }
      }
      
      checkExistingReview()
    }
  }, [orderId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const method = existingReview ? 'PUT' : 'POST'
      const endpoint = '/api/reviews'
      const body = {
        orderId,
        vendorId,
        rating,
        comment
      }
      
      // Add reviewId if updating an existing review
      if (existingReview) {
        body.reviewId = existingReview.reviewId
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit review')
      }

      const data = await response.json()
      
      if (onReviewSubmitted) {
        onReviewSubmitted(data)
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting your review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStarInput = () => {
    const stars = []
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span 
          key={i}
          className="star-rating-input"
          onClick={() => setRating(i)}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          style={{ cursor: 'pointer', fontSize: '1.5rem', color: '#ffc107', marginRight: '5px' }}
        >
          {i <= (hoverRating || rating) ? <BsStarFill /> : <BsStar />}
        </span>
      )
    }
    
    return stars
  }

  if (!session) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="info">
            Please sign in to leave a review.
          </Alert>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card>
      <Card.Body>
        <Card.Title>
          {existingReview ? 'Update your review' : `Rate your experience with ${vendorName}`}
        </Card.Title>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Rating</Form.Label>
            <div className="d-flex align-items-center mb-2">
              {renderStarInput()}
              <span className="ms-2">{rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select rating'}</span>
            </div>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Comment (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this vendor..."
            />
          </Form.Group>
          
          <Button 
            variant="primary" 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  )
} 