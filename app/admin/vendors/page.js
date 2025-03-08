'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Button, Form, Modal, Alert, Badge, InputGroup, Spinner, Row, Col } from 'react-bootstrap'
import AdminLayout from '../../components/AdminLayout'
import { FaSearch, FaEdit, FaTrash, FaUserPlus, FaPhone, FaWhatsapp, FaEnvelope, FaStore, FaMapMarkerAlt, FaStar, FaTimes, FaPlus } from 'react-icons/fa'

export default function VendorManagement() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [currentVendor, setCurrentVendor] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    serviceAreas: [],
    pricingTier: 'default',
    description: '',
    password: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [serviceArea, setServiceArea] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/vendors')
      if (!response.ok) {
        throw new Error(`Failed to fetch vendors: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setVendors(data)
    } catch (error) {
      console.error('Error fetching vendors:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid'
    if (!editMode && !formData.password) errors.password = 'Password is required'
    if (formData.password && formData.password.length < 6) errors.password = 'Password must be at least 6 characters'
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleAddServiceArea = () => {
    if (serviceArea.trim() && !formData.serviceAreas.includes(serviceArea.trim())) {
      setFormData(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, serviceArea.trim()]
      }))
      setServiceArea('')
    }
  }

  const handleRemoveServiceArea = (area) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter(a => a !== area)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      setActionLoading(true)
      const url = editMode 
        ? `/api/admin/vendors/${currentVendor.vendorId}` 
        : '/api/admin/vendors'
      
      const method = editMode ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save vendor')
      }

      // Refresh vendor list
      await fetchVendors()
      handleCloseModal()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = (vendor) => {
    setCurrentVendor(vendor)
    setFormData({
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone || '',
      whatsapp: vendor.whatsapp || '',
      serviceAreas: vendor.serviceAreas || [],
      pricingTier: vendor.pricingTier || 'default',
      description: vendor.description || '',
      password: ''
    })
    setFormErrors({})
    setEditMode(true)
    setShowModal(true)
  }

  const handleDelete = async (vendorId) => {
    if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete vendor')
      }

      // Refresh vendor list
      await fetchVendors()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddNew = () => {
    setCurrentVendor(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      serviceAreas: [],
      pricingTier: 'default',
      description: '',
      password: ''
    })
    setFormErrors({})
    setEditMode(false)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setError(null)
  }

  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.phone && vendor.phone.includes(searchTerm)) ||
    (vendor.serviceAreas && vendor.serviceAreas.some(area => 
      area.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  )

  const getPricingTierBadge = (tier) => {
    switch(tier) {
      case 'premium':
        return <Badge bg="success" className="px-3 py-2">Premium</Badge>
      case 'economy':
        return <Badge bg="warning" className="px-3 py-2">Economy</Badge>
      default:
        return <Badge bg="secondary" className="px-3 py-2">Standard</Badge>
    }
  }

  const getRatingStars = (rating, reviewCount) => {
    if (!rating) return <span className="text-muted">No ratings yet</span>;
    
    return (
      <div className="d-flex align-items-center">
        <div className="me-2">
          {[...Array(5)].map((_, i) => (
            <FaStar 
              key={i} 
              className={i < Math.round(rating) ? "text-warning" : "text-muted"} 
              style={{ marginRight: '2px' }}
            />
          ))}
        </div>
        <span>
          {rating.toFixed(1)} ({reviewCount || 0})
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading vendors...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Vendor Management</h2>
        <Button 
          variant="primary" 
          onClick={handleAddNew}
          disabled={actionLoading}
          className="d-flex align-items-center"
        >
          <FaUserPlus className="me-2" /> Add New Vendor
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3">
          <InputGroup>
            <InputGroup.Text className="bg-light border-end-0">
              <FaSearch className="text-muted" />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search vendors by name, email, phone or service area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-start-0 bg-light"
            />
          </InputGroup>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Vendor</th>
                  <th>Contact</th>
                  <th>Service Areas</th>
                  <th>Pricing Tier</th>
                  <th>Rating</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.length > 0 ? (
                  filteredVendors.map(vendor => (
                    <tr key={vendor.vendorId}>
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <div className="bg-light rounded-circle p-2 me-2">
                            <FaStore className="text-primary" />
                          </div>
                          <div>
                            <div className="fw-medium">{vendor.name}</div>
                            <div className="text-muted small">
                              <FaEnvelope className="me-1" /> {vendor.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="align-middle">
                        <div>
                          {vendor.phone && (
                            <div className="mb-1">
                              <FaPhone className="text-muted me-1" /> {vendor.phone}
                            </div>
                          )}
                          {vendor.whatsapp && (
                            <div>
                              <FaWhatsapp className="text-success me-1" /> {vendor.whatsapp}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="align-middle">
                        {vendor.serviceAreas && vendor.serviceAreas.length > 0 ? (
                          <div style={{ maxWidth: '200px' }}>
                            {vendor.serviceAreas.slice(0, 3).map((area, index) => (
                              <Badge 
                                key={index} 
                                bg="light" 
                                text="dark" 
                                className="me-1 mb-1"
                              >
                                <FaMapMarkerAlt className="text-danger me-1" />
                                {area}
                              </Badge>
                            ))}
                            {vendor.serviceAreas.length > 3 && (
                              <Badge bg="secondary">+{vendor.serviceAreas.length - 3} more</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">No service areas defined</span>
                        )}
                      </td>
                      <td className="align-middle">
                        {getPricingTierBadge(vendor.pricingTier)}
                      </td>
                      <td className="align-middle">
                        {getRatingStars(vendor.rating, vendor.reviewCount)}
                      </td>
                      <td className="align-middle text-end">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="me-2"
                          onClick={() => handleEdit(vendor)}
                          disabled={actionLoading}
                        >
                          <FaEdit /> Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDelete(vendor.vendorId)}
                          disabled={actionLoading}
                        >
                          <FaTrash /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      {searchTerm ? 'No vendors match your search criteria' : 'No vendors found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Add/Edit Vendor Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? (
              <span><FaEdit className="me-2" /> Edit Vendor</span>
            ) : (
              <span><FaUserPlus className="me-2" /> Add New Vendor</span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    isInvalid={!!formErrors.name}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    isInvalid={!!formErrors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaPhone /></InputGroup.Text>
                    <Form.Control
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>WhatsApp</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="text-success"><FaWhatsapp /></InputGroup.Text>
                    <Form.Control
                      type="text"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleInputChange}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Pricing Tier</Form.Label>
              <Form.Select
                name="pricingTier"
                value={formData.pricingTier}
                onChange={handleInputChange}
                className="form-select-lg"
              >
                <option value="economy">Economy</option>
                <option value="default">Standard</option>
                <option value="premium">Premium</option>
              </Form.Select>
              <Form.Text className="text-muted">
                This affects pricing calculations for this vendor's quotes.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter vendor description, specialties, or other important information"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Service Areas</Form.Label>
              <InputGroup className="mb-2">
                <Form.Control
                  type="text"
                  placeholder="Add service area (e.g., pincode, city)"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddServiceArea())}
                />
                <Button 
                  variant="outline-primary" 
                  onClick={handleAddServiceArea}
                >
                  <FaPlus /> Add
                </Button>
              </InputGroup>
              
              <div className="d-flex flex-wrap gap-2 mt-2">
                {formData.serviceAreas.length > 0 ? (
                  formData.serviceAreas.map((area, index) => (
                    <Badge 
                      key={index} 
                      bg="primary" 
                      className="p-2 d-flex align-items-center"
                    >
                      <FaMapMarkerAlt className="me-1" /> {area}
                      <Button 
                        variant="link" 
                        className="p-0 ms-2 text-white" 
                        onClick={() => handleRemoveServiceArea(area)}
                      >
                        <FaTimes />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <div className="text-muted">No service areas added yet</div>
                )}
              </div>
            </Form.Group>
            
            {!editMode && (
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  isInvalid={!!formErrors.password}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.password}
                </Form.Control.Feedback>
              </Form.Group>
            )}
            
            {editMode && (
              <Form.Group className="mb-3">
                <Form.Label>Password <span className="text-muted">(Leave blank to keep current password)</span></Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  isInvalid={!!formErrors.password}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.password}
                </Form.Control.Feedback>
              </Form.Group>
            )}
            
            <div className="d-flex justify-content-end mt-4">
              <Button variant="secondary" className="me-2" onClick={handleCloseModal} disabled={actionLoading}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  'Save Vendor'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </AdminLayout>
  )
} 