'use client'

import { useState } from 'react'
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RiderRegister() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    whatsapp: '',
    vehicleType: '',
    vehicleModel: '',
    vehicleYear: '',
    licensePlate: '',
    drivingLicense: '',
    serviceAreas: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate form
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (!formData.vehicleType || !formData.vehicleModel || !formData.licensePlate || !formData.drivingLicense) {
      setError('Please fill in all required vehicle information')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register/rider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          role: 'rider',
          vehicleDetails: {
            type: formData.vehicleType,
            model: formData.vehicleModel,
            year: formData.vehicleYear,
            licensePlate: formData.licensePlate,
            drivingLicense: formData.drivingLicense
          }
        })
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Registration error:', data.error)
        throw new Error(data.error || 'Failed to register')
      }

      // Redirect to login page with success message
      router.push('/auth/signin?registered=true&message=Your rider account has been created. Please sign in to continue.')
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Failed to register. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <div className="text-center mb-4">
            <h2>Become a Rider</h2>
            <p>Join Move Management System as a Delivery Partner</p>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <h4 className="mb-3">Personal Information</h4>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>WhatsApp Number (Optional)</Form.Label>
              <Form.Control
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="Same as phone number if applicable"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
              />
              <Form.Text className="text-muted">
                Must be at least 8 characters long
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <h4 className="mt-4 mb-3">Vehicle Information</h4>
            <Form.Group className="mb-3">
              <Form.Label>Vehicle Type</Form.Label>
              <Form.Select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                required
              >
                <option value="">Select Vehicle Type</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="scooter">Scooter</option>
                <option value="bicycle">Bicycle</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Vehicle Model</Form.Label>
              <Form.Control
                type="text"
                name="vehicleModel"
                value={formData.vehicleModel}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Vehicle Year</Form.Label>
              <Form.Control
                type="number"
                name="vehicleYear"
                value={formData.vehicleYear}
                onChange={handleChange}
                placeholder="e.g. 2020"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>License Plate Number</Form.Label>
              <Form.Control
                type="text"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Driving License Number</Form.Label>
              <Form.Control
                type="text"
                name="drivingLicense"
                value={formData.drivingLicense}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Service Areas</Form.Label>
              <Form.Control
                type="text"
                name="serviceAreas"
                value={formData.serviceAreas}
                onChange={handleChange}
                placeholder="e.g. Downtown, North Side, South Side"
                required
              />
              <Form.Text className="text-muted">
                Enter the areas where you can provide delivery services, separated by commas
              </Form.Text>
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              className="w-100 mb-3"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register as Rider'}
            </Button>

            <div className="text-center">
              <p>
                Already have an account?{' '}
                <Link href="/auth/signin">Sign In</Link>
              </p>
              <p>
                Want to register as a regular user?{' '}
                <Link href="/auth/register">Register as User</Link>
              </p>
              <p>
                Want to register as a vendor?{' '}
                <Link href="/auth/register/vendor">Register as Vendor</Link>
              </p>
            </div>
          </Form>
        </Col>
      </Row>
    </Container>
  )
} 