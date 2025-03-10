'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Button, Form, InputGroup, Spinner, Alert, Badge, Dropdown, Tabs, Tab, Pagination } from 'react-bootstrap'
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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0
  })

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications()
    } else if (activeTab === 'templates') {
      fetchTemplates()
    }
  }, [activeTab, typeFilter, statusFilter, pagination.page])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      })
      
      const response = await fetch(`/api/admin/notifications?${queryParams}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setNotifications(data.notifications)
      setPagination(data.pagination)
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

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const handleTypeFilter = (type) => {
    setTypeFilter(type)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const getNotificationTypeBadge = (type) => {
    const types = {
      order: { icon: <FaBoxes className="me-1" />, color: 'primary' },
      payment: { icon: <FaCheck className="me-1" />, color: 'success' },
      quote: { icon: <FaCalendarAlt className="me-1" />, color: 'info' },
      review: { icon: <FaStore className="me-1" />, color: 'warning' },
      system: { icon: <FaBell className="me-1" />, color: 'secondary' },
      alert: { icon: <FaExclamationTriangle className="me-1" />, color: 'danger' }
    }

    const { icon, color } = types[type.toLowerCase()] || types.system

    return (
      <Badge bg={color} className="d-inline-flex align-items-center">
        {icon} {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
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
      <div className="container-fluid py-4">
        <Card className="shadow-sm">
          <Card.Header className="bg-white py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Notification Center</h5>
              <div className="d-flex gap-2">
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    <FaFilter className="me-2" />
                    Type: {typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleTypeFilter('all')}>All Types</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleTypeFilter('order')}>Order</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleTypeFilter('payment')}>Payment</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleTypeFilter('quote')}>Quote</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleTypeFilter('review')}>Review</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleTypeFilter('system')}>System</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleTypeFilter('alert')}>Alert</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                <Dropdown>
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    <FaFilter className="me-2" />
                    Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleStatusFilter('all')}>All Status</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleStatusFilter('read')}>Read</Dropdown.Item>
                    <Dropdown.Item onClick={() => handleStatusFilter('unread')}>Unread</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <i className="bi bi-exclamation-circle text-danger"></i>
                <p className="text-muted mt-2 mb-0">{error}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4">
                <i className="bi bi-bell text-muted" style={{ fontSize: '1.5rem' }}></i>
                <p className="text-muted mt-2 mb-0">No notifications found</p>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Type</th>
                        <th>Title</th>
                        <th>Message</th>
                        <th>User</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notifications.map(notification => (
                        <tr key={notification.id}>
                          <td className="align-middle">
                            {getNotificationTypeBadge(notification.type)}
                          </td>
                          <td className="align-middle">
                            <div style={{ maxWidth: '200px' }} className="text-truncate">
                              {notification.title}
                            </div>
                          </td>
                          <td className="align-middle">
                            <div style={{ maxWidth: '300px' }} className="text-truncate">
                              {notification.message}
                            </div>
                          </td>
                          <td className="align-middle">
                            <div className="d-flex align-items-center">
                              <div className="ms-2">
                                <div className="fw-bold">{notification.userName}</div>
                                <div className="small text-muted">{notification.userEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="align-middle">
                            <Badge bg={notification.isRead ? 'success' : 'warning'}>
                              {notification.isRead ? 'Read' : 'Unread'}
                            </Badge>
                          </td>
                          <td className="align-middle">
                            {new Date(notification.createdAt).toLocaleString()}
                          </td>
                          <td className="align-middle text-end">
                            <Button
                              variant="link"
                              className="text-danger p-0 me-3"
                              onClick={() => handleDeleteNotification(notification.id)}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                {pagination.totalPages > 1 && (
                  <div className="d-flex justify-content-center py-3">
                    <Pagination>
                      <Pagination.First
                        disabled={pagination.page === 1}
                        onClick={() => handlePageChange(1)}
                      />
                      <Pagination.Prev
                        disabled={pagination.page === 1}
                        onClick={() => handlePageChange(pagination.page - 1)}
                      />
                      {[...Array(pagination.totalPages)].map((_, i) => (
                        <Pagination.Item
                          key={i + 1}
                          active={i + 1 === pagination.page}
                          onClick={() => handlePageChange(i + 1)}
                        >
                          {i + 1}
                        </Pagination.Item>
                      ))}
                      <Pagination.Next
                        disabled={pagination.page === pagination.totalPages}
                        onClick={() => handlePageChange(pagination.page + 1)}
                      />
                      <Pagination.Last
                        disabled={pagination.page === pagination.totalPages}
                        onClick={() => handlePageChange(pagination.totalPages)}
                      />
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>
      </div>
    </AdminLayout>
  )
} 