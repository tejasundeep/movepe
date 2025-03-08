'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Form, Button, Row, Col, Badge, Pagination, Spinner, Alert } from 'react-bootstrap';
import AdminLayout from '../../components/AdminLayout';
import { FaSearch, FaFilter, FaDownload, FaTrash, FaEdit, FaPlus, FaUserCog } from 'react-icons/fa';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 0,
    totalLogs: 0
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    adminEmail: '',
    entityType: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  
  // Entity type options for filter
  const entityTypes = [
    { value: '', label: 'All Entities' },
    { value: 'user', label: 'Users' },
    { value: 'vendor', label: 'Vendors' },
    { value: 'order', label: 'Orders' },
    { value: 'setting', label: 'Settings' },
    { value: 'notification', label: 'Notifications' }
  ];
  
  // Action type options for filter
  const actionTypes = [
    { value: '', label: 'All Actions' },
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'view', label: 'View' }
  ];
  
  const [isExporting, setIsExporting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  
  // Check online status and set up listeners
  useEffect(() => {
    // Set initial online status
    setIsOffline(!navigator.onLine);
    
    // Add event listeners for online/offline status
    const handleOnline = () => {
      setIsOffline(false);
      // Retry pending requests when back online
      if (pendingRequests.length > 0) {
        const request = pendingRequests[0];
        fetchLogs(request.page, request.filters)
          .then(() => {
            setPendingRequests(prev => prev.slice(1));
          });
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingRequests]);
  
  // Fetch audit logs with debounce and offline handling
  const fetchLogs = useCallback(async (page = 1, customFilters = null) => {
    // If offline, queue the request for later
    if (!navigator.onLine) {
      setPendingRequests(prev => [...prev, { page, filters: customFilters || filters }]);
      setError('You are currently offline. The request will be processed when you are back online.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Use provided filters or current state
      const filtersToUse = customFilters || filters;
      
      // Build query string from filters
      const queryParams = new URLSearchParams({
        page,
        limit: pagination.limit
      });
      
      // Add filters to query params if they exist
      if (filtersToUse.adminEmail) queryParams.append('adminEmail', filtersToUse.adminEmail);
      if (filtersToUse.entityType) queryParams.append('entityType', filtersToUse.entityType);
      if (filtersToUse.action) queryParams.append('action', filtersToUse.action);
      if (filtersToUse.startDate) queryParams.append('startDate', filtersToUse.startDate);
      if (filtersToUse.endDate) queryParams.append('endDate', filtersToUse.endDate);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch audit logs: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validate response data structure
        if (!data || !Array.isArray(data.logs)) {
          throw new Error('Invalid response format from server');
        }
        
        setLogs(data.logs);
        setPagination({
          ...pagination,
          page: data.pagination.page,
          totalPages: data.pagination.totalPages,
          totalLogs: data.pagination.totalLogs
        });
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle specific error types
        if (error.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else if (!navigator.onLine) {
          setError('You are currently offline. Please check your internet connection and try again.');
          setIsOffline(true);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setError(error.message || 'Failed to fetch audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);
  
  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };
  
  // Handle filter submit with offline check
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    if (!navigator.onLine) {
      setError('You are currently offline. Please check your internet connection and try again.');
      return;
    }
    fetchLogs(1); // Reset to first page when applying filters
  };
  
  // Handle page change
  const handlePageChange = (page) => {
    fetchLogs(page);
  };
  
  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      adminEmail: '',
      entityType: '',
      action: '',
      startDate: '',
      endDate: ''
    });
    fetchLogs(1);
  };
  
  // Handle export CSV with error handling
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      
      // If there are a lot of logs, warn the user
      if (pagination.totalLogs > 1000) {
        if (!window.confirm(`You are about to export ${pagination.totalLogs} logs, which may take some time. Continue?`)) {
          setIsExporting(false);
          return;
        }
      }
      
      // Convert logs to CSV format
      const headers = ['ID', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Timestamp'];
      const csvContent = [
        headers.join(','),
        ...logs.map(log => [
          log.id || '',
          (log.adminEmail || '').replace(/,/g, ' '), // Replace commas to avoid CSV issues
          (log.action || '').replace(/,/g, ' '),
          (log.entityType || '').replace(/,/g, ' '),
          (log.entityId || '').replace(/,/g, ' '),
          log.timestamp || ''
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert(`Failed to export CSV: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Get badge variant based on action
  const getActionBadgeVariant = (action) => {
    if (action.includes('create')) return 'success';
    if (action.includes('update')) return 'primary';
    if (action.includes('delete')) return 'danger';
    if (action.includes('view')) return 'info';
    return 'secondary';
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Load logs on component mount with error handling
  useEffect(() => {
    fetchLogs().catch(err => {
      console.error('Failed to fetch logs on mount:', err);
      setError('Failed to load audit logs. Please try again later.');
      setLoading(false);
    });
    
    // Clean up any pending operations on unmount
    return () => {
      // Any cleanup needed
    };
  }, [fetchLogs]);
  
  // Generate pagination items
  const paginationItems = [];
  for (let i = 1; i <= pagination.totalPages; i++) {
    paginationItems.push(
      <Pagination.Item 
        key={i} 
        active={i === pagination.page}
        onClick={() => handlePageChange(i)}
      >
        {i}
      </Pagination.Item>
    );
  }
  
  // Add offline banner
  {isOffline && (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
      <p className="font-bold">You are offline</p>
      <p>Some features may be limited until you reconnect to the internet.</p>
    </div>
  )}
  
  return (
    <AdminLayout>
      <div className="mb-4">
        <h2 className="mb-4">Audit Logs</h2>
        
        <Card className="mb-4">
          <Card.Header className="bg-white py-3">
            <h5 className="mb-0">Filters</h5>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleFilterSubmit}>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Admin Email</Form.Label>
                    <Form.Control
                      type="text"
                      name="adminEmail"
                      value={filters.adminEmail}
                      onChange={handleFilterChange}
                      placeholder="Filter by admin email"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Entity Type</Form.Label>
                    <Form.Select
                      name="entityType"
                      value={filters.entityType}
                      onChange={handleFilterChange}
                    >
                      {entityTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Action</Form.Label>
                    <Form.Select
                      name="action"
                      value={filters.action}
                      onChange={handleFilterChange}
                    >
                      {actionTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={filters.startDate}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={filters.endDate}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <div className="d-flex gap-2">
                    <Button type="submit" variant="primary">
                      <FaSearch className="me-1" /> Apply Filters
                    </Button>
                    <Button variant="outline-secondary" onClick={handleClearFilters}>
                      Clear
                    </Button>
                    <Button variant="success" onClick={handleExportCSV} disabled={isExporting || logs.length === 0}>
                      {isExporting ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <FaDownload className="me-1" /> Export CSV
                        </>
                      )}
                    </Button>
                  </div>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
        
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        
        <Card>
          <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Audit Log Entries</h5>
            <span className="text-muted">
              Total: {pagination.totalLogs} entries
            </span>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading audit logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-5">
                <p className="mb-0">No audit logs found matching the criteria.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Admin</th>
                      <th>Action</th>
                      <th>Entity Type</th>
                      <th>Entity ID</th>
                      <th>Timestamp</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <FaUserCog className="me-2 text-secondary" />
                            {log.adminEmail}
                          </div>
                        </td>
                        <td>
                          <Badge bg={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="text-capitalize">{log.entityType}</td>
                        <td>
                          <code>{log.entityId.substring(0, 8)}...</code>
                        </td>
                        <td>{formatTimestamp(log.timestamp)}</td>
                        <td>
                          <Button 
                            variant="link" 
                            size="sm"
                            onClick={() => alert(JSON.stringify(log.details, null, 2))}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
          {pagination.totalPages > 1 && (
            <Card.Footer className="bg-white d-flex justify-content-center">
              <Pagination>
                <Pagination.First 
                  onClick={() => handlePageChange(1)} 
                  disabled={pagination.page === 1}
                />
                <Pagination.Prev 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                />
                {paginationItems}
                <Pagination.Next 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                />
                <Pagination.Last 
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                />
              </Pagination>
            </Card.Footer>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
} 