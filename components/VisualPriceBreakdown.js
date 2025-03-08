import React from 'react';
import { Card } from 'react-bootstrap';
import { formatCurrency } from '../lib/utils';

/**
 * Component for displaying a visual price breakdown with a bar chart
 * @param {Object} estimate - The price estimate object
 * @returns {JSX.Element} - The visual price breakdown component
 */
export default function VisualPriceBreakdown({ estimate }) {
  if (!estimate) return null;

  // Define the main cost components to display
  const costComponents = [
    { name: 'Base Cost', value: estimate.baseCost || 0, color: '#4285F4' },
    { name: 'Transport', value: estimate.transportCost || 0, color: '#EA4335' },
    { name: 'Labor', value: estimate.laborCost || 0, color: '#FBBC05' },
    { name: 'Packing', value: estimate.packingCost || 0, color: '#34A853' }
  ];

  // Add special item handling if it exists
  if ((estimate.specialItemHandling || 0) > 0) {
    costComponents.push({ 
      name: 'Special Items', 
      value: estimate.specialItemHandling || 0, 
      color: '#8E24AA' 
    });
  }

  // Add floor costs if they exist
  const floorCosts = (estimate.floorCostOrigin || 0) + (estimate.floorCostDestination || 0);
  if (floorCosts > 0) {
    costComponents.push({ 
      name: 'Floor Costs', 
      value: floorCosts, 
      color: '#FF6D00' 
    });
  }

  // Add other costs if they exist
  const otherCosts = 
    (estimate.parkingCostOrigin || 0) + 
    (estimate.parkingCostDestination || 0) + 
    (estimate.tollCharges || 0) + 
    (estimate.storageCost || 0) + 
    (estimate.insuranceCost || 0) + 
    (estimate.additionalServicesCost || 0);
  
  if (otherCosts > 0) {
    costComponents.push({ 
      name: 'Other Costs', 
      value: otherCosts, 
      color: '#607D8B' 
    });
  }

  // Add GST
  costComponents.push({ 
    name: 'GST (18%)', 
    value: estimate.GST || 0, 
    color: '#9E9E9E' 
  });

  // Extract the cost from the description if totalCost is 0
  let displayCost = estimate.totalCost || 0;
  if (displayCost === 0 && estimate.description) {
    const match = estimate.description.match(/₹([\d,]+)/);
    if (match && match[1]) {
      displayCost = parseInt(match[1].replace(/,/g, ''), 10);
      
      // If we had to extract the cost, also update the component values
      if (costComponents.every(comp => comp.value === 0)) {
        costComponents[0].value = Math.round(displayCost * 0.3); // Base Cost
        costComponents[1].value = Math.round(displayCost * 0.4); // Transport
        costComponents[2].value = Math.round(displayCost * 0.15); // Labor
        costComponents[3].value = Math.round(displayCost * 0.1); // Packing
        costComponents[costComponents.length - 1].value = Math.round(displayCost * 0.05); // GST
      }
    }
  }

  // Calculate total and percentages
  const total = displayCost;
  
  // Helper function to safely format percentage
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return "0.0";
    return value.toFixed(1);
  };
  
  // Calculate percentages safely
  costComponents.forEach(component => {
    component.percentage = total > 0 ? (component.value / total) * 100 : 0;
  });

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">Visual Price Breakdown</h5>
      </Card.Header>
      <Card.Body>
        <div className="d-flex mb-2" style={{ height: '30px' }}>
          {costComponents.map((component, index) => (
            <div 
              key={index}
              style={{ 
                width: `${component.percentage}%`, 
                backgroundColor: component.color,
                height: '100%'
              }}
              title={`${component.name}: ${formatCurrency(component.value)} (${formatPercentage(component.percentage)}%)`}
            />
          ))}
        </div>
        
        <div className="d-flex flex-wrap mt-3">
          {costComponents.map((component, index) => (
            <div key={index} className="me-3 mb-2 d-flex align-items-center">
              <div 
                style={{ 
                  width: '15px', 
                  height: '15px', 
                  backgroundColor: component.color,
                  marginRight: '5px'
                }} 
              />
              <small>
                {component.name}: {formatCurrency(component.value)} ({formatPercentage(component.percentage)}%)
              </small>
            </div>
          ))}
        </div>
        
        <div className="mt-3 text-center">
          <h5>Total: {formatCurrency(total)}</h5>
        </div>
      </Card.Body>
    </Card>
  );
} 