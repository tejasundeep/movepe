'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Button, Form, InputGroup, Spinner, Alert, Badge, Dropdown, Tabs, Tab } from 'react-bootstrap'
import AdminLayout from '../../components/AdminLayout'
import { 
  FaSearch, FaTrash, FaFilter, FaBell, FaEnvelope, FaMobile, 
  FaWhatsapp, FaCheck, FaExclamationTriangle, FaUser, FaStore, 
  FaBoxes, FaCalendarAlt, FaEye, FaHistory
} from 'react-icons/fa'

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('notifications')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications()
    } else if (activeTab === 'templates') {
      fetchTemplates()
    }
  }, [activeTab])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/notifications')
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setNotifications(data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/notifications/templates')
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      console.error('Error fetching templates:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}/resend`, {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error(`Failed to resend notification: ${response.status} ${response.statusText}`)
      }
      
      // Refresh notifications
      fetchNotifications()
    } catch (error) {
      console.error('Error resending notification:', error)
      setError(error.message)
    }
  }

  const handleDeleteNotification = async (notificationId) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error(`Failed to delete notification: ${response.status} ${response.statusText}`)
      }
      
      // Refresh notifications
      fetchNotifications()
    } catch (error) {
      console.error('Error deleting notification:', error)
      setError(error.message)
    }
  }

  const handleViewTemplate = (template) => {
    setSelectedTemplate(template)
    setShowTemplatePreview(true)
  }

  const getNotificationTypeBadge = (type) => {
    switch(type) {
      case 'email':
        return <Badge bg="primary"><FaEnvelope className="me-1" /> Email</Badge>
      case 'sms':
        return <Badge bg="info"><FaMobile className="me-1" /> SMS</Badge>
      case 'whatsapp':
        return <Badge bg="success"><FaWhatsapp className="me-1" /> WhatsApp</Badge>
      default:
        return <Badge bg="secondary">{type}</Badge>
    }
  }

  const getNotificationStatusBadge = (status) => {
    switch(status) {
      case 'sent':
        return <Badge bg="success"><FaCheck className="me-1" /> Sent</Badge>
      case 'failed':
        return <Badge bg="danger"><FaExclamationTriangle className="me-1" /> Failed</Badge>
      case 'pending':
        return <Badge bg="warning">Pending</Badge>
      default:
        return <Badge bg="secondary">{status}</Badge>
    }
  }

  const getRecipientTypeBadge = (recipientType) => {
    switch(recipientType) {
      case 'user':
        return <Badge bg="primary"><FaUser className="me-1" /> User</Badge>
      case 'vendor':
        return <Badge bg="success"><FaStore className="me-1" /> Vendor</Badge>
      case 'admin':
        return <Badge bg="danger">Admin</Badge>
      default:
        return <Badge bg="secondary">{recipientType}</Badge>
    }
  }

  const getEventTypeBadge = (eventType) => {
    switch(eventType) {
      case 'order_created':
        return <Badge bg="primary"><FaBoxes className="me-1" /> Order Created</Badge>
      case 'quote_requested':
        return <Badge bg="info">Quote Requested</Badge>
      case 'quote_accepted':
        return <Badge bg="success">Quote Accepted</Badge>
      case 'payment_received':
        return <Badge bg="warning">Payment Received</Badge>
      case 'order_completed':
        return <Badge bg="success">Order Completed</Badge>
      default:
        return <Badge bg="secondary">{eventType}</Badge>
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    // Apply type filter
    if (typeFilter !== 'all' && notification.type !== typeFilter) {
      return false
    }
    
    // Apply status filter
    if (statusFilter !== 'all' && notification.status !== statusFilter) {
      return false
    }
    
    // Apply search filter
    return (
      notification.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.eventType?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading {activeTab}...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Notification Center</h2>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab 
          eventKey="notifications" 
          title={
            <span>
              <FaBell className="me-2" /> Notification History
            </span>
          }
        >
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <InputGroup style={{ maxWidth: '500px' }}>
                <InputGroup.Text className="bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-start-0 bg-light"
                />
              </InputGroup>
              <div className="d-flex">
                <Dropdown className="me-2">
                  <Dropdown.Toggle variant="outline-secondary" id="type-filter">
                    <FaFilter className="me-2" /> 
                    {typeFilter === 'all' ? 'All Types' : typeFilter}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => setTypeFilter('all')} active={typeFilter === 'all'}>
                      All Types
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={() => setTypeFilter('email')} active={typeFilter === 'email'}>
                      <FaEnvelope className="me-2" /> Email
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => setTypeFilter('sms')} active={typeFilter === 'sms'}>
                      <FaMobile className="me-2" /> SMS
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => setTypeFilter('whatsapp')} active={typeFilter === 'whatsapp'}>
                      <FaWhatsapp className="me-2" /> WhatsApp
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" id="status-filter">
                    <FaFilter className="me-2" /> 
                    {statusFilter === 'all' ? 'All Statuses' : statusFilter}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => setStatusFilter('all')} active={statusFilter === 'all'}>
                      All Statuses
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={() => setStatusFilter('sent')} active={statusFilter === 'sent'}>
                      <FaCheck className="me-2" /> Sent
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => setStatusFilter('failed')} active={statusFilter === 'failed'}>
                      <FaExclamationTriangle className="me-2" /> Failed
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => setStatusFilter('pending')} active={statusFilter === 'pending'}>
                      Pending
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Type</th>
                      <th>Recipient</th>
                      <th>Subject/Message</th>
                      <th>Event</th>
                      <th>Status</th>
                      <th>Sent At</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map(notification => (
                        <tr key={notification.id}>
                          <td className="align-middle">
                            {getNotificationTypeBadge(notification.type)}
                          </td>
                          <td className="align-middle">
                            <div className="d-flex flex-column">
                              <span>{notification.recipient}</span>
                              <small className="text-muted">
                                {getRecipientTypeBadge(notification.recipientType)}
                              </small>
                            </div>
                          </td>
                          <td className="align-middle">
                            <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {notification.subject || notification.message}
                            </div>
                          </td>
                          <td className="align-middle">
                            {getEventTypeBadge(notification.eventType)}
                          </td>
                          <td className="align-middle">
                            {getNotificationStatusBadge(notification.status)}
                          </td>
                          <td className="align-middle">
                            <div className="d-flex align-items-center">
                              <FaCalendarAlt className="text-muted me-2" />
                              {new Date(notification.sentAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="align-middle text-end">
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              className="me-2"
                              onClick={() => handleResendNotification(notification.id)}
                              disabled={notification.status === 'pending'}
                            >
                              <FaEnvelope /> Resend
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleDeleteNotification(notification.id)}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? 
                            'No notifications match your search criteria' : 
                            'No notifications found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Tab>
        <Tab 
          eventKey="templates" 
          title={
            <span>
              <FaEnvelope className="me-2" /> Notification Templates
            </span>
          }
        >
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3">
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search templates..."
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
                      <th>Template Name</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Last Updated</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTemplates.length > 0 ? (
                      filteredTemplates.map(template => (
                        <tr key={template.id}>
                          <td className="align-middle fw-medium">{template.name}</td>
                          <td className="align-middle">
                            {getNotificationTypeBadge(template.type)}
                          </td>
                          <td className="align-middle">
                            <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {template.description}
                            </div>
                          </td>
                          <td className="align-middle">
                            <div className="d-flex align-items-center">
                              <FaHistory className="text-muted me-2" />
                              {new Date(template.updatedAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="align-middle text-end">
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              onClick={() => handleViewTemplate(template)}
                            >
                              <FaEye /> View
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          {searchTerm ? 
                            'No templates match your search criteria' : 
                            'No templates found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {showTemplatePreview && selectedTemplate && (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Template Preview: {selectedTemplate.name}</h5>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setShowTemplatePreview(false)}
                >
                  Close
                </Button>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>Type:</strong> {selectedTemplate.type}
                </div>
                {selectedTemplate.subject && (
                  <div className="mb-3">
                    <strong>Subject:</strong> {selectedTemplate.subject}
                  </div>
                )}
                <div className="mb-3">
                  <strong>Content:</strong>
                  <div className="border rounded p-3 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {selectedTemplate.content}
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Variables:</strong>
                  <div className="mt-2">
                    {selectedTemplate.variables?.map(variable => (
                      <Badge key={variable} bg="secondary" className="me-2 mb-2">
                        {variable}
                      </Badge>
                    )) || 'No variables defined'}
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}
        </Tab>
      </Tabs>
    </AdminLayout>
  )
} 