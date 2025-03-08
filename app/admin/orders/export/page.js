'use client'

import { useState, useEffect } from 'react'
import { Card, Form, Button, Alert, Spinner, Row, Col, Table } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import AdminLayout from '../../../components/AdminLayout'
import { FaFileExport, FaCalendarAlt, FaFilter, FaDownload, FaArrowLeft } from 'react-icons/fa'

export default function OrderExportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [orders, setOrders] = useState([])
  const [exportFormat, setExportFormat] = useState('csv')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [previewData, setPreviewData] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

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
      
      // Generate preview data
      generatePreviewData(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const generatePreviewData = (ordersData) => {
    // Filter orders based on date range and status
    const filteredOrders = ordersData.filter(order => {
      const orderDate = new Date(order.createdAt)
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      endDate.setHours(23, 59, 59, 999) // Set to end of day
      
      const dateInRange = orderDate >= startDate && orderDate <= endDate
      const statusMatches = statusFilter === 'all' || order.status === statusFilter
      
      return dateInRange && statusMatches
    })
    
    // Take first 5 orders for preview
    setPreviewData(filteredOrders.slice(0, 5))
  }

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFilterChange = () => {
    generatePreviewData(orders)
  }

  const handleExport = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/api/admin/orders/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: exportFormat,
          dateRange,
          statusFilter
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export orders')
      }

      // For CSV/Excel, trigger download
      if (exportFormat === 'csv' || exportFormat === 'excel') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `orders-export-${new Date().toISOString().split('T')[0]}.${exportFormat === 'csv' ? 'csv' : 'xlsx'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // For JSON, just show success message
        const data = await response.json()
        console.log('Export successful:', data)
      }

      setSuccess(`Orders successfully exported to ${exportFormat.toUpperCase()} format!`)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (error) {
      console.error('Error exporting orders:', error)
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
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
          <h2 className="mb-0">Export Orders</h2>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Row className="mb-4">
        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3">
              <h5 className="mb-0">Export Settings</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Export Format</Form.Label>
                  <Form.Select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                    <option value="json">JSON</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Date Range</Form.Label>
                  <div className="d-flex align-items-center">
                    <div className="input-group me-2">
                      <span className="input-group-text">
                        <FaCalendarAlt />
                      </span>
                      <Form.Control
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <span className="input-group-text">
                        <FaCalendarAlt />
                      </span>
                      <Form.Control
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                      />
                    </div>
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Status Filter</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaFilter />
                    </span>
                    <Form.Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Initiated">Initiated</option>
                      <option value="QuoteRequested">Quote Requested</option>
                      <option value="QuoteAccepted">Quote Accepted</option>
                      <option value="InProgress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Paid">Paid</option>
                      <option value="Cancelled">Cancelled</option>
                    </Form.Select>
                  </div>
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    onClick={handleFilterChange}
                    disabled={loading}
                  >
                    <FaFilter className="me-2" /> Apply Filters
                  </Button>
                  <Button 
                    variant="success" 
                    onClick={handleExport}
                    disabled={isGenerating || previewData.length === 0}
                  >
                    {isGenerating ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FaFileExport className="me-2" /> Export Orders
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Data Preview</h5>
                <span className="text-muted">
                  {previewData.length} of {
                    orders.filter(order => {
                      const orderDate = new Date(order.createdAt)
                      const startDate = new Date(dateRange.startDate)
                      const endDate = new Date(dateRange.endDate)
                      endDate.setHours(23, 59, 59, 999)
                      
                      const dateInRange = orderDate >= startDate && orderDate <= endDate
                      const statusMatches = statusFilter === 'all' || order.status === statusFilter
                      
                      return dateInRange && statusMatches
                    }).length
                  } orders shown
                </span>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3">Loading orders...</p>
                </div>
              ) : previewData.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map(order => (
                        <tr key={order.orderId}>
                          <td>{order.orderId.substring(0, 8)}...</td>
                          <td>{order.userEmail}</td>
                          <td>{order.pickupPincode}</td>
                          <td>{order.destinationPincode}</td>
                          <td>{order.status}</td>
                          <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">No orders match your filter criteria</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0">Export Instructions</h5>
        </Card.Header>
        <Card.Body>
          <p>Use this tool to export order data for reporting and analysis purposes. Follow these steps:</p>
          <ol>
            <li>Select your preferred export format (CSV, Excel, or JSON)</li>
            <li>Choose a date range to filter orders by creation date</li>
            <li>Optionally filter by order status</li>
            <li>Click "Apply Filters" to preview the data</li>
            <li>Click "Export Orders" to download the data file</li>
          </ol>
          <Alert variant="info">
            <FaDownload className="me-2" />
            Exported files will contain all order details including customer information, locations, pricing, and vendor details.
          </Alert>
        </Card.Body>
      </Card>
    </AdminLayout>
  )
} 