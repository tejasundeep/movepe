'use client'

import { useState } from 'react'
import { Form, Button, Alert, Row, Col } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'

export default function ParcelDeliveryForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    pickupPincode: '',
    destinationPincode: '',
    pickupAddress: '',
    deliveryAddress: '',
    packageType: 'documents', // documents, electronics, clothing, food, other
    recipientName: '',
    recipientPhone: '',
    deliveryInstructions: ''
    // All other fields removed
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState({
    pickup: [],
    destination: []
  })

  const handleChange = async (e) => {
    const { name, value } = e.target
    
    // Handle regular inputs
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name.includes('Pincode') && value.length >= 3) {
      try {
        const response = await fetch(`/api/pincodes/search?query=${encodeURIComponent(value)}`)
        if (!response.ok) throw new Error('Failed to fetch suggestions')
        const data = await response.json()
        setSuggestions(prev => ({
          ...prev,
          [name.replace('Pincode', '')]: data
        }))
      } catch (err) {
        console.error('Error fetching pincode suggestions:', err)
      }
    } else {
      // Clear suggestions if input is less than 3 characters
      setSuggestions(prev => ({
        ...prev,
        [name.replace('Pincode', '')]: []
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!session) {
      setError('Please sign in to create a parcel delivery request')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickupPincode: formData.pickupPincode,
          destinationPincode: formData.destinationPincode,
          pickupAddress: formData.pickupAddress,
          deliveryAddress: formData.deliveryAddress,
          packageType: formData.packageType,
          recipientName: formData.recipientName,
          recipientPhone: formData.recipientPhone,
          deliveryInstructions: formData.deliveryInstructions,
          userEmail: session.user.email,
          status: 'Initiated',
          orderType: 'parcel',
          createdAt: new Date().toISOString(),
          // Add default values for required fields in the backend
          parcelWeight: 1,
          parcelDimensions: {
            length: 30,
            width: 20,
            height: 15
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const data = await response.json()
      router.push(`/order/${data.orderId}`)
    } catch (err) {
      setError(err.message || 'Failed to create parcel delivery order. Please try again.')
      console.error('Error creating parcel delivery order:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (type, pincode) => {
    setFormData(prev => ({
      ...prev,
      [`${type}Pincode`]: pincode
    }))
    setSuggestions(prev => ({
      ...prev,
      [type]: []
    }))
  }

  const handleGetQuote = () => {
    // Navigate to detailed quote page with parcel tab
    window.location.href = `/quote?from=${formData.pickupPincode}&to=${formData.destinationPincode}&tab=parcel`;
  };

  return (
    <Form onSubmit={handleSubmit} className="position-relative">
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Pickup Pincode*</Form.Label>
            <Form.Control
              type="text"
              name="pickupPincode"
              value={formData.pickupPincode}
              onChange={handleChange}
              placeholder="Enter pickup pincode"
              required
              disabled={loading}
            />
            {suggestions.pickup.length > 0 && (
              <div className="suggestions">
                {suggestions.pickup.map(pin => (
                  <div
                    key={pin.pincode}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick('pickup', pin.pincode)}
                  >
                    {pin.city}, {pin.state} ({pin.pincode})
                  </div>
                ))}
              </div>
            )}
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Destination Pincode*</Form.Label>
            <Form.Control
              type="text"
              name="destinationPincode"
              value={formData.destinationPincode}
              onChange={handleChange}
              placeholder="Enter destination pincode"
              required
              disabled={loading}
            />
            {suggestions.destination.length > 0 && (
              <div className="suggestions">
                {suggestions.destination.map(pin => (
                  <div
                    key={pin.pincode}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick('destination', pin.pincode)}
                  >
                    {pin.city}, {pin.state} ({pin.pincode})
                  </div>
                ))}
              </div>
            )}
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Pickup Address</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="pickupAddress"
              value={formData.pickupAddress}
              onChange={handleChange}
              placeholder="Enter complete pickup address"
              disabled={loading}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Delivery Address</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleChange}
              placeholder="Enter complete delivery address"
              disabled={loading}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Package Type</Form.Label>
            <Form.Select
              name="packageType"
              value={formData.packageType}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="documents">Documents</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="food">Food</option>
              <option value="medicine">Medicine</option>
              <option value="other">Other</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Recipient Name*</Form.Label>
            <Form.Control
              type="text"
              name="recipientName"
              value={formData.recipientName}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Recipient Phone*</Form.Label>
            <Form.Control
              type="text"
              name="recipientPhone"
              value={formData.recipientPhone}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Label>Delivery Instructions</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          name="deliveryInstructions"
          value={formData.deliveryInstructions}
          onChange={handleChange}
          placeholder="Any special instructions for delivery"
          disabled={loading}
        />
      </Form.Group>

      <Button 
        variant="outline-primary" 
        className="w-100 mb-3"
        onClick={handleGetQuote}
        disabled={!formData.pickupPincode || !formData.destinationPincode}
      >
        Get Detailed Quote
      </Button>

      <Button 
        variant="primary" 
        type="submit" 
        className="w-100"
        disabled={loading}
      >
        {loading ? 'Creating Delivery Request...' : 'Submit Delivery Request'}
      </Button>

      {!session && (
        <Alert variant="info" className="mt-3">
          Please <Button variant="link" className="p-0" onClick={() => signIn()}>sign in</Button> to create a delivery request.
        </Alert>
      )}
    </Form>
  )
} 