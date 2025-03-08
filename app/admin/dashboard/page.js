'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Badge, Spinner, Alert } from 'react-bootstrap'
import AdminLayout from '../../components/AdminLayout'
import { FaUsers, FaStore, FaBoxes, FaExclamationTriangle, FaCheck, FaSpinner, FaTruck, FaMoneyBillWave } from 'react-icons/fa'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalOrders: 0,
    recentOrders: [],
    pendingQuotes: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/dashboard')
        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`)
        }
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

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
          <p className="mt-3">Loading dashboard data...</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="danger">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <hr />
          <p className="mb-0">
            Please try refreshing the page or contact the system administrator.
          </p>
        </Alert>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mb-4">
        <h2 className="mb-4">Dashboard Overview</h2>
        
        <Row className="g-4 mb-4">
          <Col md={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                  <FaUsers className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="display-6 fw-bold mb-0">{stats.totalUsers}</h3>
                  <Card.Text className="text-muted">Total Users</Card.Text>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center">
                <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                  <FaStore className="text-success" size={24} />
                </div>
                <div>
                  <h3 className="display-6 fw-bold mb-0">{stats.totalVendors}</h3>
                  <Card.Text className="text-muted">Total Vendors</Card.Text>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center">
                <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3">
                  <FaBoxes className="text-info" size={24} />
                </div>
                <div>
                  <h3 className="display-6 fw-bold mb-0">{stats.totalOrders}</h3>
                  <Card.Text className="text-muted">Total Orders</Card.Text>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="d-flex align-items-center">
                <div className="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                  <FaExclamationTriangle className="text-warning" size={24} />
                </div>
                <div>
                  <h3 className="display-6 fw-bold mb-0">{stats.pendingQuotes}</h3>
                  <Card.Text className="text-muted">Pending Quotes</Card.Text>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white py-3">
            <h5 className="mb-0">Recent Orders</h5>
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
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.length > 0 ? (
                    stats.recentOrders.map(order => (
                      <tr key={order.orderId}>
                        <td>
                          <span className="text-primary fw-medium">
                            {order.orderId.substring(0, 8)}...
                          </span>
                        </td>
                        <td>{order.userEmail}</td>
                        <td>{order.pickupPincode}</td>
                        <td>{order.destinationPincode}</td>
                        <td>{order.moveSize}</td>
                        <td>{getStatusBadge(order.status)}</td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4">No recent orders found</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </div>
    </AdminLayout>
  )
} 