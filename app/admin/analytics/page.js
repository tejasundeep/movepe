'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Badge, Spinner, Alert, Form } from 'react-bootstrap'
import AdminLayout from '../../components/AdminLayout'
import { FaChartLine, FaChartBar, FaChartPie, FaUsers, FaStore, FaBoxes, FaCalendarAlt } from 'react-icons/fa'

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState({
    userStats: { total: 0, newThisMonth: 0, activeUsers: 0 },
    vendorStats: { total: 0, newThisMonth: 0, activeVendors: 0 },
    orderStats: { total: 0, completed: 0, inProgress: 0, cancelled: 0 },
    revenueStats: { total: 0, thisMonth: 0, lastMonth: 0 },
    topVendors: [],
    recentEvents: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState('month') // 'week', 'month', 'year'

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics data: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Mock data for visualization - in a real app, this would come from the API
  const mockChartData = {
    ordersByMonth: [
      { month: 'Jan', count: 12 },
      { month: 'Feb', count: 19 },
      { month: 'Mar', count: 15 },
      { month: 'Apr', count: 22 },
      { month: 'May', count: 28 },
      { month: 'Jun', count: 35 }
    ],
    revenueByMonth: [
      { month: 'Jan', amount: 25000 },
      { month: 'Feb', amount: 32000 },
      { month: 'Mar', amount: 28000 },
      { month: 'Apr', amount: 42000 },
      { month: 'May', amount: 55000 },
      { month: 'Jun', amount: 68000 }
    ]
  }

  const renderBarChart = (data, valueKey, labelKey, height = 200) => {
    const maxValue = Math.max(...data.map(item => item[valueKey]))
    
    return (
      <div style={{ height: `${height}px` }} className="d-flex align-items-end">
        {data.map((item, index) => {
          const percentage = (item[valueKey] / maxValue) * 100
          return (
            <div key={index} className="d-flex flex-column align-items-center mx-1" style={{ flex: 1 }}>
              <div 
                className="bg-primary rounded-top" 
                style={{ 
                  height: `${percentage}%`, 
                  width: '100%', 
                  minWidth: '20px',
                  transition: 'height 0.5s ease'
                }}
              ></div>
              <div className="text-center mt-2 small">
                <div>{item[labelKey]}</div>
                <div className="fw-bold">{item[valueKey]}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const getEventBadge = (eventType) => {
    switch(eventType) {
      case 'user_registered':
        return <Badge bg="success">User Registered</Badge>
      case 'order_created':
        return <Badge bg="primary">Order Created</Badge>
      case 'order_completed':
        return <Badge bg="info">Order Completed</Badge>
      case 'payment_received':
        return <Badge bg="warning">Payment Received</Badge>
      case 'vendor_registered':
        return <Badge bg="secondary">Vendor Registered</Badge>
      default:
        return <Badge bg="secondary">{eventType}</Badge>
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading analytics data...</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="danger">
          <Alert.Heading>Error Loading Analytics</Alert.Heading>
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Analytics Dashboard</h2>
        <Form.Select 
          style={{ width: 'auto' }}
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="year">Last 12 Months</option>
        </Form.Select>
      </div>

      {/* Summary Stats */}
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                <FaUsers className="text-primary" size={24} />
              </div>
              <div>
                <h3 className="display-6 fw-bold mb-0">{analyticsData.userStats.total}</h3>
                <Card.Text className="text-muted">Total Users</Card.Text>
                <div className="small text-success">+{analyticsData.userStats.newThisMonth} this month</div>
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
                <h3 className="display-6 fw-bold mb-0">{analyticsData.vendorStats.total}</h3>
                <Card.Text className="text-muted">Total Vendors</Card.Text>
                <div className="small text-success">+{analyticsData.vendorStats.newThisMonth} this month</div>
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
                <h3 className="display-6 fw-bold mb-0">{analyticsData.orderStats.total}</h3>
                <Card.Text className="text-muted">Total Orders</Card.Text>
                <div className="small text-success">{analyticsData.orderStats.completed} completed</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center">
              <div className="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                <FaChartLine className="text-warning" size={24} />
              </div>
              <div>
                <h3 className="display-6 fw-bold mb-0">₹{analyticsData.revenueStats.total.toLocaleString()}</h3>
                <Card.Text className="text-muted">Total Revenue</Card.Text>
                <div className="small text-success">₹{analyticsData.revenueStats.thisMonth.toLocaleString()} this month</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 d-flex align-items-center">
              <FaChartBar className="text-primary me-2" />
              <h5 className="mb-0">Orders by Month</h5>
            </Card.Header>
            <Card.Body>
              {renderBarChart(mockChartData.ordersByMonth, 'count', 'month')}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 d-flex align-items-center">
              <FaChartLine className="text-success me-2" />
              <h5 className="mb-0">Revenue by Month</h5>
            </Card.Header>
            <Card.Body>
              {renderBarChart(mockChartData.revenueByMonth, 'amount', 'month')}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Vendors and Recent Events */}
      <Row>
        <Col md={6}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3 d-flex align-items-center">
              <FaStore className="text-primary me-2" />
              <h5 className="mb-0">Top Performing Vendors</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Vendor</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.topVendors.length > 0 ? (
                    analyticsData.topVendors.map((vendor, index) => (
                      <tr key={index}>
                        <td>{vendor.name}</td>
                        <td>{vendor.orderCount}</td>
                        <td>₹{vendor.revenue.toLocaleString()}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="text-warning me-1">★</span>
                            <span>{vendor.rating.toFixed(1)}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-4">No vendor data available</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3 d-flex align-items-center">
              <FaCalendarAlt className="text-primary me-2" />
              <h5 className="mb-0">Recent Activity</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Event</th>
                    <th>Details</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.recentEvents.length > 0 ? (
                    analyticsData.recentEvents.map((event, index) => (
                      <tr key={index}>
                        <td>{getEventBadge(event.type)}</td>
                        <td>{event.details}</td>
                        <td>{new Date(event.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center py-4">No recent events</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  )
} 