'use client'

import { useState } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { useSession } from 'next-auth/react'

export default function VendorResponseForm({ reviewId, orderId, vendorId, onResponseSubmitted }) {
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { data: session } = useSession()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!responseText.trim()) {
      setError('Please enter a response')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/reviews/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          orderId,
          vendorId,
          responseText
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit response')
      }

      const data = await response.json()
      setSuccess(true)
      setResponseText('')
      
      if (onResponseSubmitted) {
        onResponseSubmitted(data)
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting your response')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="info">
            Please sign in to respond to this review.
          </Alert>
        </Card.Body>
      </Card>
    )
  }

  if (success) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="success">
            <Alert.Heading>Response Submitted</Alert.Heading>
            <p>Your response has been successfully submitted. The customer will be notified.</p>
            <Button 
              variant="outline-success" 
              size="sm" 
              onClick={() => setSuccess(false)}
            >
              Write Another Response
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card>
      <Card.Body>
        <Card.Title>Respond to Customer Review</Card.Title>
        
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Your Response</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Thank the customer for their feedback or address their concerns..."
            />
            <Form.Text className="text-muted">
              Your response will be visible to all customers viewing your reviews.
            </Form.Text>
          </Form.Group>
          
          <Button 
            variant="primary" 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Response'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  )
} 