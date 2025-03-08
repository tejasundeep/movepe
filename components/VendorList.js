'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Button, Row, Col, Alert, Badge } from 'react-bootstrap'
import { BsStarFill, BsStarHalf, BsStar } from 'react-icons/bs'
import { formatCurrency, formatDateTime, getStarRating } from '../lib/utils'
import PriceBreakdownTooltip, { getPricingExplanations } from './PriceBreakdownTooltip'

export default function VendorList({ vendors, orderId, selectedVendors = [], pickupPincode, destinationPincode, quotes = [] }) {
  const [error, setError] = useState('')
  const [loadingVendors, setLoadingVendors] = useState({})
  const [localSelectedVendors, setLocalSelectedVendors] = useState([])
  const [localQuotes, setLocalQuotes] = useState([])
  const requestsInProgress = useRef(new Set())

  // Sync local state with props
  useEffect(() => {
    setLocalSelectedVendors(selectedVendors || [])
    setLocalQuotes(quotes || [])
  }, [selectedVendors, quotes])

  // Filter vendors based on service areas
  const availableVendors = vendors?.filter(vendor => {
    if (!vendor || !vendor.vendorId) return false
    const isAvailable = vendor.availability === 'available'
    const servesPickup = vendor.serviceAreas?.includes(pickupPincode)
    const servesDestination = vendor.serviceAreas?.includes(destinationPincode)
    return isAvailable && (servesPickup || servesDestination)
  }) || []

  const fetchOrderData = useCallback(async () => {
    if (!orderId) {
      console.error('Cannot fetch order data: orderId is missing')
      return null
    }
    
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch order data: ${response.status}`)
      }
      const data = await response.json()
      setLocalSelectedVendors(data.vendorRequests || [])
      setLocalQuotes(data.quotes || [])
      return data
    } catch (error) {
      console.error('Error fetching order data:', error)
      setError(`Failed to refresh order data: ${error.message}`)
      return null
    }
  }, [orderId])

  const handleRequestQuote = async (vendorId) => {
    if (!orderId || !vendorId) {
      setError('Invalid order or vendor ID')
      return
    }

    // Prevent duplicate requests
    if (requestsInProgress.current.has(vendorId)) {
      return
    }
    
    requestsInProgress.current.add(vendorId)
    setError('')
    setLoadingVendors(prev => ({ ...prev, [vendorId]: true }))

    try {
      // Optimistically update UI
      setLocalSelectedVendors(prev => [...new Set([...prev, vendorId])])

      const response = await fetch(`/api/orders/${orderId}/request-quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vendorIds: [vendorId] })
      })

      let orderData;
      try {
        orderData = await response.json()
      } catch (parseError) {
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        throw new Error(orderData.error || `Failed to send quote request: ${response.status}`)
      }

      // Verify the vendor request was saved
      if (!orderData.vendorRequests?.includes(vendorId)) {
        throw new Error('Vendor request was not saved properly')
      }

      // Update local state with server data
      setLocalSelectedVendors(orderData.vendorRequests || [])
      setLocalQuotes(orderData.quotes || [])

      // Update parent component
      window.dispatchEvent(new CustomEvent('orderUpdated', { detail: orderData }))
    } catch (err) {
      console.error('Error requesting quote:', err)
      setError(`Failed to request quote from vendor. ${err.message}`)
      
      // Revert optimistic update
      const orderData = await fetchOrderData()
      if (orderData) {
        setLocalSelectedVendors(orderData.vendorRequests || [])
        setLocalQuotes(orderData.quotes || [])
      } else {
        setLocalSelectedVendors(prev => prev.filter(id => id !== vendorId))
      }
    } finally {
      setLoadingVendors(prev => ({ ...prev, [vendorId]: false }))
      requestsInProgress.current.delete(vendorId)
    }
  }

  const getButtonProps = useCallback((vendor) => {
    if (!vendor?.vendorId) return null

    const vendorQuote = localQuotes.find(quote => quote.vendorId === vendor.vendorId)
    const isRequested = localSelectedVendors.includes(vendor.vendorId)
    const isLoading = loadingVendors[vendor.vendorId]

    if (vendorQuote) {
      return {
        variant: "success",
        disabled: true,
        text: "Quote Received",
        icon: "✓"
      }
    }
    
    if (isRequested) {
      return {
        variant: "info",
        disabled: true,
        text: "Quote Requested",
        icon: "⌛"
      }
    }
    
    if (isLoading) {
      return {
        variant: "primary",
        disabled: true,
        text: "Sending Request...",
        icon: "..."
      }
    }
    
    return {
      variant: "primary",
      disabled: false,
      text: "Request Quote",
      icon: "→"
    }
  }, [localQuotes, localSelectedVendors, loadingVendors])

  const renderStars = (rating) => {
    return getStarRating(rating);
  }

  if (!vendors || !Array.isArray(vendors)) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Error Loading Vendors</Alert.Heading>
        <p>There was a problem loading the vendor list. Please try refreshing the page.</p>
      </Alert>
    )
  }

  if (vendors.length === 0) {
    return (
      <Alert variant="warning">
        <Alert.Heading>No Vendors Found</Alert.Heading>
        <p>We couldn't find any vendors at the moment. Please try again later.</p>
      </Alert>
    )
  }

  if (!availableVendors.length) {
    return (
      <Alert variant="info">
        <Alert.Heading>No Vendors Available</Alert.Heading>
        <p>
          We couldn't find any vendors serving your locations at the moment:
          <br />
          <strong>Pickup:</strong> {pickupPincode || 'Not specified'}
          <br />
          <strong>Destination:</strong> {destinationPincode || 'Not specified'}
        </p>
        <hr />
        <p className="mb-0">
          Please try again later or modify your pickup/destination locations.
        </p>
      </Alert>
    )
  }

  return (
    <div>
      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}
      
      <Row>
        {availableVendors.map(vendor => {
          if (!vendor?.vendorId) return null;
          
          const buttonProps = getButtonProps(vendor)
          if (!buttonProps) return null;
          
          const vendorQuote = localQuotes.find(quote => quote.vendorId === vendor.vendorId)

          return (
            <Col key={vendor.vendorId} md={6} className="mb-4">
              <Card className={`h-100 ${vendorQuote ? 'border-success' : ''}`}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <Card.Title className="mb-1">{vendor.name || 'Unknown Vendor'}</Card.Title>
                      <div className="mb-2">
                        {renderStars(vendor.rating || 0)}
                        <span className="ms-2 text-muted">
                          ({vendor.reviews?.length || 0} reviews)
                        </span>
                      </div>
                    </div>
                    {vendorQuote && (
                      <Badge bg="success">Quote Received</Badge>
                    )}
                    {localSelectedVendors.includes(vendor.vendorId) && !vendorQuote && (
                      <Badge bg="info">Quote Requested</Badge>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-baseline mb-2">
                      <strong>
                        Base Price
                        <PriceBreakdownTooltip 
                          componentName="Base Price" 
                          explanation="Starting price based on vendor tier and location. This is subject to change based on move details."
                        />
                      </strong>
                      <span>{formatCurrency(vendor.basePrice)}</span>
                    </div>
                    {vendorQuote ? (
                      <div className="d-flex justify-content-between align-items-baseline">
                        <strong>
                          Estimated Price
                          <PriceBreakdownTooltip 
                            componentName="Estimated Price" 
                            explanation="Final price quoted by the vendor based on your specific move details. This is the amount you'll pay if you select this vendor."
                          />
                        </strong>
                        <span className="text-success fw-bold">
                          {formatCurrency(vendorQuote.amount)}
                        </span>
                      </div>
                    ) : (
                      <small className="text-muted">
                        {buttonProps.text === "Quote Requested" ? 
                          "Waiting for quote..." : 
                          "Request quote for estimate"}
                      </small>
                    )}
                  </div>

                  {vendor.description && (
                    <p className="mb-3 text-muted">
                      <small>{vendor.description}</small>
                    </p>
                  )}

                  <div className="mb-3">
                    <small className="text-muted">
                      Service Areas: {vendor.serviceAreas?.join(', ') || 'No areas specified'}
                    </small>
                  </div>

                  <Button
                    variant={buttonProps.variant}
                    onClick={() => handleRequestQuote(vendor.vendorId)}
                    disabled={buttonProps.disabled}
                    className="w-100"
                  >
                    {buttonProps.text} {buttonProps.icon}
                  </Button>
                </Card.Body>

                {vendorQuote && (
                  <Card.Footer className="text-muted">
                    <small>
                      Quote received: {formatDateTime(vendorQuote.submittedAt)}
                    </small>
                  </Card.Footer>
                )}
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
} 