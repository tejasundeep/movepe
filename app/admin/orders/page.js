'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Button, Form, InputGroup, Spinner, Alert, Badge, Dropdown } from 'react-bootstrap'
import AdminLayout from '../../components/AdminLayout'
import { FaSearch, FaEye, FaTrash, FaFilter, FaExclamationTriangle, FaCheck, FaSpinner, FaTruck, FaMoneyBillWave, FaFileExport } from 'react-icons/fa'
import Link from 'next/link'

export default function OrderManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/orders')
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (orderId) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete order')
      }

      // Refresh order list
      await fetchOrders()
    } catch (error) {
      setError(error.message)
    } finally {
      setActionLoading(false)
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

  const filteredOrders = orders.filter(order => {
    // Apply status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false
    }
    
    // Apply search filter
    return (
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.pickupPincode.includes(searchTerm) ||
      order.destinationPincode.includes(searchTerm) ||
      (order.moveSize && order.moveSize.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading orders...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Order Management</h2>
        <div>
          <Link href="/admin/orders/export" passHref>
            <Button variant="success" className="d-flex align-items-center">
              <FaFileExport className="me-2" /> Export Orders
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
          <InputGroup style={{ maxWidth: '500px' }}>
            <InputGroup.Text className="bg-light border-end-0">
              <FaSearch className="text-muted" />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search orders by ID, email, pincode or move size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-start-0 bg-light"
            />
          </InputGroup>
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
              <Dropdown.Item onClick={() => setStatusFilter('Initiated')} active={statusFilter === 'Initiated'}>
                Initiated
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setStatusFilter('QuoteRequested')} active={statusFilter === 'QuoteRequested'}>
                Quote Requested
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setStatusFilter('QuoteAccepted')} active={statusFilter === 'QuoteAccepted'}>
                Quote Accepted
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setStatusFilter('InProgress')} active={statusFilter === 'InProgress'}>
                In Progress
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setStatusFilter('Completed')} active={statusFilter === 'Completed'}>
                Completed
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setStatusFilter('Paid')} active={statusFilter === 'Paid'}>
                Paid
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Order ID</th>
                  <th>User</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Move Size</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <tr key={order.orderId}>
                      <td className="align-middle">
                        <span className="text-primary fw-medium">
                          {order.orderId.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="align-middle">{order.userEmail}</td>
                      <td className="align-middle">{order.pickupPincode}</td>
                      <td className="align-middle">{order.destinationPincode}</td>
                      <td className="align-middle">{order.moveSize}</td>
                      <td className="align-middle">{getStatusBadge(order.status)}</td>
                      <td className="align-middle">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="align-middle text-end">
                        <Link href={`/admin/orders/${order.orderId}`} passHref>
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="me-2"
                            disabled={actionLoading}
                          >
                            <FaEye /> View
                          </Button>
                        </Link>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDelete(order.orderId)}
                          disabled={actionLoading}
                        >
                          <FaTrash /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      {searchTerm || statusFilter !== 'all' ? 
                        'No orders match your search criteria' : 
                        'No orders found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </AdminLayout>
  )
} 