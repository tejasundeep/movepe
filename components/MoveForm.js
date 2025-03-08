'use client'

import { useState } from 'react'
import { Form, Button, Alert } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'

export default function MoveForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    pickupPincode: '',
    destinationPincode: '',
    moveSize: '',
    moveDate: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState({
    pickup: [],
    destination: []
  })

  const handleChange = async (e) => {
    const { name, value } = e.target
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
      setError('Please sign in to create a move request')
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
          ...formData,
          userEmail: session.user.email,
          status: 'Initiated',
          createdAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const data = await response.json()
      router.push(`/order/${data.orderId}`)
    } catch (err) {
      setError(err.message || 'Failed to create order. Please try again.')
      console.error('Error creating order:', err)
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
    // Navigate to detailed quote page with moving tab
    window.location.href = `/quote?from=${formData.pickupPincode}&to=${formData.destinationPincode}&size=${formData.moveSize}&tab=moving`;
  };

  // Calculate minimum date (today)
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <Form onSubmit={handleSubmit} className="position-relative">
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Form.Group className="mb-3">
        <Form.Label>Pickup Pincode</Form.Label>
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

      <Form.Group className="mb-3">
        <Form.Label>Destination Pincode</Form.Label>
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

      <Form.Group className="mb-3">
        <Form.Label>Move Size</Form.Label>
        <Form.Select
          name="moveSize"
          value={formData.moveSize}
          onChange={handleChange}
          required
          disabled={loading}
        >
          <option value="">Select move size</option>
          <option value="1BHK">1 BHK</option>
          <option value="2BHK">2 BHK</option>
          <option value="3BHK">3 BHK</option>
          <option value="4BHK+">4 BHK+</option>
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Preferred Move Date</Form.Label>
        <Form.Control
          type="date"
          name="moveDate"
          value={formData.moveDate}
          onChange={handleChange}
          min={minDate}
          required
          disabled={loading}
        />
      </Form.Group>

      <Button 
        variant="outline-primary" 
        className="w-100 mb-3"
        onClick={handleGetQuote}
        disabled={!formData.pickupPincode || !formData.destinationPincode || !formData.moveSize}
      >
        Get Detailed Quote
      </Button>

      <Button 
        variant="primary" 
        type="submit" 
        className="w-100"
        disabled={loading}
      >
        {loading ? 'Creating Move Request...' : 'Submit Move Request'}
      </Button>

      {!session && (
        <Alert variant="info" className="mt-3">
          Please <Button variant="link" className="p-0" onClick={() => signIn()}>sign in</Button> to create a move request.
        </Alert>
      )}
    </Form>
  )
} 