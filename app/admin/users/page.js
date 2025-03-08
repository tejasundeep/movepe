'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Button, Form, Modal, Alert, Badge, InputGroup, Spinner } from 'react-bootstrap'
import AdminLayout from '../../components/AdminLayout'
import { FaSearch, FaEdit, FaTrash, FaUserPlus, FaPhone, FaWhatsapp, FaEnvelope, FaUser } from 'react-icons/fa'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    role: 'user',
    password: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      // Filter out admin users
      const filteredUsers = data.filter(user => user.role === 'user')
      setUsers(filteredUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      setActionLoading(true)
      const url = editMode 
        ? `/api/admin/users/${currentUser.id}` 
        : '/api/admin/users'
      
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
        throw new Error(errorData.error || 'Failed to save user')
      }

      // Refresh user list
      await fetchUsers()
      handleCloseModal()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleEdit = (user) => {
    setCurrentUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      whatsapp: user.whatsapp || '',
      role: user.role,
      password: ''
    })
    setFormErrors({})
    setEditMode(true)
    setShowModal(true)
  }

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete user')
      }

      // Refresh user list
      await fetchUsers()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddNew = () => {
    setCurrentUser(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      role: 'user',
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

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone && user.phone.includes(searchTerm))
  )

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading users...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>User Management</h2>
        <Button 
          variant="primary" 
          onClick={handleAddNew}
          disabled={actionLoading}
          className="d-flex align-items-center"
        >
          <FaUserPlus className="me-2" /> Add New User
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
              placeholder="Search users by name, email or phone..."
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>WhatsApp</th>
                  <th>Created At</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <div className="bg-light rounded-circle p-2 me-2">
                            <FaUser className="text-primary" />
                          </div>
                          <span className="fw-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <FaEnvelope className="text-muted me-2" />
                          {user.email}
                        </div>
                      </td>
                      <td className="align-middle">
                        {user.phone ? (
                          <div className="d-flex align-items-center">
                            <FaPhone className="text-muted me-2" />
                            {user.phone}
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="align-middle">
                        {user.whatsapp ? (
                          <div className="d-flex align-items-center">
                            <FaWhatsapp className="text-success me-2" />
                            {user.whatsapp}
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="align-middle">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="align-middle text-end">
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          className="me-2"
                          onClick={() => handleEdit(user)}
                          disabled={actionLoading}
                        >
                          <FaEdit /> Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDelete(user.id)}
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
                      {searchTerm ? 'No users match your search criteria' : 'No users found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Add/Edit User Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? (
              <span><FaEdit className="me-2" /> Edit User</span>
            ) : (
              <span><FaUserPlus className="me-2" /> Add New User</span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
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
            <Form.Group className="mb-3">
              <Form.Label>Password {editMode && <span className="text-muted">(Leave blank to keep current password)</span>}</Form.Label>
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
            <div className="d-flex justify-content-end">
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
                  'Save'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </AdminLayout>
  )
} 