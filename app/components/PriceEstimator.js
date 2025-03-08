'use client';

import { useState, useEffect } from 'react';
import { Form, Button, Card, Spinner, Alert } from 'react-bootstrap';
import { formatCurrency } from '../../lib/utils';

/**
 * PriceEstimator component
 * Allows users to get a quick estimate for their move
 */
export default function PriceEstimator({ onEstimateGenerated }) {
  const [fromZip, setFromZip] = useState('');
  const [toZip, setToZip] = useState('');
  const [moveSize, setMoveSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [availableSizes, setAvailableSizes] = useState([]);

  // Fetch available move sizes on component mount
  useEffect(() => {
    async function fetchPricingFactors() {
      try {
        const response = await fetch('/api/pricing');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.moveSizes) {
            setAvailableSizes(data.data.moveSizes);
          }
        }
      } catch (error) {
        console.error('Error fetching pricing factors:', error);
      }
    }

    fetchPricingFactors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!fromZip || !toZip || !moveSize) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    setEstimate(null);
    
    try {
      const response = await fetch('/api/pricing/quick-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromZip,
          toZip,
          moveSize
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate estimate');
      }
      
      if (data.success && data.data) {
        setEstimate(data.data);
        
        // Call the callback if provided
        if (onEstimateGenerated) {
          onEstimateGenerated(data.data);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating estimate:', error);
      setError(error.message || 'Failed to generate estimate');
    } finally {
      setLoading(false);
    }
  };

  const handleGetDetailedEstimate = () => {
    // Navigate to detailed estimate page or open modal
    window.location.href = `/quote?from=${fromZip}&to=${toZip}&size=${moveSize}`;
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Get a Moving Cost Estimate</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Pickup Pincode</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter pickup pincode"
              value={fromZip}
              onChange={(e) => setFromZip(e.target.value)}
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Destination Pincode</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter destination pincode"
              value={toZip}
              onChange={(e) => setToZip(e.target.value)}
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Home Size</Form.Label>
            <Form.Select
              value={moveSize}
              onChange={(e) => setMoveSize(e.target.value)}
              required
            >
              <option value="">Select home size</option>
              {availableSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          
          <Button 
            type="submit" 
            variant="primary" 
            className="w-100 mb-3"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Calculating...
              </>
            ) : 'Get Estimate'}
          </Button>
        </Form>
        
        {estimate && (
          <div className="mt-4">
            <Alert variant="success">
              <h5 className="mb-2">Estimated Cost: {formatCurrency(estimate.estimatedCost)}</h5>
              <p className="mb-1">Distance: {estimate.distance} km</p>
              <p className="mb-0">{estimate.description}</p>
            </Alert>
            
            <Button 
              variant="outline-primary" 
              className="w-100 mt-2"
              onClick={handleGetDetailedEstimate}
            >
              Get Detailed Estimate
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
} 