import { useState } from 'react'
import { 
  Form, 
  Button, 
  Card, 
  Row, 
  Col, 
  Alert, 
  Spinner,
  Modal
} from 'react-bootstrap'

export default function CrossLeadForm({ onSubmitSuccess }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    pickupPincode: '',
    destinationPincode: '',
    moveSize: '',
    moveDate: '',
    vendorManaged: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/vendor/cross-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to submit cross lead')
      }

      const data = await response.json()
      setSuccess(true)
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        pickupPincode: '',
        destinationPincode: '',
        moveSize: '',
        moveDate: '',
        vendorManaged: false
      })
      setShowModal(false)
      
      // Call the success callback if provided
      if (typeof onSubmitSuccess === 'function') {
        onSubmitSuccess(data)
      }
    } catch (error) {
      console.error('Error submitting cross lead:', error)
      setError(error.message || 'Failed to submit cross lead. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button 
        variant="primary" 
        className="mb-4" 
        onClick={() => setShowModal(true)}
      >
        Submit Cross Lead
      </Button>

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(false)}>
          Cross lead submitted successfully! You've earned a 15% commission discount on your next order.
          {formData.vendorManaged && (
            <p className="mt-2 mb-0">
              You can manage this lead in the "My Cross Leads" tab.
            </p>
          )}
        </Alert>
      )}

      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Submit a Cross Lead</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-4">
            Submit a moving request on behalf of a customer. For each cross lead you submit, 
            you'll earn a 15% commission rate (instead of 20%) on your next order.
          </p>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Card className="mb-4">
              <Card.Header>Customer Information</Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Customer Name*</Form.Label>
                      <Form.Control
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Customer Email*</Form.Label>
                      <Form.Control
                        type="email"
                        name="customerEmail"
                        value={formData.customerEmail}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Customer Phone*</Form.Label>
                      <Form.Control
                        type="tel"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>Move Details</Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pickup Pincode*</Form.Label>
                      <Form.Control
                        type="text"
                        name="pickupPincode"
                        value={formData.pickupPincode}
                        onChange={handleChange}
                        required
                      />
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
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Move Size*</Form.Label>
                      <Form.Select
                        name="moveSize"
                        value={formData.moveSize}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Size</option>
                        <option value="1BHK">1 BHK</option>
                        <option value="2BHK">2 BHK</option>
                        <option value="3BHK">3 BHK</option>
                        <option value="4+BHK">4+ BHK</option>
                        <option value="Small Office">Small Office</option>
                        <option value="Medium Office">Medium Office</option>
                        <option value="Large Office">Large Office</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Move Date*</Form.Label>
                      <Form.Control
                        type="date"
                        name="moveDate"
                        value={formData.moveDate}
                        onChange={handleChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-0">
                  <Form.Check
                    type="checkbox"
                    id="vendorManaged"
                    name="vendorManaged"
                    checked={formData.vendorManaged}
                    onChange={handleChange}
                    label={
                      <span>
                        <strong>Manage this lead myself</strong> - I want to personally select from quotes and book the move
                        <p className="text-muted small mt-1 mb-0">
                          When checked, you'll be able to request quotes from other vendors and make the booking yourself using the "My Cross Leads" tab.
                        </p>
                      </span>
                    }
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-end mt-4">
              <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                    {' '}Submitting...
                  </>
                ) : 'Submit Cross Lead'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  )
} 