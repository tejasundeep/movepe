'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Row, Col, Alert, Form, Spinner, Tab, Tabs, Table, Button } from 'react-bootstrap'
import { FaExclamationTriangle, FaClock, FaThermometerHalf, FaSync, FaDownload, FaExclamationCircle } from 'react-icons/fa'

export default function OperationalBottlenecksPage() {
  const [bottleneckData, setBottleneckData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  })
  const [resolution, setResolution] = useState('day')
  const [dateErrors, setDateErrors] = useState({ startDate: null, endDate: null })
  const [dataIsStale, setDataIsStale] = useState(false)
  const autoRefreshTimerRef = useRef(null)
  const dataTimestampRef = useRef(null)
  const [isAbortable, setIsAbortable] = useState(false)
  const abortControllerRef = useRef(null)

  // Validate date range
  const validateDateRange = useCallback(() => {
    const errors = { startDate: null, endDate: null }
    let isValid = true

    // Check start date is valid
    try {
      const startDate = new Date(dateRange.startDate)
      if (isNaN(startDate.getTime())) {
        errors.startDate = 'Invalid date format'
        isValid = false
      }
    } catch (error) {
      errors.startDate = 'Invalid date'
      isValid = false
    }

    // Check end date is valid
    try {
      const endDate = new Date(dateRange.endDate)
      if (isNaN(endDate.getTime())) {
        errors.endDate = 'Invalid date format'
        isValid = false
      }
    } catch (error) {
      errors.endDate = 'Invalid date'
      isValid = false
    }

    // Check if start date is before end date
    if (isValid) {
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      if (startDate > endDate) {
        errors.startDate = 'Start date must be before end date'
        isValid = false
      }
    }

    // Check if date range is too large (more than 1 year)
    if (isValid) {
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      const oneYear = 365 * 24 * 60 * 60 * 1000
      if (endDate - startDate > oneYear) {
        errors.startDate = 'Date range cannot exceed 1 year'
        isValid = false
      }
    }

    setDateErrors(errors)
    return isValid
  }, [dateRange])

  const fetchBottleneckData = useCallback(async () => {
    // Validate date range before fetching
    if (!validateDateRange()) {
      return
    }

    try {
      // Clear existing errors
      setError(null)
      setLoading(true)
      setDataIsStale(false)
      setIsAbortable(true)

      // Create abort controller for the fetch request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      
      const response = await fetch(
        `/api/analytics/operational-bottlenecks?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&resolution=${resolution}`,
        { signal: abortControllerRef.current.signal }
      )
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }
        throw new Error(errorData.error || errorData.message || `Error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Validate the response data structure
      if (!data || !data.timeSeriesData || !data.sortedBottlenecks) {
        throw new Error('Invalid data format received from server')
      }
      
      setBottleneckData(data)
      dataTimestampRef.current = new Date()
      
      // Set up auto-refresh timer for data staleness checking
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current)
      }
      
      autoRefreshTimerRef.current = setInterval(() => {
        if (dataTimestampRef.current) {
          const now = new Date()
          const dataAge = now - dataTimestampRef.current
          const STALE_THRESHOLD = 10 * 60 * 1000 // 10 minutes
          setDataIsStale(dataAge > STALE_THRESHOLD)
        }
      }, 60000) // Check every minute

    } catch (error) {
      // Ignore abort errors, as they are user-initiated
      if (error.name === 'AbortError') {
        console.log('Fetch aborted by user')
        return
      }
      
      console.error('Failed to fetch bottleneck data:', error)
      setError(error.message)
      setBottleneckData(null)
    } finally {
      setLoading(false)
      setIsAbortable(false)
      abortControllerRef.current = null
    }
  }, [dateRange, resolution, validateDateRange])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    fetchBottleneckData()
  }, [fetchBottleneckData])

  const handleDateChange = (e) => {
    const { name, value } = e.target
    setDateRange(prev => ({ ...prev, [name]: value }))
    
    // Clear the corresponding error when user changes the input
    if (dateErrors[name]) {
      setDateErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleResolutionChange = (e) => {
    setResolution(e.target.value)
  }

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setLoading(false)
      setIsAbortable(false)
    }
  }

  // Export data as JSON
  const handleExportData = () => {
    if (!bottleneckData) return
    
    try {
      const dataStr = JSON.stringify(bottleneckData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `bottleneck-analysis-${dateRange.startDate}-to-${dateRange.endDate}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
    } catch (error) {
      console.error('Error exporting data:', error)
      setError('Failed to export data: ' + error.message)
    }
  }

  // Heat Map color generator based on intensity (0-1)
  const getHeatColor = (intensity) => {
    // Color scale from green (low) to yellow (medium) to red (high)
    if (intensity === undefined || intensity === null || Number.isNaN(intensity) || intensity <= 0) {
      return '#e0e0e0' // Gray for no data
    }
    if (intensity < 0.25) return '#a1d99b' // Light green
    if (intensity < 0.5) return '#41ab5d' // Medium green
    if (intensity < 0.75) return '#fdae61' // Yellow
    if (intensity < 0.9) return '#f46d43' // Orange
    return '#d73027' // Red
  }

  // Format time as HH:MM
  const formatHours = (hours) => {
    if (hours === undefined || hours === null || Number.isNaN(hours)) {
      return 'N/A'
    }
    
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  // Render Heat Map
  const renderHeatMap = () => {
    if (!bottleneckData || !bottleneckData.timeSeriesData || 
        !bottleneckData.timeSeriesData.timeBuckets || 
        !bottleneckData.timeSeriesData.data) {
      return (
        <Alert variant="warning">
          <FaExclamationCircle className="me-2" />
          No heat map data available. The analysis may not have found any operational delays.
        </Alert>
      )
    }

    const { timeBuckets, data } = bottleneckData.timeSeriesData
    
    if (!timeBuckets || !Array.isArray(timeBuckets) || timeBuckets.length === 0) {
      return (
        <Alert variant="warning">
          <FaExclamationCircle className="me-2" />
          No time periods available for the selected date range and resolution.
        </Alert>
      )
    }
    
    const stages = Object.keys(data || {})
    
    if (!stages || stages.length === 0) {
      return (
        <Alert variant="warning">
          <FaExclamationCircle className="me-2" />
          No process stages found with delay data.
        </Alert>
      )
    }

    return (
      <div className="heat-map-container">
        <div className="stage-labels">
          <div className="corner-label"></div>
          {stages.map(stage => (
            <div key={stage} className="stage-label">
              {stage}
            </div>
          ))}
        </div>
        
        <div className="heat-map-grid">
          <div className="time-labels">
            {timeBuckets.map(bucket => (
              <div key={bucket.key} className="time-label">
                {bucket.label}
              </div>
            ))}
          </div>
          
          <div className="heat-cells">
            {stages.map(stage => (
              <div key={stage} className="stage-row">
                {timeBuckets.map(bucket => {
                  // Safely access cell data with fallbacks for missing data
                  const stageData = data[stage] || {}
                  const cell = stageData[bucket.key] || { count: 0, totalDelay: 0, intensity: 0 }
                  const intensity = cell ? cell.intensity : 0
                  const avgDelay = cell && cell.count ? (cell.totalDelay / cell.count) : 0
                  
                  return (
                    <div 
                      key={`${stage}-${bucket.key}`} 
                      className="heat-cell"
                      style={{ 
                        backgroundColor: getHeatColor(intensity),
                        cursor: cell && cell.count ? 'pointer' : 'default'
                      }}
                      title={cell && cell.count 
                        ? `${stage} - ${bucket.label}\nAvg delay: ${formatHours(avgDelay)}\nOrders affected: ${cell.count}`
                        : `No data`
                      }
                    >
                      {cell && cell.count > 0 && cell.intensity > 0.5 && (
                        <span className="cell-value">{cell.count}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        
        <div className="heat-map-legend">
          <span>Delay Intensity:</span>
          <div className="legend-gradient">
            <div style={{ backgroundColor: '#a1d99b' }}></div>
            <div style={{ backgroundColor: '#41ab5d' }}></div>
            <div style={{ backgroundColor: '#fdae61' }}></div>
            <div style={{ backgroundColor: '#f46d43' }}></div>
            <div style={{ backgroundColor: '#d73027' }}></div>
          </div>
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    )
  }

  // Render Top Bottlenecks
  const renderTopBottlenecks = () => {
    if (!bottleneckData || !bottleneckData.sortedBottlenecks || !Array.isArray(bottleneckData.sortedBottlenecks)) {
      return (
        <Alert variant="warning">
          <FaExclamationCircle className="me-2" />
          No bottleneck data available. Try adjusting the date range or ensuring there are orders with status transitions.
        </Alert>
      )
    }

    if (bottleneckData.sortedBottlenecks.length === 0) {
      return (
        <Alert variant="success">
          <FaExclamationCircle className="me-2" />
          No significant bottlenecks detected in the selected date range. Operations appear to be running smoothly.
        </Alert>
      )
    }

    return (
      <Card className="mb-4">
        <Card.Header className="d-flex align-items-center">
          <FaExclamationTriangle className="me-2 text-warning" />
          <span>Top Process Bottlenecks</span>
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Process Stage</th>
                <th>Bottleneck Score</th>
                <th>Avg. Delay</th>
              </tr>
            </thead>
            <tbody>
              {bottleneckData.sortedBottlenecks.map(({ stage, score }) => (
                <tr key={stage}>
                  <td>{stage}</td>
                  <td>
                    <div className="progress">
                      <div 
                        className={`progress-bar ${score > 3 ? 'bg-danger' : score > 1.5 ? 'bg-warning' : 'bg-success'}`}
                        style={{ width: `${Math.min(100, score * 20)}%` }}
                      >
                        {score.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td>{formatHours(bottleneckData.averageDelays?.[stage] || 0)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    )
  }

  // Render metadata about the analysis
  const renderAnalysisMetadata = () => {
    if (!bottleneckData || !bottleneckData.metadata) return null;

    return (
      <Card className="mb-4">
        <Card.Header className="d-flex align-items-center">
          <FaClock className="me-2 text-secondary" />
          <span>Analysis Details</span>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <p><strong>Orders Analyzed:</strong> {bottleneckData.metadata.totalOrdersAnalyzed || 0}</p>
              <p><strong>Orders with Transitions:</strong> {bottleneckData.metadata.ordersWithTransitions || 0}</p>
            </Col>
            <Col md={6}>
              <p><strong>Analysis Period:</strong> {bottleneckData.metadata.analysisStartDate ? new Date(bottleneckData.metadata.analysisStartDate).toLocaleDateString() : 'N/A'} to {bottleneckData.metadata.analysisEndDate ? new Date(bottleneckData.metadata.analysisEndDate).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Time Resolution:</strong> {bottleneckData.metadata.resolution || resolution}</p>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    )
  }

  return (
    <div className="operational-bottlenecks-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>Operational Bottleneck Analysis</h1>
          <p className="text-muted">
            Identify and visualize bottlenecks and delays in your operational workflow.
          </p>
        </div>
        {bottleneckData && (
          <Button 
            variant="outline-secondary" 
            onClick={handleExportData}
            className="d-flex align-items-center"
          >
            <FaDownload className="me-2" />
            Export Data
          </Button>
        )}
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={(e) => { e.preventDefault(); fetchBottleneckData(); }}>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateChange}
                    isInvalid={!!dateErrors.startDate}
                    max={dateRange.endDate}
                  />
                  <Form.Control.Feedback type="invalid">
                    {dateErrors.startDate}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateChange}
                    isInvalid={!!dateErrors.endDate}
                    min={dateRange.startDate}
                    max={new Date().toISOString().split('T')[0]} // Today
                  />
                  <Form.Control.Feedback type="invalid">
                    {dateErrors.endDate}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Time Resolution</Form.Label>
                  <Form.Select
                    name="resolution"
                    value={resolution}
                    onChange={handleResolutionChange}
                  >
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="hour">Hourly</option>
                  </Form.Select>
                  <Form.Text muted>
                    Note: Hourly resolution is limited to smaller date ranges
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex justify-content-end gap-2">
              {isAbortable ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleCancelRequest}
                >
                  Cancel Request
                </Button>
              ) : null}
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !!dateErrors.startDate || !!dateErrors.endDate}
              >
                {loading ? (
                  <>
                    <Spinner as="span" size="sm" animation="border" className="me-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FaSync className={`me-2 ${dataIsStale ? 'text-warning' : ''}`} />
                    Update Analysis
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {dataIsStale && (
        <Alert variant="warning" className="mb-4">
          <FaExclamationCircle className="me-2" />
          This data is more than 10 minutes old. Consider refreshing for the latest analysis.
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="mb-4">
          <FaExclamationCircle className="me-2" />
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
          <p className="mt-2">Analyzing operational data...</p>
          <p className="text-muted small">This may take a moment for large date ranges</p>
        </div>
      ) : (
        <div>
          {renderAnalysisMetadata()}
          
          <Row>
            <Col md={12}>
              {renderTopBottlenecks()}
            </Col>
          </Row>
          
          <Card className="mb-4">
            <Card.Header className="d-flex align-items-center">
              <FaThermometerHalf className="me-2 text-danger" />
              <span>Operational Delay Heat Map</span>
            </Card.Header>
            <Card.Body>
              <p className="text-muted">
                This heat map visualizes operational delays across different stages of the moving process over time.
                Darker red areas indicate more significant bottlenecks that require attention.
              </p>
              {renderHeatMap()}
            </Card.Body>
          </Card>
          
          {bottleneckData && bottleneckData.sortedBottlenecks && bottleneckData.sortedBottlenecks.length > 0 && (
            <Card className="mb-4">
              <Card.Header className="d-flex align-items-center">
                <FaClock className="me-2 text-info" />
                <span>Recommended Actions</span>
              </Card.Header>
              <Card.Body>
                <Alert variant="info">
                  <h5>Process Improvement Opportunities</h5>
                  <p>Based on the analysis, consider addressing these key bottlenecks:</p>
                  <ul>
                    {bottleneckData.sortedBottlenecks.slice(0, 3).map(({ stage, score }) => (
                      <li key={stage}>
                        <strong>{stage} stage</strong>: 
                        {score > 3 
                          ? ' Critical bottleneck requiring immediate process review and resource allocation.' 
                          : score > 1.5 
                            ? ' Significant delays detected. Consider optimizing workflows or adding resources.' 
                            : ' Minor delays detected. Monitor for trends and optimize where possible.'}
                      </li>
                    ))}
                  </ul>
                </Alert>
              </Card.Body>
            </Card>
          )}
        </div>
      )}

      <style jsx global>{`
        .heat-map-container {
          margin-top: 2rem;
          overflow-x: auto;
        }
        
        .stage-labels {
          display: flex;
          margin-left: 100px;
        }
        
        .stage-label {
          flex: 1;
          text-align: center;
          font-weight: bold;
          padding: 0.5rem;
          transform: rotate(-45deg);
          transform-origin: left bottom;
          white-space: nowrap;
          height: 80px;
        }
        
        .corner-label {
          width: 100px;
        }
        
        .heat-map-grid {
          display: flex;
        }
        
        .time-labels {
          width: 100px;
        }
        
        .time-label {
          height: 30px;
          padding: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.8rem;
        }
        
        .heat-cells {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .stage-row {
          display: flex;
          height: 30px;
        }
        
        .heat-cell {
          flex: 1;
          margin: 1px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.7rem;
          font-weight: bold;
          min-width: 30px;
          position: relative;
        }
        
        .cell-value {
          text-shadow: 0px 0px 2px rgba(0,0,0,0.8);
        }
        
        .heat-map-legend {
          margin-top: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .legend-gradient {
          display: flex;
          width: 200px;
          height: 20px;
        }
        
        .legend-gradient div {
          flex: 1;
        }

        @media (max-width: 768px) {
          .stage-label {
            font-size: 0.7rem;
          }
          
          .time-label {
            font-size: 0.7rem;
          }
          
          .heat-cell {
            min-width: 20px;
          }
        }
      `}</style>
    </div>
  )
} 