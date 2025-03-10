'use client'

import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Table, Form, Badge, Tabs, Tab, Alert, Spinner } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FaUsers, FaStore, FaBoxes, FaExclamationTriangle, FaCheck, FaSpinner, FaTruck, FaMoneyBillWave } from 'react-icons/fa'

/**
 * Admin Dashboard
 * 
 * Provides platform management capabilities for administrators.
 */
const AdminDashboard = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState({
    platformStats: null,
    recentOrders: [],
    pendingVendors: [],
    supportTickets: [],
    systemHealth: null
  })

  // Fetch dashboard data
  useEffect(() => {
    if (status === 'authenticated') {
      if (session.user.role !== 'admin') {
        router.push('/')
        return
      }
      
      fetchDashboardData()
    } else if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, session, router])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch platform overview data
      const overviewResponse = await fetch('/api/admin/dashboard')
      if (!overviewResponse.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const overviewData = await overviewResponse.json()
      
      // Fetch recent orders
      const ordersResponse = await fetch('/api/admin/orders?limit=5')
      if (!ordersResponse.ok) {
        throw new Error('Failed to fetch recent orders')
      }
      
      const ordersData = await ordersResponse.json()
      
      // Fetch pending vendor approvals
      const vendorsResponse = await fetch('/api/admin/vendors/pending')
      if (!vendorsResponse.ok) {
        throw new Error('Failed to fetch pending vendors')
      }
      
      const vendorsData = await vendorsResponse.json()
      
      // Fetch support tickets
      const ticketsResponse = await fetch('/api/admin/support/tickets?status=open')
      if (!ticketsResponse.ok) {
        throw new Error('Failed to fetch support tickets')
      }
      
      const ticketsData = await ticketsResponse.json()
      
      // Fetch system health data
      const healthResponse = await fetch('/api/admin/system-health')
      if (!healthResponse.ok) {
        throw new Error('Failed to fetch system health')
      }
      
      const healthData = await healthResponse.json()
      
      setDashboardData({
        platformStats: overviewData,
        recentOrders: ordersData.orders,
        pendingVendors: vendorsData.vendors,
        supportTickets: ticketsData.tickets,
        systemHealth: healthData
      })
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveVendor = async (vendorId) => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/approve`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to approve vendor')
      }
      
      // Update local state to remove approved vendor
      setDashboardData(prev => ({
        ...prev,
        pendingVendors: prev.pendingVendors.filter(vendor => vendor.id !== vendorId)
      }))
    } catch (err) {
      console.error('Error approving vendor:', err)
      setError('Failed to approve vendor. Please try again.')
    }
  }

  const handleRejectVendor = async (vendorId) => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/reject`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to reject vendor')
      }
      
      // Update local state to remove rejected vendor
      setDashboardData(prev => ({
        ...prev,
        pendingVendors: prev.pendingVendors.filter(vendor => vendor.id !== vendorId)
      }))
    } catch (err) {
      console.error('Error rejecting vendor:', err)
      setError('Failed to reject vendor. Please try again.')
    }
  }

  // Loading state
  if (status === 'loading' || (status === 'authenticated' && loading && !dashboardData.platformStats)) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" variant="primary" />
        <p className="mt-3">Loading admin dashboard...</p>
      </Container>
    )
  }

  // Error state
  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchDashboardData}>
            Retry
          </Button>
        </Alert>
      </Container>
    )
  }

  // Not authorized
  if (status === 'authenticated' && session.user.role !== 'admin') {
    return (
      <Container className="py-5 text-center">
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have permission to access the admin dashboard.</p>
        </Alert>
      </Container>
    )
  }

  return (
    <Container fluid className="py-4">
      <h1 className="mb-4">Admin Dashboard</h1>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="overview" title="Overview">
          <Row className="g-4 mb-4">
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="d-flex flex-column align-items-center">
                  <div className="text-center mb-3">
                    <div className="display-4">{dashboardData.platformStats?.totalUsers || 0}</div>
                    <div className="text-muted">Total Users</div>
                  </div>
                  <div className="d-flex justify-content-around w-100">
                    <div className="text-center px-2">
                      <div className="h5 mb-0">{dashboardData.platformStats?.customerCount || 0}</div>
                      <div className="small text-muted">Customers</div>
                    </div>
                    <div className="text-center px-2">
                      <div className="h5 mb-0">{dashboardData.platformStats?.vendorCount || 0}</div>
                      <div className="small text-muted">Vendors</div>
                    </div>
                    <div className="text-center px-2">
                      <div className="h5 mb-0">{dashboardData.platformStats?.riderCount || 0}</div>
                      <div className="small text-muted">Riders</div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="display-4">
                    {dashboardData.platformStats?.totalOrders || 0}
                  </div>
                  <div className="text-muted">Total Orders</div>
                  <div className="mt-3">
                    <Badge bg="success" className="me-2">
                      {dashboardData.platformStats?.completedOrders || 0} Completed
                    </Badge>
                    <Badge bg="warning" className="me-2">
                      {dashboardData.platformStats?.activeOrders || 0} Active
                    </Badge>
                    <Badge bg="danger">
                      {dashboardData.platformStats?.cancelledOrders || 0} Cancelled
                    </Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="display-4">
                    ₹{dashboardData.platformStats?.totalRevenue?.toLocaleString() || 0}
                  </div>
                  <div className="text-muted">Total Revenue</div>
                  <div className="mt-3 text-success">
                    ₹{dashboardData.platformStats?.totalCommission?.toLocaleString() || 0} Platform Commission
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="display-4">
                    {dashboardData.platformStats?.totalReviews || 0}
                  </div>
                  <div className="text-muted">Total Reviews</div>
                  <div className="mt-3">
                    <div className="text-warning">
                      {dashboardData.platformStats?.averageRating?.toFixed(1) || 0}
                      <i className="bi bi-star-fill ms-1"></i>
                    </div>
                    <div className="small text-muted">Average Rating</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row className="g-4 mb-4">
            <Col md={6}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Recent Orders</h5>
                    <Link href="/admin/orders" className="btn btn-sm btn-outline-primary">
                      View All
                    </Link>
                  </div>
                </Card.Header>
                <Card.Body>
                  {dashboardData.recentOrders && dashboardData.recentOrders.length > 0 ? (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.recentOrders?.map(order => (
                            <tr key={order.id}>
                              <td>
                                <Link href={`/admin/orders/${order.id}`} className="text-decoration-none">
                                  #{order.id.substring(0, 8)}
                                </Link>
                              </td>
                              <td>{order.customerName}</td>
                              <td>
                                <Badge bg={getStatusBadge(order.status)}>
                                  {order.status}
                                </Badge>
                              </td>
                              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                              <td>₹{order.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted">No recent orders</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Pending Vendor Approvals</h5>
                    <Link href="/admin/vendors" className="btn btn-sm btn-outline-primary">
                      View All Vendors
                    </Link>
                  </div>
                </Card.Header>
                <Card.Body>
                  {dashboardData.pendingVendors && dashboardData.pendingVendors.length > 0 ? (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Vendor</th>
                            <th>Email</th>
                            <th>Applied On</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.pendingVendors?.map(vendor => (
                            <tr key={vendor.id}>
                              <td>
                                <div>{vendor.businessName}</div>
                                <small className="text-muted">{vendor.ownerName}</small>
                              </td>
                              <td>{vendor.email}</td>
                              <td>{new Date(vendor.createdAt).toLocaleDateString()}</td>
                              <td>
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="me-2"
                                  onClick={() => handleApproveVendor(vendor.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRejectVendor(vendor.id)}
                                >
                                  Reject
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted">No pending vendor approvals</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <Row className="g-4">
            <Col md={6}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Support Tickets</h5>
                    <Link href="/admin/support" className="btn btn-sm btn-outline-primary">
                      View All Tickets
                    </Link>
                  </div>
                </Card.Header>
                <Card.Body>
                  {dashboardData.supportTickets && dashboardData.supportTickets.length > 0 ? (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Subject</th>
                            <th>User</th>
                            <th>Priority</th>
                            <th>Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.supportTickets?.map(ticket => (
                            <tr key={ticket.id}>
                              <td>
                                <Link href={`/admin/support/${ticket.id}`} className="text-decoration-none">
                                  #{ticket.id.substring(0, 8)}
                                </Link>
                              </td>
                              <td>{ticket.subject}</td>
                              <td>{ticket.userName}</td>
                              <td>
                                <Badge bg={getPriorityBadge(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                              </td>
                              <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted">No open support tickets</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">System Health</h5>
                    <Link href="/admin/system" className="btn btn-sm btn-outline-primary">
                      System Settings
                    </Link>
                  </div>
                </Card.Header>
                <Card.Body>
                  {dashboardData.systemHealth ? (
                    <>
                      <div className="mb-3">
                        <h6>API Performance</h6>
                        <div className="progress mb-2" style={{ height: '10px' }}>
                          <div
                            className={`progress-bar ${getApiHealthClass(dashboardData.systemHealth.apiHealthScore)}`}
                            style={{ width: `${dashboardData.systemHealth.apiHealthScore}%` }}
                          ></div>
                        </div>
                        <div className="d-flex justify-content-between">
                          <small className="text-muted">
                            Avg. Response: {dashboardData.systemHealth.averageResponseTime}ms
                          </small>
                          <small className="text-muted">
                            Error Rate: {dashboardData.systemHealth.errorRate}%
                          </small>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <h6>Database</h6>
                        <div className="progress mb-2" style={{ height: '10px' }}>
                          <div
                            className="progress-bar bg-info"
                            style={{ width: `${dashboardData.systemHealth.databaseUsage}%` }}
                          ></div>
                        </div>
                        <div className="d-flex justify-content-between">
                          <small className="text-muted">
                            Connections: {dashboardData.systemHealth.databaseConnections}
                          </small>
                          <small className="text-muted">
                            Usage: {dashboardData.systemHealth.databaseUsage}%
                          </small>
                        </div>
                      </div>
                      
                      <div>
                        <h6>Recent Errors</h6>
                        {dashboardData.systemHealth?.recentErrors && dashboardData.systemHealth.recentErrors.length > 0 ? (
                          <ul className="list-group">
                            {dashboardData.systemHealth?.recentErrors?.map((error, index) => (
                              <li key={index} className="list-group-item">
                                <div className="d-flex justify-content-between">
                                  <div className="text-danger">{error.message}</div>
                                  <div className="text-muted small">
                                    {new Date(error.timestamp).toLocaleTimeString()}
                                  </div>
                                </div>
                                <div className="small text-muted">{error.path}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-success">No recent errors reported</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted">No system health data available</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="users" title="User Management">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>User Management</h3>
            <div>
              <Button variant="primary" className="me-2">
                Add User
              </Button>
              <Button variant="outline-secondary">
                Export Users
              </Button>
            </div>
          </div>
          
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <Form.Group style={{ width: '300px' }}>
                  <Form.Control type="text" placeholder="Search users..." />
                </Form.Group>
                <Form.Group>
                  <Form.Select>
                    <option value="all">All Roles</option>
                    <option value="customer">Customers</option>
                    <option value="vendor">Vendors</option>
                    <option value="rider">Riders</option>
                    <option value="admin">Admins</option>
                  </Form.Select>
                </Form.Group>
              </div>
              
              <p className="text-muted">
                For full user management functionality, please go to the complete User Management page.
              </p>
              
              <div className="text-center">
                <Link href="/admin/users" className="btn btn-primary">
                  Go to User Management
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="orders" title="Order Management">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>Order Management</h3>
            <Button variant="outline-secondary">
              Export Orders
            </Button>
          </div>
          
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <Form.Group style={{ width: '300px' }}>
                  <Form.Control type="text" placeholder="Search orders..." />
                </Form.Group>
                <Form.Group>
                  <Form.Select>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Form.Group>
              </div>
              
              <p className="text-muted">
                For the complete order management interface, please go to the Order Management page.
              </p>
              
              <div className="text-center">
                <Link href="/admin/orders" className="btn btn-primary">
                  Go to Order Management
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="riders" title="Rider Management">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>Rider Management</h3>
            <div>
              <Button variant="primary" className="me-2">
                Add Rider
              </Button>
              <Button variant="outline-secondary">
                Export Riders
              </Button>
            </div>
          </div>
          
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <Form.Group style={{ width: '300px' }}>
                  <Form.Control type="text" placeholder="Search riders..." />
                </Form.Group>
                <Form.Group>
                  <Form.Select>
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending Approval</option>
                    <option value="suspended">Suspended</option>
                  </Form.Select>
                </Form.Group>
              </div>
              
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Rider</th>
                      <th>Phone</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Rating</th>
                      <th>Deliveries</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="fw-bold">Rahul Sharma</div>
                        <small className="text-muted">ID: RID12345</small>
                      </td>
                      <td>+91 98765 43210</td>
                      <td>Mumbai</td>
                      <td><Badge bg="success">Active</Badge></td>
                      <td>
                        <span className="text-warning">4.8</span>
                        <i className="bi bi-star-fill ms-1 text-warning"></i>
                      </td>
                      <td>125</td>
                      <td>
                        <Button variant="outline-primary" size="sm" className="me-2">
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button variant="outline-danger" size="sm">
                          <i className="bi bi-ban"></i>
                        </Button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="fw-bold">Priya Patel</div>
                        <small className="text-muted">ID: RID12346</small>
                      </td>
                      <td>+91 87654 32109</td>
                      <td>Delhi</td>
                      <td><Badge bg="warning">Inactive</Badge></td>
                      <td>
                        <span className="text-warning">4.5</span>
                        <i className="bi bi-star-fill ms-1 text-warning"></i>
                      </td>
                      <td>87</td>
                      <td>
                        <Button variant="outline-primary" size="sm" className="me-2">
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button variant="outline-success" size="sm">
                          <i className="bi bi-check-circle"></i>
                        </Button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="fw-bold">Arjun Singh</div>
                        <small className="text-muted">ID: RID12347</small>
                      </td>
                      <td>+91 76543 21098</td>
                      <td>Bangalore</td>
                      <td><Badge bg="primary">Pending</Badge></td>
                      <td>-</td>
                      <td>0</td>
                      <td>
                        <Button variant="success" size="sm" className="me-2">
                          Approve
                        </Button>
                        <Button variant="danger" size="sm">
                          Reject
                        </Button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="fw-bold">Neha Gupta</div>
                        <small className="text-muted">ID: RID12348</small>
                      </td>
                      <td>+91 65432 10987</td>
                      <td>Chennai</td>
                      <td><Badge bg="danger">Suspended</Badge></td>
                      <td>
                        <span className="text-warning">3.2</span>
                        <i className="bi bi-star-fill ms-1 text-warning"></i>
                      </td>
                      <td>42</td>
                      <td>
                        <Button variant="outline-primary" size="sm" className="me-2">
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button variant="outline-success" size="sm">
                          <i className="bi bi-check-circle"></i>
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
              
              <div className="mt-3 d-flex justify-content-between align-items-center">
                <div>Showing 4 of 24 riders</div>
                <div>
                  <Button variant="outline-primary" size="sm" className="me-2">Previous</Button>
                  <Button variant="outline-primary" size="sm">Next</Button>
                </div>
              </div>
            </Card.Body>
          </Card>
          
          <Row className="g-4">
            <Col md={6}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <h5 className="mb-0">Pending Approvals</h5>
                </Card.Header>
                <Card.Body>
                  <div className="list-group">
                    <div className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">Arjun Singh</h6>
                          <p className="mb-1 small">Bangalore | Vehicle: Two-wheeler</p>
                          <small className="text-muted">Applied: 2 days ago</small>
                        </div>
                        <div>
                          <Button variant="success" size="sm" className="me-2">Approve</Button>
                          <Button variant="danger" size="sm">Reject</Button>
                        </div>
                      </div>
                    </div>
                    <div className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">Vikram Joshi</h6>
                          <p className="mb-1 small">Pune | Vehicle: Car</p>
                          <small className="text-muted">Applied: 5 days ago</small>
                        </div>
                        <div>
                          <Button variant="success" size="sm" className="me-2">Approve</Button>
                          <Button variant="danger" size="sm">Reject</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <h5 className="mb-0">Rider Performance</h5>
                </Card.Header>
                <Card.Body>
                  <div className="table-responsive">
                    <Table hover>
                      <thead>
                        <tr>
                          <th>Rider</th>
                          <th>On-time %</th>
                          <th>Avg. Rating</th>
                          <th>Completion %</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Rahul Sharma</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="me-2">98%</div>
                              <div className="progress flex-grow-1" style={{ height: '5px' }}>
                                <div className="progress-bar bg-success" style={{ width: '98%' }}></div>
                              </div>
                            </div>
                          </td>
                          <td>4.8</td>
                          <td>100%</td>
                        </tr>
                        <tr>
                          <td>Priya Patel</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="me-2">92%</div>
                              <div className="progress flex-grow-1" style={{ height: '5px' }}>
                                <div className="progress-bar bg-success" style={{ width: '92%' }}></div>
                              </div>
                            </div>
                          </td>
                          <td>4.5</td>
                          <td>95%</td>
                        </tr>
                        <tr>
                          <td>Neha Gupta</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="me-2">78%</div>
                              <div className="progress flex-grow-1" style={{ height: '5px' }}>
                                <div className="progress-bar bg-warning" style={{ width: '78%' }}></div>
                              </div>
                            </div>
                          </td>
                          <td>3.2</td>
                          <td>85%</td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="settings" title="Platform Settings">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>Platform Settings</h3>
            <Button variant="success">
              Save All Changes
            </Button>
          </div>
          
          <Row className="g-4">
            <Col md={6}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <h5 className="mb-0">General Settings</h5>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Platform Name</Form.Label>
                    <Form.Control type="text" defaultValue="MovePE" />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Platform Fee (%)</Form.Label>
                    <Form.Control type="number" defaultValue="10" min="0" max="100" />
                    <Form.Text className="text-muted">
                      Percentage of each transaction that the platform retains as commission.
                    </Form.Text>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Support Email</Form.Label>
                    <Form.Control type="email" defaultValue="support@movepe.com" />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      id="maintenance-mode"
                      label="Maintenance Mode"
                    />
                    <Form.Text className="text-muted">
                      When enabled, the site will display a maintenance message to all users.
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent">
                  <h5 className="mb-0">Notification Settings</h5>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Notifications</Form.Label>
                    <Form.Check
                      type="checkbox"
                      id="notify-new-users"
                      label="New User Registrations"
                      defaultChecked
                    />
                    <Form.Check
                      type="checkbox"
                      id="notify-new-orders"
                      label="New Orders"
                      defaultChecked
                    />
                    <Form.Check
                      type="checkbox"
                      id="notify-vendor-applications"
                      label="Vendor Applications"
                      defaultChecked
                    />
                    <Form.Check
                      type="checkbox"
                      id="notify-support-tickets"
                      label="Support Tickets"
                      defaultChecked
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Admin Email Recipients</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      defaultValue="admin@movepe.com, operations@movepe.com"
                    />
                    <Form.Text className="text-muted">
                      Comma-separated list of email addresses to receive admin notifications.
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <div className="mt-4 text-center">
            <Link href="/admin/settings" className="btn btn-primary">
              Advanced Settings
            </Link>
          </div>
        </Tab>
      </Tabs>
    </Container>
  )
}

// Helper functions
const getStatusBadge = (status) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'success'
    case 'confirmed':
    case 'accepted':
      return 'primary'
    case 'in_progress':
    case 'processing':
      return 'info'
    case 'pending':
    case 'waiting':
      return 'warning'
    case 'cancelled':
    case 'rejected':
      return 'danger'
    default:
      return 'secondary'
  }
}

const getPriorityBadge = (priority) => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    case 'low':
      return 'info'
    default:
      return 'secondary'
  }
}

const getApiHealthClass = (score) => {
  if (score >= 90) return 'bg-success'
  if (score >= 70) return 'bg-info'
  if (score >= 50) return 'bg-warning'
  return 'bg-danger'
}

export default AdminDashboard 