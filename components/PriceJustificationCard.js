import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';
import { formatCurrency } from '../lib/utils';
import PriceBreakdownTooltip from './PriceBreakdownTooltip';

/**
 * Component for displaying a price justification card
 * @param {Object} estimate - The price estimate object
 * @returns {JSX.Element} - The price justification card component
 */
export default function PriceJustificationCard({ estimate }) {
  if (!estimate) return null;

  // Define factors that affect the price
  const factors = [];
  
  // Distance factor
  if ((estimate.distance || 0) > 0) {
    factors.push({
      name: 'Distance',
      value: `${estimate.distance || 0} km`,
      impact: 'high',
      explanation: `Long-distance moves require more fuel, time, and resources. Your ${estimate.distance || 0} km move significantly affects the total cost.`
    });
  }
  
  // Home size factor
  factors.push({
    name: 'Home Size',
    value: estimate.moveSize || '1BHK',
    impact: 'high',
    explanation: `Larger homes contain more items and require more labor, packing materials, and truck space.`
  });
  
  // Location tier factor
  factors.push({
    name: 'Location Type',
    value: `${estimate.fromTier || 'Standard'} to ${estimate.toTier || 'Standard'}`,
    impact: 'medium',
    explanation: `Different location types (Metro, Normal City, Town, Village) have different base rates due to varying operational costs and accessibility.`
  });
  
  // Time factor
  if (estimate.timeFactor) {
    const timeImpact = estimate.timeFactor > 1.1 ? 'high' : estimate.timeFactor > 1.0 ? 'medium' : 'low';
    
    // Safely calculate time factor percentage
    let timeFactorPercentage = "0";
    if (estimate.timeFactor !== undefined && estimate.timeFactor !== null) {
      timeFactorPercentage = ((estimate.timeFactor - 1) * 100).toFixed(0);
    }
    
    factors.push({
      name: 'Seasonal Timing',
      value: `${timeFactorPercentage}% ${estimate.timeFactor > 1 ? 'surcharge' : 'discount'}`,
      impact: timeImpact,
      explanation: `${estimate.timeFactor > 1 ? 'Peak season moves cost more due to high demand.' : 'Off-season moves benefit from lower demand pricing.'} Your move date has a ${timeImpact} impact on pricing.`
    });
  }
  
  // Floor level factors
  if ((estimate.floorCostOrigin || 0) > 0 || (estimate.floorCostDestination || 0) > 0) {
    factors.push({
      name: 'Floor Levels',
      value: formatCurrency((estimate.floorCostOrigin || 0) + (estimate.floorCostDestination || 0)),
      impact: 'medium',
      explanation: `Moving items up/down floors requires additional labor and time. ${estimate.hasElevatorOrigin || estimate.hasElevatorDestination ? 'Elevator availability reduces this cost.' : 'No elevator access increases labor costs.'}`
    });
  }
  
  // Special items factor
  if ((estimate.specialItemHandling || 0) > 0) {
    factors.push({
      name: 'Special Items',
      value: formatCurrency(estimate.specialItemHandling || 0),
      impact: 'medium',
      explanation: `Special items require extra care, specialized equipment, or additional labor for safe handling and transport.`
    });
  }
  
  // Vendor tier factor
  if (estimate.vendorMarkupFactor) {
    const tierName = estimate.vendorMarkupFactor > 1.1 ? 'Premium' : estimate.vendorMarkupFactor < 0.9 ? 'Economy' : 'Standard';
    factors.push({
      name: 'Vendor Tier',
      value: tierName,
      impact: estimate.vendorMarkupFactor > 1.1 ? 'high' : estimate.vendorMarkupFactor < 0.9 ? 'medium' : 'low',
      explanation: `${tierName} vendors ${tierName === 'Premium' ? 'charge more but often provide higher quality service and equipment.' : tierName === 'Economy' ? 'offer discounted rates but may have fewer premium services.' : 'provide standard market rates and service quality.'}`
    });
  }
  
  // Market adjustment factor
  if (estimate.dataAdjustment && Math.abs(estimate.dataAdjustment - 1) > 0.05) {
    // Safely calculate data adjustment percentage
    let dataAdjustmentPercentage = "0";
    if (estimate.dataAdjustment !== undefined && estimate.dataAdjustment !== null) {
      dataAdjustmentPercentage = ((estimate.dataAdjustment - 1) * 100).toFixed(0);
    }
    
    factors.push({
      name: 'Market Conditions',
      value: `${dataAdjustmentPercentage}% ${estimate.dataAdjustment > 1 ? 'increase' : 'decrease'}`,
      impact: Math.abs(estimate.dataAdjustment - 1) > 0.1 ? 'high' : 'medium',
      explanation: `Current market conditions for your specific route and move type have ${estimate.dataAdjustment > 1 ? 'increased' : 'decreased'} prices based on historical data and demand patterns.`
    });
  }
  
  // Sort factors by impact (high to low)
  factors.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return impactOrder[b.impact] - impactOrder[a.impact];
  });
  
  // Helper function to render impact badge
  const renderImpactBadge = (impact) => {
    switch (impact) {
      case 'high': return <Badge bg="danger">High Impact</Badge>;
      case 'medium': return <Badge bg="warning">Medium Impact</Badge>;
      case 'low': return <Badge bg="info">Low Impact</Badge>;
      default: return null;
    }
  };

  // Extract the cost from the description if totalCost is 0
  let displayCost = estimate.totalCost || 0;
  if (displayCost === 0 && estimate.description) {
    const match = estimate.description.match(/₹([\d,]+)/);
    if (match && match[1]) {
      displayCost = parseInt(match[1].replace(/,/g, ''), 10);
    }
  }

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">Price Justification</h5>
      </Card.Header>
      <Card.Body>
        <p className="mb-3">
          Your estimated price of <strong>{formatCurrency(displayCost)}</strong> is based on the following factors:
        </p>
        
        <div className="price-factors">
          {factors.map((factor, index) => (
            <div key={index} className="price-factor mb-3 pb-3 border-bottom">
              <div className="d-flex justify-content-between align-items-start mb-1">
                <h6 className="mb-0">{factor.name}: <span className="text-primary">{factor.value}</span></h6>
                {renderImpactBadge(factor.impact)}
              </div>
              <p className="mb-0 text-muted small">{factor.explanation}</p>
            </div>
          ))}
        </div>
        
        <p className="mt-3 mb-0 text-muted">
          <small>This price justification is based on our pricing algorithm which considers multiple factors to provide a fair and transparent price.</small>
        </p>
      </Card.Body>
    </Card>
  );
} 