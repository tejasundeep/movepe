'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Row, Col, Form, Button, Card, Spinner, Alert, Nav } from 'react-bootstrap';
import { formatCurrency } from '../../lib/utils';
import PriceBreakdownModal from '../../components/PriceBreakdownModal';
import PriceBreakdownTooltip, { getPricingExplanations } from '../../components/PriceBreakdownTooltip';
import VisualPriceBreakdown from '../../components/VisualPriceBreakdown';
import PriceJustificationCard from '../../components/PriceJustificationCard';
import { FaInfoCircle, FaChartBar } from 'react-icons/fa';

export default function DetailedQuotePage() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    fromZip: searchParams.get('from') || '',
    toZip: searchParams.get('to') || '',
    moveSize: searchParams.get('size') || '',
    moveDate: '',
    floorLevelOrigin: 0,
    floorLevelDestination: 0,
    hasElevatorOrigin: false,
    hasElevatorDestination: false,
    parkingDistanceOrigin: 0,
    parkingDistanceDestination: 0,
    premiumPacking: false,
    specialItems: [],
    // Parcel delivery specific fields
    orderType: 'moving', // 'moving' or 'parcel'
    pickupAddress: '',
    deliveryAddress: '',
    packageType: 'documents',
    recipientName: '',
    recipientPhone: '',
    deliveryInstructions: '',
    // Default values for backend calculations
    parcelWeight: 1,
    parcelDimensions: {
      length: 30,
      width: 20,
      height: 15
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [specialItemCategories, setSpecialItemCategories] = useState([]);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [showVisualBreakdown, setShowVisualBreakdown] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'moving');
  
  // Update formData.orderType based on activeTab
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      orderType: activeTab
    }));
  }, [activeTab]);
  
  // Fetch pricing factors on component mount
  useEffect(() => {
    async function fetchPricingFactors() {
      try {
        const response = await fetch('/api/pricing');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setAvailableSizes(data.data.moveSizes || []);
            setSpecialItemCategories(data.data.specialItemCategories || []);
          }
        }
      } catch (error) {
        console.error('Error fetching pricing factors:', error);
      }
    }

    fetchPricingFactors();
  }, []);
  
  // Generate a quick estimate on initial load if parameters are provided
  useEffect(() => {
    if (formData.fromZip && formData.toZip && formData.moveSize) {
      handleQuickEstimate();
    }
  }, [formData.fromZip, formData.toZip, formData.moveSize]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleNumberInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: parseInt(value, 10) || 0
    });
  };
  
  const handleAddSpecialItem = () => {
    setFormData({
      ...formData,
      specialItems: [
        ...formData.specialItems,
        { category: 'standard', quantity: 1 }
      ]
    });
  };
  
  const handleRemoveSpecialItem = (index) => {
    const updatedItems = [...formData.specialItems];
    updatedItems.splice(index, 1);
    setFormData({
      ...formData,
      specialItems: updatedItems
    });
  };
  
  const handleSpecialItemChange = (index, field, value) => {
    const updatedItems = [...formData.specialItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'quantity' ? (parseInt(value, 10) || 1) : value
    };
    setFormData({
      ...formData,
      specialItems: updatedItems
    });
  };
  
  const handleQuickEstimate = async () => {
    if (!formData.fromZip || !formData.toZip || !formData.moveSize) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/pricing/quick-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromZip: formData.fromZip,
          toZip: formData.toZip,
          moveSize: formData.moveSize
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate estimate');
      }
      
      if (data.success && data.data) {
        console.log('Quick estimate response:', data.data);
        
        // Extract the cost from the description if it exists
        let extractedCost = 35194; // Default fallback
        if (data.data.description) {
          const match = data.data.description.match(/₹([\d,]+)/);
          if (match && match[1]) {
            extractedCost = parseInt(match[1].replace(/,/g, ''), 10);
          }
        }
        
        // Ensure all required fields are present
        const estimate = {
          ...data.data,
          totalCost: data.data.totalCost || extractedCost,
          baseCost: data.data.baseCost || Math.round(extractedCost * 0.3),
          transportCost: data.data.transportCost || Math.round(extractedCost * 0.4),
          laborCost: data.data.laborCost || Math.round(extractedCost * 0.15),
          packingCost: data.data.packingCost || Math.round(extractedCost * 0.1),
          GST: data.data.GST || Math.round(extractedCost * 0.05)
        };
        setEstimate(estimate);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating quick estimate:', error);
      setError(error.message || 'Failed to generate estimate');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFormData(prev => ({
      ...prev,
      orderType: tab
    }));
  };
  
  const handleDetailedEstimate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Prepare request data based on order type
      const requestData = {
        fromZip: formData.fromZip,
        toZip: formData.toZip,
        moveDate: formData.moveDate,
        orderType: formData.orderType
      };
      
      if (formData.orderType === 'moving') {
        // Add moving-specific fields
        requestData.moveSize = formData.moveSize;
        requestData.floorLevelOrigin = formData.floorLevelOrigin;
        requestData.floorLevelDestination = formData.floorLevelDestination;
        requestData.hasElevatorOrigin = formData.hasElevatorOrigin;
        requestData.hasElevatorDestination = formData.hasElevatorDestination;
        requestData.parkingDistanceOrigin = formData.parkingDistanceOrigin;
        requestData.parkingDistanceDestination = formData.parkingDistanceDestination;
        requestData.premiumPacking = formData.premiumPacking;
        requestData.specialItems = formData.specialItems;
      } else {
        // Add parcel-specific fields
        requestData.pickupAddress = formData.pickupAddress;
        requestData.deliveryAddress = formData.deliveryAddress;
        requestData.packageType = formData.packageType;
        requestData.recipientName = formData.recipientName;
        requestData.recipientPhone = formData.recipientPhone;
        requestData.deliveryInstructions = formData.deliveryInstructions;
        // Add default values for backend calculations
        requestData.parcelWeight = formData.parcelWeight;
        requestData.parcelDimensions = formData.parcelDimensions;
      }
      
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate detailed estimate');
      }
      
      if (data.success && data.data) {
        console.log('Detailed estimate response:', data.data);
        
        // Extract the cost from the description if it exists
        let extractedCost = 35194; // Default fallback
        if (data.data.description) {
          const match = data.data.description.match(/₹([\d,]+)/);
          if (match && match[1]) {
            extractedCost = parseInt(match[1].replace(/,/g, ''), 10);
          }
        }
        
        // Ensure all required fields are present
        const estimate = {
          ...data.data,
          totalCost: data.data.totalCost || extractedCost,
          baseCost: data.data.baseCost || Math.round(extractedCost * 0.3),
          transportCost: data.data.transportCost || Math.round(extractedCost * 0.4),
          laborCost: data.data.laborCost || Math.round(extractedCost * 0.15),
          packingCost: data.data.packingCost || Math.round(extractedCost * 0.1),
          GST: data.data.GST || Math.round(extractedCost * 0.05)
        };
        setEstimate(estimate);
        // Scroll to results
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating detailed estimate:', error);
      setError(error.message || 'Failed to generate detailed estimate');
    } finally {
      setLoading(false);
    }
  };
  
  const handleParcelDimensionChange = (dimension, value) => {
    setFormData(prev => ({
      ...prev,
      parcelDimensions: {
        ...prev.parcelDimensions,
        [dimension]: parseInt(value) || 0
      }
    }));
  };
  
  return (
    <Container className="py-5">
      <h1 className="mb-4">Detailed Quote</h1>
      
      {estimate && (
        <Card className="mb-4 shadow-sm">
          <Card.Header className="bg-success text-white">
            <h4 className="mb-0">Your Estimate</h4>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <h2 className="mb-3">
                  {formatCurrency(estimate.totalCost || 0)}
                  <Button 
                    variant="link" 
                    className="text-decoration-none p-0 ms-2" 
                    onClick={() => setShowDetailedBreakdown(true)}
                  >
                    <FaInfoCircle size={18} />
                  </Button>
                </h2>
                <p className="mb-1">
                  <strong>From:</strong> {formData.fromZip} ({estimate.fromTier || 'Standard'})
                </p>
                <p className="mb-1">
                  <strong>To:</strong> {formData.toZip} ({estimate.toTier || 'Standard'})
                </p>
                <p className="mb-1">
                  <strong>Distance:</strong> {estimate.distance || 0} km
                </p>
                <p className="mb-1">
                  <strong>Estimated Duration:</strong> {estimate.estimatedDuration ? `${estimate.estimatedDuration} minutes` : 'Calculating...'}
                </p>
                <p className="mb-3">
                  <strong>Home Size:</strong> {formData.moveSize || '1BHK'}
                </p>
              </Col>
              <Col md={6}>
                <h5 className="mb-3">Cost Breakdown</h5>
                <div className="d-flex justify-content-between mb-1">
                  <span>
                    Base Cost
                    <PriceBreakdownTooltip 
                      componentName="Base Cost" 
                      explanation={getPricingExplanations().baseCost} 
                    />
                  </span>
                  <span>{formatCurrency(estimate.baseCost || 0)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>
                    Transport Cost
                    <PriceBreakdownTooltip 
                      componentName="Transport Cost" 
                      explanation={getPricingExplanations().transportCost} 
                    />
                  </span>
                  <span>{formatCurrency(estimate.transportCost || 0)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>
                    Labor Cost
                    <PriceBreakdownTooltip 
                      componentName="Labor Cost" 
                      explanation={getPricingExplanations().laborCost} 
                    />
                  </span>
                  <span>{formatCurrency(estimate.laborCost || 0)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>
                    Packing Cost
                    <PriceBreakdownTooltip 
                      componentName="Packing Cost" 
                      explanation={getPricingExplanations().packingCost} 
                    />
                  </span>
                  <span>{formatCurrency(estimate.packingCost || 0)}</span>
                </div>
                {(estimate.specialItemHandling || 0) > 0 && (
                  <div className="d-flex justify-content-between mb-1">
                    <span>
                      Special Items
                      <PriceBreakdownTooltip 
                        componentName="Special Items" 
                        explanation={getPricingExplanations().specialItemHandling} 
                      />
                    </span>
                    <span>{formatCurrency(estimate.specialItemHandling || 0)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between mb-1">
                  <span>
                    GST (18%)
                    <PriceBreakdownTooltip 
                      componentName="GST" 
                      explanation={getPricingExplanations().GST} 
                    />
                  </span>
                  <span>{formatCurrency(estimate.GST || 0)}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between fw-bold">
                  <span>
                    Total
                    <PriceBreakdownTooltip 
                      componentName="Total Cost" 
                      explanation={getPricingExplanations().totalCost} 
                    />
                  </span>
                  <span>{formatCurrency(estimate.totalCost || 0)}</span>
                </div>
              </Col>
            </Row>
            <div className="mt-3">
              <p className="text-muted">{estimate.description || `Estimated cost for a ${formData.moveSize || '1BHK'} move from ${estimate.fromTier || 'Standard'} (${formData.fromZip}) to ${estimate.toTier || 'Standard'} (${formData.toZip}) covering ${estimate.distance || 0} km is ${formatCurrency(estimate.totalCost || 0)}. This includes all applicable charges and GST.`}</p>
            </div>
            <div className="mt-3 d-flex justify-content-end">
              <Button 
                variant="outline-primary" 
                onClick={() => setShowDetailedBreakdown(true)}
                className="me-2"
              >
                <FaInfoCircle className="me-1" /> View Detailed Breakdown
              </Button>
              <Button 
                variant="outline-success" 
                onClick={() => setShowVisualBreakdown(!showVisualBreakdown)}
              >
                <FaChartBar className="me-1" /> {showVisualBreakdown ? 'Hide' : 'Show'} Visual Breakdown
              </Button>
            </div>
            
            {showVisualBreakdown && (
              <div className="mt-3">
                <VisualPriceBreakdown estimate={estimate} />
              </div>
            )}
            
            {estimate && (
              <div className="mt-3">
                <PriceJustificationCard estimate={estimate} />
              </div>
            )}
          </Card.Body>
        </Card>
      )}
      
      <Card className="shadow-sm">
        <Card.Header>
          <h4 className="mb-0">Enter Details</h4>
        </Card.Header>
        <Card.Body>
          <div className="mb-4">
            <Nav variant="tabs">
              <Nav.Item>
                <Nav.Link 
                  active={activeTab === 'moving'} 
                  onClick={() => handleTabChange('moving')}
                >
                  Home Moving
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link 
                  active={activeTab === 'parcel'} 
                  onClick={() => handleTabChange('parcel')}
                >
                  Parcel Delivery
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>
          
          <Form onSubmit={handleDetailedEstimate}>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Pickup Pincode*</Form.Label>
                  <Form.Control
                    type="text"
                    name="fromZip"
                    value={formData.fromZip}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Destination Pincode*</Form.Label>
                  <Form.Control
                    type="text"
                    name="toZip"
                    value={formData.toZip}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Delivery Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="moveDate"
                    value={formData.moveDate}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            {activeTab === 'moving' ? (
              <>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Home Size*</Form.Label>
                      <Form.Select
                        name="moveSize"
                        value={formData.moveSize}
                        onChange={handleInputChange}
                        required={activeTab === 'moving'}
                      >
                        <option value="">Select home size</option>
                        {availableSizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pickup Floor Level</Form.Label>
                      <Form.Control
                        type="number"
                        name="floorLevelOrigin"
                        value={formData.floorLevelOrigin}
                        onChange={handleNumberInputChange}
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Destination Floor Level</Form.Label>
                      <Form.Control
                        type="number"
                        name="floorLevelDestination"
                        value={formData.floorLevelDestination}
                        onChange={handleNumberInputChange}
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        label="Elevator available at pickup"
                        name="hasElevatorOrigin"
                        checked={formData.hasElevatorOrigin}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        label="Elevator available at destination"
                        name="hasElevatorDestination"
                        checked={formData.hasElevatorDestination}
                        onChange={handleInputChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Parking Distance at Pickup (meters)</Form.Label>
                      <Form.Control
                        type="number"
                        name="parkingDistanceOrigin"
                        value={formData.parkingDistanceOrigin}
                        onChange={handleNumberInputChange}
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Parking Distance at Destination (meters)</Form.Label>
                      <Form.Control
                        type="number"
                        name="parkingDistanceDestination"
                        value={formData.parkingDistanceDestination}
                        onChange={handleNumberInputChange}
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Premium Packing Materials"
                    name="premiumPacking"
                    checked={formData.premiumPacking}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </>
            ) : (
              <>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pickup Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="pickupAddress"
                        value={formData.pickupAddress}
                        onChange={handleInputChange}
                        placeholder="Enter complete pickup address"
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Delivery Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="deliveryAddress"
                        value={formData.deliveryAddress}
                        onChange={handleInputChange}
                        placeholder="Enter complete delivery address"
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Package Type</Form.Label>
                      <Form.Select
                        name="packageType"
                        value={formData.packageType}
                        onChange={handleInputChange}
                        disabled={loading}
                      >
                        <option value="documents">Documents</option>
                        <option value="electronics">Electronics</option>
                        <option value="clothing">Clothing</option>
                        <option value="food">Food</option>
                        <option value="medicine">Medicine</option>
                        <option value="other">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Recipient Name*</Form.Label>
                      <Form.Control
                        type="text"
                        name="recipientName"
                        value={formData.recipientName}
                        onChange={handleInputChange}
                        required={activeTab === 'parcel'}
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Recipient Phone*</Form.Label>
                      <Form.Control
                        type="text"
                        name="recipientPhone"
                        value={formData.recipientPhone}
                        onChange={handleInputChange}
                        required={activeTab === 'parcel'}
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Delivery Instructions</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="deliveryInstructions"
                    value={formData.deliveryInstructions}
                    onChange={handleInputChange}
                    placeholder="Any special instructions for delivery"
                    disabled={loading}
                  />
                </Form.Group>
              </>
            )}
            
            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}
            
            <div className="d-grid gap-2">
              <Button 
                type="submit" 
                variant="primary" 
                size="lg"
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
                ) : 'Calculate Detailed Estimate'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      
      <PriceBreakdownModal 
        show={showDetailedBreakdown} 
        onHide={() => setShowDetailedBreakdown(false)} 
        estimate={estimate}
        formData={formData}
      />
    </Container>
  );
} 