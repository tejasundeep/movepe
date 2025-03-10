import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Spinner, Alert, Tab, Nav, Table, Badge } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Business Intelligence Dashboard Component
 * 
 * This component provides a comprehensive dashboard with various analytics
 * and business intelligence visualizations.
 */
const BusinessIntelligenceDashboard = () => {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('30days');
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    orderTrends: null,
    vendorPerformance: null,
    customerInsights: null,
    popularRoutes: null,
  });

  // Fetch data when timeframe or active tab changes
  useEffect(() => {
    if (session) {
      fetchAnalyticsData();
    }
  }, [session, timeframe, activeTab]);

  const fetchAnalyticsData = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      // Determine what data we need to fetch based on the active tab
      let endpointsToFetch = [];

      if (activeTab === 'overview' || !analyticsData.overview) {
        endpointsToFetch.push({
          key: 'overview',
          url: `/api/analytics?startDate=${getStartDateFromTimeframe(timeframe)}&endDate=${new Date().toISOString()}`
        });
      }

      if (activeTab === 'orders' || !analyticsData.orderTrends) {
        endpointsToFetch.push({
          key: 'orderTrends',
          url: `/api/analytics?metric=order_trends&interval=${getIntervalFromTimeframe(timeframe)}&limit=30`
        });
      }

      if ((activeTab === 'vendors' || !analyticsData.vendorPerformance) && session.user.role === 'admin') {
        endpointsToFetch.push({
          key: 'vendorPerformance',
          url: `/api/analytics?metric=vendor_performance`
        });
      }

      if ((activeTab === 'customers' || !analyticsData.customerInsights) && session.user.role === 'admin') {
        endpointsToFetch.push({
          key: 'customerInsights',
          url: `/api/analytics?metric=customer_insights`
        });
      }

      if ((activeTab === 'routes' || !analyticsData.popularRoutes) && session.user.role === 'admin') {
        endpointsToFetch.push({
          key: 'popularRoutes',
          url: `/api/analytics?metric=popular_routes`
        });
      }

      // Fetch all required endpoints
      const results = await Promise.all(
        endpointsToFetch.map(async endpoint => {
          const response = await fetch(endpoint.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${endpoint.key} data`);
          }
          return { key: endpoint.key, data: await response.json() };
        })
      );

      // Update state with the fetched data
      const newAnalyticsData = { ...analyticsData };
      results.forEach(result => {
        newAnalyticsData[result.key] = result.data;
      });

      setAnalyticsData(newAnalyticsData);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to fetch analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get start date based on timeframe
  const getStartDateFromTimeframe = (timeframe) => {
    const now = new Date();
    
    switch (timeframe) {
      case '7days':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case '30days':
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case '90days':
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      case '1year':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default:
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
    }
  };

  // Get appropriate interval for the chart based on timeframe
  const getIntervalFromTimeframe = (timeframe) => {
    switch (timeframe) {
      case '7days':
        return 'day';
      case '30days':
        return 'day';
      case '90days':
        return 'week';
      case '1year':
        return 'month';
      default:
        return 'day';
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Generate colors for charts
  const generateColors = (count) => {
    const colors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)',
      'rgba(83, 102, 255, 0.7)',
      'rgba(40, 159, 64, 0.7)',
      'rgba(210, 206, 86, 0.7)',
    ];

    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  // Loading state
  if (loading && !analyticsData.overview) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-3 text-muted">Loading business intelligence dashboard...</p>
        </Card.Body>
      </Card>
    );
  }

  // Error state
  if (error && !analyticsData.overview) {
    return (
      <Alert variant="danger" className="mb-4">
        {error}
      </Alert>
    );
  }

  // Permission denied for non-admins
  if (!session?.user?.role === 'admin' && ['vendors', 'customers', 'routes'].includes(activeTab)) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-5">
          <i className="bi bi-lock text-muted" style={{ fontSize: '2rem' }}></i>
          <p className="mt-3 text-muted">You don't have permission to view this data.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="mb-4">
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Business Intelligence Dashboard</h5>
            <Form.Select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="1year">Last Year</option>
            </Form.Select>
          </div>
        </Card.Header>
        
        <Card.Body>
          <Tab.Container id="analytics-tabs" activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs" className="mb-4">
              <Nav.Item key="overview">
                <Nav.Link eventKey="overview">Business Overview</Nav.Link>
              </Nav.Item>
              <Nav.Item key="orders">
                <Nav.Link eventKey="orders">Order Trends</Nav.Link>
              </Nav.Item>
              {session?.user?.role === 'admin' && (
                <>
                  <Nav.Item key="vendors">
                    <Nav.Link eventKey="vendors">Vendor Performance</Nav.Link>
                  </Nav.Item>
                  <Nav.Item key="customers">
                    <Nav.Link eventKey="customers">Customer Insights</Nav.Link>
                  </Nav.Item>
                  <Nav.Item key="routes">
                    <Nav.Link eventKey="routes">Popular Routes</Nav.Link>
                  </Nav.Item>
                </>
              )}
            </Nav>
            
            <Tab.Content>
              <Tab.Pane eventKey="overview">
                {renderBusinessOverview()}
              </Tab.Pane>
              
              <Tab.Pane eventKey="orders">
                {renderOrderTrends()}
              </Tab.Pane>
              
              {session?.user?.role === 'admin' && (
                <>
                  <Tab.Pane eventKey="vendors">
                    {renderVendorPerformance()}
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="customers">
                    {renderCustomerInsights()}
                  </Tab.Pane>
                  
                  <Tab.Pane eventKey="routes">
                    {renderPopularRoutes()}
                  </Tab.Pane>
                </>
              )}
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
      </Card>
    </div>
  );

  function renderBusinessOverview() {
    if (!analyticsData.overview) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" variant="primary" />
        </div>
      );
    }

    const { 
      totalOrders, 
      totalRevenue, 
      totalCommission, 
      activeVendors,
      ordersByStatus,
      revenueByType
    } = analyticsData.overview;

    // Prepare order status data for pie chart
    const orderStatusLabels = Object.keys(ordersByStatus || {});
    const orderStatusData = orderStatusLabels.map(status => ordersByStatus[status]);
    const orderStatusColors = generateColors(orderStatusLabels.length);

    // Prepare revenue by type data for doughnut chart
    const revenueTypeLabels = Object.keys(revenueByType || {});
    const revenueTypeData = revenueTypeLabels.map(type => revenueByType[type]);
    const revenueTypeColors = generateColors(revenueTypeLabels.length);

    return (
      <>
        {/* Key Metrics */}
        <Row className="g-4 mb-4">
          <Col md={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <h6 className="text-muted mb-2">Total Orders</h6>
                <h3 className="mb-0">{totalOrders}</h3>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <h6 className="text-muted mb-2">Total Revenue</h6>
                <h3 className="mb-0">{formatCurrency(totalRevenue)}</h3>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <h6 className="text-muted mb-2">Platform Commission</h6>
                <h3 className="mb-0">{formatCurrency(totalCommission)}</h3>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <h6 className="text-muted mb-2">Active Vendors</h6>
                <h3 className="mb-0">{activeVendors}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        {/* Charts */}
        <Row className="g-4">
          <Col md={6}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body>
                <h6 className="mb-3">Orders by Status</h6>
                <div style={{ height: '300px' }}>
                  <Pie
                    data={{
                      labels: orderStatusLabels,
                      datasets: [
                        {
                          data: orderStatusData,
                          backgroundColor: orderStatusColors,
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                      },
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body>
                <h6 className="mb-3">Revenue by Move Type</h6>
                <div style={{ height: '300px' }}>
                  <Doughnut
                    data={{
                      labels: revenueTypeLabels,
                      datasets: [
                        {
                          data: revenueTypeData,
                          backgroundColor: revenueTypeColors,
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                      },
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  }

  function renderOrderTrends() {
    if (!analyticsData.orderTrends) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" variant="primary" />
        </div>
      );
    }

    const { trends } = analyticsData.orderTrends;
    if (!trends || !Array.isArray(trends) || trends.length === 0) {
      return (
        <div className="text-center py-4">
          <i className="bi bi-graph-up text-muted" style={{ fontSize: '2rem' }}></i>
          <p className="mt-3 text-muted">No order trend data available for the selected time period.</p>
        </div>
      );
    }

    // Prepare data for line chart
    const labels = trends.map(t => t.date);
    const orderCounts = trends.map(t => t.orderCount);
    const totalRevenue = trends.map(t => t.revenue);

    return (
      <Row className="g-4">
        <Col md={12}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <h6 className="mb-3">Order Trends</h6>
              <div style={{ height: '300px' }}>
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: 'Order Count',
                        data: orderCounts,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        tension: 0.1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Number of Orders',
                        },
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Date',
                        },
                      },
                    },
                  }}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={12}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h6 className="mb-3">Revenue Trends</h6>
              <div style={{ height: '300px' }}>
                <Bar
                  data={{
                    labels,
                    datasets: [
                      {
                        label: 'Total Revenue',
                        data: totalRevenue,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Revenue (₹)',
                        },
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Date',
                        },
                      },
                    },
                  }}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  function renderVendorPerformance() {
    if (!analyticsData.vendorPerformance) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" variant="primary" />
        </div>
      );
    }

    const { vendors } = analyticsData.vendorPerformance;
    if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
      return (
        <div className="text-center py-4">
          <i className="bi bi-people text-muted" style={{ fontSize: '2rem' }}></i>
          <p className="mt-3 text-muted">No vendor performance data available.</p>
        </div>
      );
    }

    // Sort vendors by revenue
    const sortedVendors = [...vendors].sort((a, b) => b.revenue - a.revenue);

    // Prepare data for vendor performance chart
    const vendorNames = sortedVendors.slice(0, 10).map(v => v.name);
    const vendorRevenues = sortedVendors.slice(0, 10).map(v => v.revenue);
    const vendorOrders = sortedVendors.slice(0, 10).map(v => v.orderCount);
    const vendorRatings = sortedVendors.slice(0, 10).map(v => v.averageRating);

    return (
      <>
        <Row className="g-4 mb-4">
          <Col md={12}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h6 className="mb-3">Top Vendors by Revenue</h6>
                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: vendorNames,
                      datasets: [
                        {
                          label: 'Revenue',
                          data: vendorRevenues,
                          backgroundColor: 'rgba(54, 162, 235, 0.5)',
                          borderColor: 'rgba(54, 162, 235, 1)',
                          borderWidth: 1,
                        },
                        {
                          label: 'Orders',
                          data: vendorOrders,
                          backgroundColor: 'rgba(255, 99, 132, 0.5)',
                          borderColor: 'rgba(255, 99, 132, 1)',
                          borderWidth: 1,
                          yAxisID: 'y1',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Revenue (₹)',
                          },
                        },
                        y1: {
                          position: 'right',
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Order Count',
                          },
                          grid: {
                            drawOnChartArea: false,
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Vendor',
                          },
                        },
                      },
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row>
          <Col md={12}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h6 className="mb-3">Vendor Performance Details</h6>
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Vendor</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                        <th>Avg. Rating</th>
                        <th>Response Time</th>
                        <th>Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedVendors.map((vendor) => (
                        <tr key={vendor.id}>
                          <td>
                            <div className="fw-bold">{vendor.name}</div>
                            <div className="text-muted small">{vendor.id}</div>
                          </td>
                          <td>{vendor.orderCount}</td>
                          <td>{formatCurrency(vendor.revenue)}</td>
                          <td>
                            {vendor.averageRating ? (
                              <div>
                                {vendor.averageRating.toFixed(1)}
                                <span className="text-warning"> ★</span>
                              </div>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>{vendor.averageResponseTime ? `${vendor.averageResponseTime.toFixed(1)} hours` : 'N/A'}</td>
                          <td>
                            {getPerformanceBadge(vendor.performanceScore)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  }

  function getPerformanceBadge(score) {
    if (score >= 90) {
      return <Badge bg="success">Excellent</Badge>;
    } else if (score >= 80) {
      return <Badge bg="primary">Good</Badge>;
    } else if (score >= 70) {
      return <Badge bg="warning">Average</Badge>;
    } else if (score >= 0) {
      return <Badge bg="danger">Needs Improvement</Badge>;
    }
    return <span className="text-muted">N/A</span>;
  }

  function renderCustomerInsights() {
    if (!analyticsData.customerInsights) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" variant="primary" />
        </div>
      );
    }

    const { customers, customerSegments, retentionRate } = analyticsData.customerInsights;
    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return (
        <div className="text-center py-4">
          <i className="bi bi-people text-muted" style={{ fontSize: '2rem' }}></i>
          <p className="mt-3 text-muted">No customer insights data available.</p>
        </div>
      );
    }

    // Prepare data for customer segments chart
    const segmentLabels = Object.keys(customerSegments || {});
    const segmentData = segmentLabels.map(segment => customerSegments[segment]);
    const segmentColors = generateColors(segmentLabels.length);

    return (
      <>
        <Row className="g-4 mb-4">
          <Col md={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h6 className="mb-3">Customer Segments</h6>
                <div style={{ height: '300px' }}>
                  <Pie
                    data={{
                      labels: segmentLabels,
                      datasets: [
                        {
                          data: segmentData,
                          backgroundColor: segmentColors,
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                      },
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <h6 className="mb-3">Customer Retention</h6>
                <div style={{ height: '300px' }} className="d-flex flex-column justify-content-center align-items-center">
                  <div style={{ width: '200px', height: '200px', position: 'relative' }}>
                    <Doughnut
                      data={{
                        labels: ['Retained', 'Lost'],
                        datasets: [
                          {
                            data: [retentionRate, 100 - retentionRate],
                            backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 99, 132, 0.7)'],
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        cutout: '70%',
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                      }}
                    />
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center' 
                      }}
                    >
                      <h3 className="mb-0">{retentionRate}%</h3>
                      <p className="mb-0 text-muted small">retention</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="d-flex justify-content-center">
                      <div className="me-4">
                        <span className="d-inline-block me-2" style={{ width: '12px', height: '12px', backgroundColor: 'rgba(75, 192, 192, 0.7)', borderRadius: '50%' }}></span>
                        <span>Retained</span>
                      </div>
                      <div>
                        <span className="d-inline-block me-2" style={{ width: '12px', height: '12px', backgroundColor: 'rgba(255, 99, 132, 0.7)', borderRadius: '50%' }}></span>
                        <span>Lost</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row>
          <Col md={12}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h6 className="mb-3">Top Customers</h6>
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Orders</th>
                        <th>Total Spent</th>
                        <th>Last Order</th>
                        <th>Segment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.slice(0, 10).map((customer) => (
                        <tr key={customer.id}>
                          <td>
                            <div className="fw-bold">{customer.name}</div>
                            <div className="text-muted small">{customer.email}</div>
                          </td>
                          <td>{customer.orderCount}</td>
                          <td>{formatCurrency(customer.totalSpent)}</td>
                          <td>{new Date(customer.lastOrderDate).toLocaleDateString()}</td>
                          <td>
                            {getCustomerSegmentBadge(customer.segment)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  }

  function getCustomerSegmentBadge(segment) {
    switch (segment) {
      case 'new':
        return <Badge bg="info">New</Badge>;
      case 'loyal':
        return <Badge bg="success">Loyal</Badge>;
      case 'returning':
        return <Badge bg="primary">Returning</Badge>;
      case 'at_risk':
        return <Badge bg="warning">At Risk</Badge>;
      case 'inactive':
        return <Badge bg="danger">Inactive</Badge>;
      default:
        return <Badge bg="secondary">{segment}</Badge>;
    }
  }

  function renderPopularRoutes() {
    if (!analyticsData.popularRoutes) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" variant="primary" />
        </div>
      );
    }

    const { routes } = analyticsData.popularRoutes;
    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return (
        <div className="text-center py-4">
          <i className="bi bi-map text-muted" style={{ fontSize: '2rem' }}></i>
          <p className="mt-3 text-muted">No popular routes data available.</p>
        </div>
      );
    }

    // Prepare data for popular routes chart
    const routeLabels = routes.slice(0, 10).map(r => `${r.origin} → ${r.destination}`);
    const routeCounts = routes.slice(0, 10).map(r => r.count);
    const routeRevenues = routes.slice(0, 10).map(r => r.revenue);

    return (
      <>
        <Row className="g-4 mb-4">
          <Col md={12}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h6 className="mb-3">Popular Routes by Order Count</h6>
                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: routeLabels,
                      datasets: [
                        {
                          label: 'Order Count',
                          data: routeCounts,
                          backgroundColor: 'rgba(54, 162, 235, 0.5)',
                          borderColor: 'rgba(54, 162, 235, 1)',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      scales: {
                        x: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Number of Orders',
                          },
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Route',
                          },
                        },
                      },
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row>
          <Col md={12}>
            <Card className="border-0 shadow-sm">
              <Card.Body>
                <h6 className="mb-3">Route Details</h6>
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Origin</th>
                        <th>Destination</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                        <th>Avg. Distance</th>
                        <th>Avg. Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.map((route) => (
                        <tr key={`${route.origin}-${route.destination}`}>
                          <td>{route.origin}</td>
                          <td>{route.destination}</td>
                          <td>{route.count}</td>
                          <td>{formatCurrency(route.revenue)}</td>
                          <td>{route.averageDistance ? `${route.averageDistance.toFixed(1)} km` : 'N/A'}</td>
                          <td>{formatCurrency(route.averagePrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  }
};

export default BusinessIntelligenceDashboard; 