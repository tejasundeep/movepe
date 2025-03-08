'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Badge, Button, Spinner, Alert, Table, Form } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import AdminLayout from '../../../components/AdminLayout'
import { 
  FaArrowLeft, FaUser, FaMapMarkerAlt, FaCalendarAlt, FaTruck, 
  FaMoneyBillWave, FaExclamationTriangle, FaCheck, FaSpinner, 
  FaEdit, FaSave, FaTrash, FaStore
} from 'react-icons/fa'

export default function OrderDetailPage({ params }) {
  const { orderId } = params
  const router = useRouter()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editedOrder, setEditedOrder] = useState(null)

  useEffect(() => {
    fetchOrderDetails()
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/orders/${orderId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setOrder(data)
      setEditedOrder(data)
    } catch (error) {
      console.error('Error fetching order details:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setEditedOrder(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveChanges = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedOrder)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update order')
      }

      const updatedOrder = await response.json()
      setOrder(updatedOrder)
      setEditing(false)
      
    } catch (error) {
      console.error('Error updating order:', error)
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOrder = async () => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete order')
      }

      // Redirect back to orders list
      router.push('/admin/orders')
    } catch (error) {
      console.error('Error deleting order:', error)
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Initiated':
        return <Badge bg="info"><FaSpinner className="me-1" /> Initiated</Badge>
      case 'QuoteRequested':
        return <Badge bg="warning"><FaExclamationTriangle className="me-1" /> Quote Requested</Badge>
      case 'QuoteAccepted':
        return <Badge bg="primary"><FaCheck className="me-1" /> Quote Accepted</Badge>
      case 'InProgress':
        return <Badge bg="secondary"><FaTruck className="me-1" /> In Progress</Badge>
      case 'Completed':
        return <Badge bg="success"><FaCheck className="me-1" /> Completed</Badge>
      case 'Paid':
        return <Badge bg="success"><FaMoneyBillWave className="me-1" /> Paid</Badge>
      default:
        return <Badge bg="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading order details...</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="danger">
          <Alert.Heading>Error Loading Order</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-between">
            <Button variant="outline-danger" onClick={() => router.push('/admin/orders')}>
              <FaArrowLeft className="me-2" /> Back to Orders
            </Button>
            <Button variant="primary" onClick={fetchOrderDetails}>
              Try Again
            </Button>
          </div>
        </Alert>
      </AdminLayout>
    )
  }

  if (!order) {
    return (
      <AdminLayout>
        <Alert variant="warning">
          <Alert.Heading>Order Not Found</Alert.Heading>
          <p>The order you are looking for does not exist or has been deleted.</p>
          <hr />
          <Button variant="outline-primary" onClick={() => router.push('/admin/orders')}>
            <FaArrowLeft className="me-2" /> Back to Orders
          </Button>
        </Alert>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Button 
            variant="outline-secondary" 
            className="me-3"
            onClick={() => router.push('/admin/orders')}
          >
            <FaArrowLeft />
          </Button>
          <h2 className="mb-0">Order Details</h2>
        </div>
        <div>
          {editing ? (
            <>
              <Button 
                variant="outline-secondary" 
                className="me-2"
                onClick={() => {
                  setEditing(false)
                  setEditedOrder(order)
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                variant="success" 
                onClick={handleSaveChanges}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave className="me-2" /> Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="primary" 
                className="me-2"
                onClick={() => setEditing(true)}
              >
                <FaEdit className="me-2" /> Edit
              </Button>
              <Button 
                variant="danger"
                onClick={handleDeleteOrder}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash className="me-2" /> Delete
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={8}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Order Information</h5>
                <div>
                  Order ID: <span className="fw-bold">{order.orderId}</span>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="mb-4">
                    <div className="text-muted mb-2">Status</div>
                    {editing ? (
                      <Form.Select
                        value={editedOrder.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                      >
                        <option value="Initiated">Initiated</option>
                        <option value="QuoteRequested">Quote Requested</option>
                        <option value="QuoteAccepted">Quote Accepted</option>
                        <option value="InProgress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Paid">Paid</option>
                        <option value="Cancelled">Cancelled</option>
                      </Form.Select>
                    ) : (
                      <div>{getStatusBadge(order.status)}</div>
                    )}
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-4">
                    <div className="text-muted mb-2">Created At</div>
                    <div className="d-flex align-items-center">
                      <FaCalendarAlt className="text-muted me-2" />
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <div className="mb-4">
                    <div className="text-muted mb-2">Customer</div>
                    <div className="d-flex align-items-center">
                      <FaUser className="text-muted me-2" />
                      {editing ? (
                        <Form.Control
                          type="email"
                          value={editedOrder.userEmail}
                          onChange={(e) => handleInputChange('userEmail', e.target.value)}
                        />
                      ) : (
                        order.userEmail
                      )}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-4">
                    <div className="text-muted mb-2">Move Size</div>
                    {editing ? (
                      <Form.Select
                        value={editedOrder.moveSize}
                        onChange={(e) => handleInputChange('moveSize', e.target.value)}
                      >
                        <option value="1BHK">1 BHK</option>
                        <option value="2BHK">2 BHK</option>
                        <option value="3BHK">3 BHK</option>
                        <option value="4BHK+">4 BHK+</option>
                      </Form.Select>
                    ) : (
                      <div>{order.moveSize}</div>
                    )}
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <div className="mb-4">
                    <div className="text-muted mb-2">Pickup Location</div>
                    <div className="d-flex align-items-center">
                      <FaMapMarkerAlt className="text-danger me-2" />
                      {editing ? (
                        <Form.Control
                          type="text"
                          value={editedOrder.pickupPincode}
                          onChange={(e) => handleInputChange('pickupPincode', e.target.value)}
                        />
                      ) : (
                        order.pickupPincode
                      )}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-4">
                    <div className="text-muted mb-2">Destination Location</div>
                    <div className="d-flex align-items-center">
                      <FaMapMarkerAlt className="text-success me-2" />
                      {editing ? (
                        <Form.Control
                          type="text"
                          value={editedOrder.destinationPincode}
                          onChange={(e) => handleInputChange('destinationPincode', e.target.value)}
                        />
                      ) : (
                        order.destinationPincode
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <div className="mb-4">
                    <div className="text-muted mb-2">Preferred Move Date</div>
                    <div className="d-flex align-items-center">
                      <FaCalendarAlt className="text-muted me-2" />
                      {editing ? (
                        <Form.Control
                          type="date"
                          value={editedOrder.moveDate ? editedOrder.moveDate.split('T')[0] : ''}
                          onChange={(e) => handleInputChange('moveDate', e.target.value)}
                        />
                      ) : (
                        order.moveDate ? new Date(order.moveDate).toLocaleDateString() : 'Not specified'
                      )}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-4">
                    <div className="text-muted mb-2">Price Estimate</div>
                    <div className="d-flex align-items-center">
                      <FaMoneyBillWave className="text-success me-2" />
                      {editing ? (
                        <Form.Control
                          type="number"
                          value={editedOrder.priceEstimate?.estimatedCost || ''}
                          onChange={(e) => handleInputChange('priceEstimate', { 
                            ...editedOrder.priceEstimate,
                            estimatedCost: parseFloat(e.target.value) 
                          })}
                        />
                      ) : (
                        order.priceEstimate?.estimatedCost ? 
                          `₹${order.priceEstimate.estimatedCost.toLocaleString()}` : 
                          'Not available'
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          {order.selectedVendorId && (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0">Selected Vendor</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-light rounded-circle p-2 me-2">
                    <FaStore className="text-primary" />
                  </div>
                  <div>
                    <div className="fw-bold">{order.selectedVendorName || 'Vendor Name'}</div>
                    <div className="small text-muted">ID: {order.selectedVendorId}</div>
                  </div>
                </div>
                {order.quotes && order.quotes.length > 0 && order.selectedVendorId && (
                  <div>
                    <div className="text-muted mb-2">Quote Amount</div>
                    <div className="fw-bold text-success">
                      ₹{order.quotes.find(q => q.vendorId === order.selectedVendorId)?.amount.toLocaleString() || 'N/A'}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">Payment Information</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="text-muted mb-2">Payment Status</div>
                <div>
                  {order.status === 'Paid' ? (
                    <Badge bg="success"><FaMoneyBillWave className="me-1" /> Paid</Badge>
                  ) : (
                    <Badge bg="warning"><FaExclamationTriangle className="me-1" /> Pending</Badge>
                  )}
                </div>
              </div>
              {order.paymentId && (
                <div className="mb-3">
                  <div className="text-muted mb-2">Payment ID</div>
                  <div>{order.paymentId}</div>
                </div>
              )}
              {order.paymentAmount && (
                <div className="mb-3">
                  <div className="text-muted mb-2">Amount Paid</div>
                  <div className="fw-bold text-success">₹{order.paymentAmount.toLocaleString()}</div>
                </div>
              )}
              {order.paidAt && (
                <div className="mb-3">
                  <div className="text-muted mb-2">Payment Date</div>
                  <div>{new Date(order.paidAt).toLocaleString()}</div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {order.quotes && order.quotes.length > 0 && (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3">
            <h5 className="mb-0">Vendor Quotes</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table hover responsive className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {order.quotes.map((quote, index) => (
                  <tr key={index} className={quote.vendorId === order.selectedVendorId ? 'table-primary' : ''}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="bg-light rounded-circle p-2 me-2">
                          <FaStore className="text-primary" />
                        </div>
                        <div>
                          <div>{quote.vendorName || `Vendor ${index + 1}`}</div>
                          <div className="small text-muted">{quote.vendorId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="fw-bold">₹{quote.amount.toLocaleString()}</td>
                    <td>
                      {quote.vendorId === order.selectedVendorId ? (
                        <Badge bg="success">Selected</Badge>
                      ) : (
                        <Badge bg="secondary">Pending</Badge>
                      )}
                    </td>
                    <td>{new Date(quote.submittedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </AdminLayout>
  )
} 