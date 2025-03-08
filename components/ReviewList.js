'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Spinner, Alert, Pagination, Form, Row, Col, Dropdown } from 'react-bootstrap'
import { formatDateTime, getStarRating } from '../lib/utils'

export default function ReviewList({ vendorId, refreshTrigger }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReviews, setTotalReviews] = useState(0)
  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState(null)
  const reviewsPerPage = 5
  
  // Filter states
  const [minRating, setMinRating] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [vendorId, currentPage, refreshTrigger, minRating, sortBy, sortOrder])

  const fetchReviews = async () => {
    if (!vendorId) return

    setLoading(true)
    setError('')

    try {
      // Build query parameters
      const params = new URLSearchParams({
        vendorId,
        page: currentPage,
        limit: reviewsPerPage,
        stats: 'true'
      })
      
      // Add filter parameters if set
      if (minRating) params.append('minRating', minRating)
      if (sortBy) params.append('sortBy', sortBy)
      if (sortOrder) params.append('sortOrder', sortOrder)
      
      const response = await fetch(`/api/reviews?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch reviews')
      }

      const data = await response.json()
      setReviews(data.reviews || [])
      setTotalPages(Math.ceil(data.total / reviewsPerPage) || 1)
      setTotalReviews(data.total || 0)
      
      if (data.stats) {
        setStats(data.stats)
      }
      
      // Fetch trends separately to avoid loading delay
      if (currentPage === 1) {
        fetchTrends()
      }
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setError('Failed to load reviews. Please try again later.')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchTrends = async () => {
    if (!vendorId) return
    
    try {
      // Reuse existing query parameters and add trends parameter
      const params = new URLSearchParams({
        vendorId,
        trends: 'true',
        timeframe: 'monthly'
      })
      
      const response = await fetch(`/api/reviews?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.trends) {
          setTrends(data.trends)
        }
      }
    } catch (err) {
      console.error('Error fetching review trends:', err)
      // Don't set error state here to avoid disrupting the main review display
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }
  
  const handleFilterChange = () => {
    setCurrentPage(1) // Reset to first page when filters change
  }
  
  const handleRatingFilterChange = (rating) => {
    setMinRating(rating)
    handleFilterChange()
  }
  
  const handleSortChange = (sortOption) => {
    const [newSortBy, newSortOrder] = sortOption.split('-')
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    handleFilterChange()
  }
  
  const toggleFilters = () => {
    setShowFilters(!showFilters)
  }
  
  const clearFilters = () => {
    setMinRating('')
    setSortBy('createdAt')
    setSortOrder('desc')
    handleFilterChange()
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    let items = []
    const maxPagesToShow = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }

    // First page
    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      )
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="ellipsis1" />)
      }
    }

    // Page numbers
    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <Pagination.Item 
          key={page} 
          active={page === currentPage}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      )
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis2" />)
      }
      items.push(
        <Pagination.Item 
          key={totalPages} 
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      )
    }

    return (
      <Pagination className="justify-content-center mt-3">
        <Pagination.Prev 
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        />
        {items}
        <Pagination.Next 
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        />
      </Pagination>
    )
  }
  
  const renderStats = () => {
    if (!stats) return null
    
    return (
      <Card className="mb-3">
        <Card.Body>
          <h5>Rating Summary</h5>
          <div className="d-flex align-items-center mb-2">
            <div className="me-2">
              {getStarRating(stats.averageRating)}
            </div>
            <strong>{stats.averageRating.toFixed(1)}</strong>
            <span className="ms-2 text-muted">({stats.reviewCount} reviews)</span>
          </div>
          
          {Object.entries(stats.ratingDistribution)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([rating, count]) => (
              <div key={rating} className="d-flex align-items-center mb-1">
                <div style={{ width: '60px' }}>{rating} stars</div>
                <div className="progress flex-grow-1" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar bg-warning" 
                    role="progressbar" 
                    style={{ 
                      width: `${stats.reviewCount ? (count / stats.reviewCount) * 100 : 0}%` 
                    }}
                    aria-valuenow={count} 
                    aria-valuemin="0" 
                    aria-valuemax={stats.reviewCount}
                  ></div>
                </div>
                <div className="ms-2" style={{ width: '30px' }}>{count}</div>
              </div>
            ))
          }
        </Card.Body>
      </Card>
    )
  }
  
  const renderFilters = () => {
    return (
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={toggleFilters}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          
          <div className="d-flex align-items-center">
            <small className="text-muted me-2">
              {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
            </small>
            
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm" id="sort-dropdown">
                Sort: {getSortLabel()}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item 
                  active={sortBy === 'createdAt' && sortOrder === 'desc'}
                  onClick={() => handleSortChange('createdAt-desc')}
                >
                  Newest First
                </Dropdown.Item>
                <Dropdown.Item 
                  active={sortBy === 'createdAt' && sortOrder === 'asc'}
                  onClick={() => handleSortChange('createdAt-asc')}
                >
                  Oldest First
                </Dropdown.Item>
                <Dropdown.Item 
                  active={sortBy === 'rating' && sortOrder === 'desc'}
                  onClick={() => handleSortChange('rating-desc')}
                >
                  Highest Rating
                </Dropdown.Item>
                <Dropdown.Item 
                  active={sortBy === 'rating' && sortOrder === 'asc'}
                  onClick={() => handleSortChange('rating-asc')}
                >
                  Lowest Rating
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
        
        {showFilters && (
          <Card className="mb-3">
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Minimum Rating</Form.Label>
                    <Form.Select 
                      value={minRating} 
                      onChange={(e) => handleRatingFilterChange(e.target.value)}
                    >
                      <option value="">All Ratings</option>
                      <option value="5">5 Stars</option>
                      <option value="4">4+ Stars</option>
                      <option value="3">3+ Stars</option>
                      <option value="2">2+ Stars</option>
                      <option value="1">1+ Star</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </Card.Body>
          </Card>
        )}
      </div>
    )
  }
  
  const getSortLabel = () => {
    if (sortBy === 'createdAt' && sortOrder === 'desc') return 'Newest'
    if (sortBy === 'createdAt' && sortOrder === 'asc') return 'Oldest'
    if (sortBy === 'rating' && sortOrder === 'desc') return 'Highest'
    if (sortBy === 'rating' && sortOrder === 'asc') return 'Lowest'
    return 'Newest'
  }

  if (loading && reviews.length === 0) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading reviews...</span>
        </Spinner>
      </div>
    )
  }

  if (error && reviews.length === 0) {
    return <Alert variant="danger">{error}</Alert>
  }

  if (reviews.length === 0) {
    return (
      <Card className="my-3">
        <Card.Body className="text-center">
          <p className="mb-0">No reviews yet for this vendor.</p>
        </Card.Body>
      </Card>
    )
  }

  return (
    <div className="review-list">
      <h3 className="mb-3">Customer Reviews</h3>
      
      {renderStats()}
      {renderFilters()}
      
      {reviews.map((review) => (
        <Card key={review.id || review.reviewId} className="mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div className="d-flex align-items-center">
                  <div className="me-2">
                    {getStarRating(review.rating)}
                  </div>
                  <strong>{review.rating.toFixed(1)}</strong>
                </div>
                <div className="text-muted small">
                  {review.userName || 'Anonymous'} • {formatDateTime(review.createdAt)}
                  {review.updatedAt && review.updatedAt !== review.createdAt && 
                    ` • Edited: ${formatDateTime(review.updatedAt)}`}
                </div>
              </div>
              {review.orderDetails && (
                <div className="text-muted small">
                  Order #{review.orderDetails.orderNumber || review.orderId}
                </div>
              )}
            </div>
            
            <p className="mb-0">{review.comment || 'No comment provided.'}</p>
            
            {/* Vendor Response */}
            {review.vendorResponse && (
              <div className="mt-3 border-top pt-3">
                <div className="d-flex align-items-center mb-2">
                  <strong className="text-primary">Vendor Response</strong>
                  <span className="ms-2 text-muted small">
                    {formatDateTime(review.vendorResponse.createdAt)}
                  </span>
                </div>
                <p className="mb-0 fst-italic">{review.vendorResponse.text}</p>
              </div>
            )}
          </Card.Body>
        </Card>
      ))}
      
      {renderPagination()}
    </div>
  )
} 