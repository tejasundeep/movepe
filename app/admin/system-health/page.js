'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Table, Badge, Spinner, Alert, Button, ProgressBar } from 'react-bootstrap';
import AdminLayout from '../../components/AdminLayout';
import { FaServer, FaDatabase, FaMemory, FaMicrochip, FaClock, FaNetworkWired, FaExclamationTriangle, FaCheck, FaSync } from 'react-icons/fa';

// Cache configuration
const CACHE_KEY = 'admin_system_health_data';
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

export default function SystemHealthPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [cacheStatus, setCacheStatus] = useState({
    isCached: false,
    cachedAt: null
  });
  
  // Fetch system health data with error handling, retry logic, and caching
  const fetchHealthData = useCallback(async (bypassCache = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first if not bypassing
      if (!bypassCache && typeof window !== 'undefined') {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const { data, timestamp } = JSON.parse(cachedData);
            const age = Date.now() - timestamp;
            
            // Use cache if it's fresh
            if (age < CACHE_TTL) {
              setHealthData(data);
              setLastRefreshed(new Date(timestamp));
              setCacheStatus({
                isCached: true,
                cachedAt: new Date(timestamp)
              });
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse cached data:', e);
            // Continue with fetch if cache parsing fails
          }
        }
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch('/api/admin/system-health', {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `Failed to fetch system health data: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validate response data structure
        if (!data || typeof data !== 'object' || !data.system || !data.storage || !data.api) {
          throw new Error('Invalid response format from server');
        }
        
        // Cache the fresh data
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              data,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('Failed to cache health data:', e);
          }
        }
        
        setHealthData(data);
        setLastRefreshed(new Date());
        setCacheStatus({
          isCached: false,
          cachedAt: null
        });
        setRetryCount(0); // Reset retry count on success
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      console.error('Error fetching system health data:', error);
      
      // Try to use cached data even if it's stale when there's an error
      if (typeof window !== 'undefined') {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          try {
            const { data, timestamp } = JSON.parse(cachedData);
            setHealthData(data);
            setLastRefreshed(new Date(timestamp));
            setCacheStatus({
              isCached: true,
              cachedAt: new Date(timestamp)
            });
            setError('Using cached data due to error: ' + error.message);
            setLoading(false);
            return;
          } catch (e) {
            console.warn('Failed to use stale cache as fallback:', e);
          }
        }
      }
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        setError('Request timed out. The server might be under heavy load.');
      } else {
        setError(error.message || 'Failed to fetch system health data');
      }
      
      // Auto-retry logic for certain errors, up to 3 times
      if (retryCount < 3 && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchHealthData(true); // Bypass cache on retry
        }, 3000); // Wait 3 seconds before retry
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);
  
  // Format bytes to human-readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  // Format seconds to human-readable format
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  };
  
  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'healthy':
        return <Badge bg="success"><FaCheck className="me-1" /> Healthy</Badge>;
      case 'warning':
        return <Badge bg="warning"><FaExclamationTriangle className="me-1" /> Warning</Badge>;
      case 'error':
        return <Badge bg="danger"><FaExclamationTriangle className="me-1" /> Error</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };
  
  // Toggle auto-refresh with error handling
  const toggleAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    } else {
      try {
        const interval = setInterval(() => {
          fetchHealthData(true).catch(err => { // Always bypass cache for auto-refresh
            console.error('Auto-refresh error:', err);
            // If we get consistent errors, stop auto-refresh
            if (err.message.includes('Failed to fetch') || err.name === 'AbortError') {
              clearInterval(interval);
              setRefreshInterval(null);
              setError('Auto-refresh stopped due to connection issues. Please try manual refresh.');
            }
          });
        }, 30000); // Refresh every 30 seconds
        setRefreshInterval(interval);
      } catch (error) {
        console.error('Error setting up auto-refresh:', error);
        setError('Failed to set up auto-refresh. Please try again.');
      }
    }
  };
  
  // Load health data on component mount with error handling
  useEffect(() => {
    fetchHealthData().catch(err => {
      console.error('Failed to fetch health data on mount:', err);
      setError('Failed to load system health data. Please try again later.');
      setLoading(false);
    });
    
    // Clean up interval on component unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [fetchHealthData]);
  
  return (
    <AdminLayout>
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>System Health</h2>
          <div>
            <Button 
              variant="outline-primary" 
              className="me-2" 
              onClick={fetchHealthData}
              disabled={loading}
            >
              <FaSync className={loading ? 'spin me-1' : 'me-1'} /> Refresh
            </Button>
            <Button 
              variant={refreshInterval ? 'success' : 'outline-secondary'} 
              onClick={toggleAutoRefresh}
            >
              {refreshInterval ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
            </Button>
          </div>
        </div>
        
        {lastRefreshed && (
          <p className="text-muted mb-4">
            Last refreshed: {lastRefreshed.toLocaleString()}
          </p>
        )}
        
        {error && (
          <Alert variant="danger" className="mb-4">
            <Alert.Heading>Error</Alert.Heading>
            <p>{error}</p>
            <div className="d-flex justify-content-end">
              <Button 
                variant="outline-danger" 
                size="sm" 
                onClick={fetchHealthData}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" />
                    Retrying...
                  </>
                ) : (
                  'Retry'
                )}
              </Button>
            </div>
          </Alert>
        )}
        
        {loading && !healthData ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading system health data...</p>
          </div>
        ) : healthData ? (
          <>
            {/* System Metrics */}
            <Card className="mb-4">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaServer className="me-2" /> System Metrics
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6} lg={3} className="mb-3">
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <h6 className="text-muted mb-2">Platform</h6>
                        <div className="d-flex align-items-center">
                          <FaServer className="me-2 text-primary" size={20} />
                          <span className="fs-5">{healthData.system.platform}</span>
                        </div>
                        <div className="mt-2 small text-muted">
                          Hostname: {healthData.system.hostname}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} lg={3} className="mb-3">
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <h6 className="text-muted mb-2">Uptime</h6>
                        <div className="d-flex align-items-center">
                          <FaClock className="me-2 text-success" size={20} />
                          <span className="fs-5">{formatUptime(healthData.system.uptime)}</span>
                        </div>
                        <div className="mt-2 small text-muted">
                          Node.js: {healthData.system.nodeVersion}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} lg={3} className="mb-3">
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <h6 className="text-muted mb-2">Memory Usage</h6>
                        <div className="d-flex align-items-center mb-2">
                          <FaMemory className="me-2 text-warning" size={20} />
                          <span className="fs-5">{healthData.system.memory.usagePercentage}%</span>
                        </div>
                        <ProgressBar 
                          now={parseFloat(healthData.system.memory.usagePercentage)} 
                          variant={
                            parseFloat(healthData.system.memory.usagePercentage) > 80 ? 'danger' :
                            parseFloat(healthData.system.memory.usagePercentage) > 60 ? 'warning' : 'success'
                          }
                          className="mb-2"
                        />
                        <div className="small text-muted">
                          {formatBytes(healthData.system.memory.used)} / {formatBytes(healthData.system.memory.total)}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} lg={3} className="mb-3">
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <h6 className="text-muted mb-2">CPU Usage</h6>
                        <div className="d-flex align-items-center mb-2">
                          <FaMicrochip className="me-2 text-info" size={20} />
                          <span className="fs-5">{healthData.system.cpu.usagePercentage}%</span>
                        </div>
                        <ProgressBar 
                          now={parseFloat(healthData.system.cpu.usagePercentage)} 
                          variant={
                            parseFloat(healthData.system.cpu.usagePercentage) > 80 ? 'danger' :
                            parseFloat(healthData.system.cpu.usagePercentage) > 60 ? 'warning' : 'success'
                          }
                          className="mb-2"
                        />
                        <div className="small text-muted">
                          {healthData.system.cpu.count} CPU cores, Load Avg: {healthData.system.cpu.loadAverage.toFixed(2)}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
            
            {/* Storage Metrics */}
            <Card className="mb-4">
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaDatabase className="me-2" /> Storage Metrics
                </h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-4">
                  <Col md={6}>
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="mb-0">Storage Status</h6>
                          {getStatusBadge(healthData.storage.status)}
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <div className="me-3">
                            <FaDatabase size={36} className="text-primary" />
                          </div>
                          <div>
                            <div className="fs-5 fw-bold">{healthData.storage.files} Files</div>
                            <div className="text-muted">Total Size: {formatBytes(healthData.storage.totalSize)}</div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                
                <h6 className="mb-3">Storage Files</h6>
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>File Name</th>
                        <th>Size</th>
                        <th>Last Modified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthData.storage.fileStats && healthData.storage.fileStats.map(file => (
                        <tr key={file.name}>
                          <td>{file.name}</td>
                          <td>{formatBytes(file.size)}</td>
                          <td>{new Date(file.lastModified).toLocaleString()}</td>
                        </tr>
                      ))}
                      {(!healthData.storage.fileStats || healthData.storage.fileStats.length === 0) && (
                        <tr>
                          <td colSpan="3" className="text-center">No files found</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
            
            {/* API Metrics */}
            <Card>
              <Card.Header className="bg-white py-3">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaNetworkWired className="me-2" /> API Metrics
                </h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-4">
                  <Col md={4} className="mb-3">
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <h6 className="text-muted mb-2">Total Requests</h6>
                        <div className="fs-3 fw-bold">{healthData.api.totalRequests || 0}</div>
                        {healthData.api.lastUpdated && (
                          <div className="small text-muted mt-2">
                            Last updated: {new Date(healthData.api.lastUpdated).toLocaleString()}
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4} className="mb-3">
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <h6 className="text-muted mb-2">Average Response Time</h6>
                        <div className="fs-3 fw-bold">
                          {healthData.api.responseTime?.average ? 
                            `${healthData.api.responseTime.average.toFixed(2)} ms` : 
                            'N/A'}
                        </div>
                        <div className="small text-muted mt-2">
                          Min: {healthData.api.responseTime?.min || 'N/A'} ms, 
                          Max: {healthData.api.responseTime?.max || 'N/A'} ms
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4} className="mb-3">
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <h6 className="text-muted mb-2">Error Rate</h6>
                        <div className="fs-3 fw-bold">
                          {healthData.api.totalRequests ? 
                            `${((healthData.api.errors?.total || 0) / healthData.api.totalRequests * 100).toFixed(2)}%` : 
                            '0%'}
                        </div>
                        <div className="small text-muted mt-2">
                          Total Errors: {healthData.api.errors?.total || 0}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                
                {healthData.api.endpoints && Object.keys(healthData.api.endpoints).length > 0 && (
                  <>
                    <h6 className="mb-3">Endpoint Statistics</h6>
                    <div className="table-responsive">
                      <Table hover className="mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th>Endpoint</th>
                            <th>Requests</th>
                            <th>Errors</th>
                            <th>Error Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(healthData.api.endpoints).map(([endpoint, stats]) => (
                            <tr key={endpoint}>
                              <td>{endpoint}</td>
                              <td>{stats.requests}</td>
                              <td>{stats.errors}</td>
                              <td>
                                {stats.requests ? 
                                  `${(stats.errors / stats.requests * 100).toFixed(2)}%` : 
                                  '0%'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </>
        ) : null}
        
        {/* Add cache indicator */}
        {cacheStatus.isCached && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-2 mb-4" role="alert">
            <p className="text-sm">
              <span className="font-bold">Using cached data</span> from {cacheStatus.cachedAt.toLocaleTimeString()}. 
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 ms-2" 
                onClick={() => fetchHealthData(true)}
                disabled={loading}
              >
                Refresh now
              </Button>
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 