import { Modal, Button, Table, Accordion, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaInfoCircle, FaQuestionCircle } from 'react-icons/fa';
import { formatCurrency } from '../lib/utils';

/**
 * Component for displaying a detailed price breakdown with explanations
 */
export default function PriceBreakdownModal({ show, onHide, estimate, formData }) {
  if (!estimate) return null;

  // Prepare explanations for each pricing component
  const explanations = {
    baseCost: "The starting price for your move based on home size and location tier. This covers basic moving services.",
    transportCost: "Cost of transporting your belongings based on distance, fuel prices, and road conditions.",
    laborCost: "Cost of labor required for loading, unloading, and handling your items based on move size and estimated duration.",
    packingCost: "Cost of packing materials and services. Premium packing includes higher quality materials and extra care for fragile items.",
    floorCostOrigin: "Additional charges for moving items up/down floors at the pickup location. Elevator availability reduces this cost.",
    floorCostDestination: "Additional charges for moving items up/down floors at the destination. Elevator availability reduces this cost.",
    parkingCostOrigin: "Charges based on the distance between the moving truck and your pickup location entrance.",
    parkingCostDestination: "Charges based on the distance between the moving truck and your destination location entrance.",
    specialItemHandling: "Additional cost for handling special items that require extra care, equipment, or expertise.",
    storageCost: "Cost for temporary storage of your belongings between pickup and delivery.",
    tollCharges: "Estimated toll charges along the route.",
    insuranceCost: "Cost of insurance coverage for your belongings during the move.",
    additionalServicesCost: "Cost of any additional services you've requested.",
    timeFactor: "Adjustment based on the time of your move. Peak seasons, weekends, and holidays have higher rates.",
    vendorMarkupFactor: "Adjustment based on vendor tier (economy, default, premium).",
    GST: "Goods and Services Tax (18%) applied to the subtotal.",
    dataAdjustment: "Market-based adjustment based on historical pricing data for similar moves."
  };

  // Extract the cost from the description if totalCost is 0
  let displayCost = estimate.totalCost || 0;
  if (displayCost === 0 && estimate.description) {
    const match = estimate.description.match(/₹([\d,]+)/);
    if (match && match[1]) {
      displayCost = parseInt(match[1].replace(/,/g, ''), 10);
    }
  }

  // Calculate percentages for visualization
  const subtotalWithoutGST = displayCost - (estimate.GST || 0);
  const getPercentage = (value) => {
    if (value === undefined || value === null || subtotalWithoutGST === 0) return "0.0";
    return ((value / subtotalWithoutGST) * 100).toFixed(1);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Detailed Price Breakdown</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h4 className="mb-3">Total: {formatCurrency(displayCost)}</h4>
        
        <p className="mb-4">
          This breakdown explains how your moving cost is calculated based on the details you provided.
          Each component reflects a specific aspect of your move.
        </p>
        
        {/* Main cost components */}
        <h5 className="mb-3">Primary Cost Components</h5>
        <Table striped bordered hover className="mb-4">
          <thead>
            <tr>
              <th>Component</th>
              <th>Amount</th>
              <th>% of Subtotal</th>
              <th>Explanation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base Cost</td>
              <td>{formatCurrency(estimate.baseCost || 0)}</td>
              <td>{getPercentage(estimate.baseCost)}%</td>
              <td>
                <small>{explanations.baseCost}</small>
              </td>
            </tr>
            <tr>
              <td>Transport Cost</td>
              <td>{formatCurrency(estimate.transportCost || 0)}</td>
              <td>{getPercentage(estimate.transportCost)}%</td>
              <td>
                <small>{explanations.transportCost}</small>
              </td>
            </tr>
            <tr>
              <td>Labor Cost</td>
              <td>{formatCurrency(estimate.laborCost || 0)}</td>
              <td>{getPercentage(estimate.laborCost)}%</td>
              <td>
                <small>{explanations.laborCost}</small>
              </td>
            </tr>
            <tr>
              <td>Packing Cost</td>
              <td>{formatCurrency(estimate.packingCost || 0)}</td>
              <td>{getPercentage(estimate.packingCost)}%</td>
              <td>
                <small>{explanations.packingCost}</small>
              </td>
            </tr>
          </tbody>
        </Table>
        
        {/* Additional costs */}
        <Accordion className="mb-4">
          <Accordion.Item eventKey="0">
            <Accordion.Header>Additional Costs</Accordion.Header>
            <Accordion.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Amount</th>
                    <th>Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  {(estimate.floorCostOrigin || 0) > 0 && (
                    <tr>
                      <td>Floor Cost (Origin)</td>
                      <td>{formatCurrency(estimate.floorCostOrigin || 0)}</td>
                      <td><small>{explanations.floorCostOrigin}</small></td>
                    </tr>
                  )}
                  {(estimate.floorCostDestination || 0) > 0 && (
                    <tr>
                      <td>Floor Cost (Destination)</td>
                      <td>{formatCurrency(estimate.floorCostDestination || 0)}</td>
                      <td><small>{explanations.floorCostDestination}</small></td>
                    </tr>
                  )}
                  {(estimate.parkingCostOrigin || 0) > 0 && (
                    <tr>
                      <td>Parking Distance (Origin)</td>
                      <td>{formatCurrency(estimate.parkingCostOrigin || 0)}</td>
                      <td><small>{explanations.parkingCostOrigin}</small></td>
                    </tr>
                  )}
                  {(estimate.parkingCostDestination || 0) > 0 && (
                    <tr>
                      <td>Parking Distance (Destination)</td>
                      <td>{formatCurrency(estimate.parkingCostDestination || 0)}</td>
                      <td><small>{explanations.parkingCostDestination}</small></td>
                    </tr>
                  )}
                  {(estimate.specialItemHandling || 0) > 0 && (
                    <tr>
                      <td>Special Item Handling</td>
                      <td>{formatCurrency(estimate.specialItemHandling || 0)}</td>
                      <td><small>{explanations.specialItemHandling}</small></td>
                    </tr>
                  )}
                  {(estimate.tollCharges || 0) > 0 && (
                    <tr>
                      <td>Toll Charges</td>
                      <td>{formatCurrency(estimate.tollCharges || 0)}</td>
                      <td><small>{explanations.tollCharges}</small></td>
                    </tr>
                  )}
                  {(estimate.insuranceCost || 0) > 0 && (
                    <tr>
                      <td>Insurance Cost</td>
                      <td>{formatCurrency(estimate.insuranceCost || 0)}</td>
                      <td><small>{explanations.insuranceCost}</small></td>
                    </tr>
                  )}
                  {(estimate.additionalServicesCost || 0) > 0 && (
                    <tr>
                      <td>Additional Services</td>
                      <td>{formatCurrency(estimate.additionalServicesCost || 0)}</td>
                      <td><small>{explanations.additionalServicesCost}</small></td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
        
        {/* Adjustment factors */}
        <Accordion className="mb-4">
          <Accordion.Item eventKey="0">
            <Accordion.Header>Price Adjustment Factors</Accordion.Header>
            <Accordion.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th>Value</th>
                    <th>Explanation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Time Factor</td>
                    <td>{estimate.timeFactor !== undefined && estimate.timeFactor !== null ? estimate.timeFactor.toFixed(2) : "1.00"}x</td>
                    <td><small>{explanations.timeFactor}</small></td>
                  </tr>
                  <tr>
                    <td>Vendor Tier</td>
                    <td>{estimate.vendorMarkupFactor !== undefined && estimate.vendorMarkupFactor !== null ? estimate.vendorMarkupFactor.toFixed(2) : "1.00"}x</td>
                    <td><small>{explanations.vendorMarkupFactor}</small></td>
                  </tr>
                  <tr>
                    <td>Fuel Adjustment</td>
                    <td>{estimate.fuelAdjustment !== undefined && estimate.fuelAdjustment !== null ? estimate.fuelAdjustment.toFixed(2) : "1.00"}x</td>
                    <td><small>Adjustment based on current fuel prices compared to baseline.</small></td>
                  </tr>
                  <tr>
                    <td>Market Adjustment</td>
                    <td>{estimate.dataAdjustment !== undefined && estimate.dataAdjustment !== null ? estimate.dataAdjustment.toFixed(2) : "1.00"}x</td>
                    <td><small>{explanations.dataAdjustment}</small></td>
                  </tr>
                </tbody>
              </Table>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
        
        {/* Totals */}
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">Price Summary</h5>
          </Card.Header>
          <Card.Body>
            <Table bordered>
              <tbody>
                <tr>
                  <td>Raw Subtotal (before adjustments)</td>
                  <td className="text-end">{formatCurrency(estimate.rawSubtotal || 0)}</td>
                </tr>
                <tr>
                  <td>Subtotal (after time & vendor adjustments)</td>
                  <td className="text-end">{formatCurrency(estimate.subtotal || 0)}</td>
                </tr>
                <tr>
                  <td>Adjusted Subtotal (after market adjustments)</td>
                  <td className="text-end">{formatCurrency(estimate.adjustedSubtotal || 0)}</td>
                </tr>
                <tr>
                  <td>GST (18%)</td>
                  <td className="text-end">{formatCurrency(estimate.GST || 0)}</td>
                </tr>
                <tr className="fw-bold">
                  <td>Total Cost</td>
                  <td className="text-end">{formatCurrency(displayCost)}</td>
                </tr>
              </tbody>
            </Table>
          </Card.Body>
        </Card>
        
        {/* Move details summary */}
        <Card>
          <Card.Header>
            <h5 className="mb-0">Move Details Summary</h5>
          </Card.Header>
          <Card.Body>
            <Table bordered>
              <tbody>
                <tr>
                  <td>From Location</td>
                  <td>{formData?.fromZip || 'N/A'} ({estimate.fromTier || 'Standard'})</td>
                </tr>
                <tr>
                  <td>To Location</td>
                  <td>{formData?.toZip || 'N/A'} ({estimate.toTier || 'Standard'})</td>
                </tr>
                <tr>
                  <td>Distance</td>
                  <td>{estimate.distance || 0} km</td>
                </tr>
                <tr>
                  <td>Estimated Duration</td>
                  <td>{estimate.estimatedDuration ? `${estimate.estimatedDuration} minutes` : 'Calculating...'}</td>
                </tr>
                <tr>
                  <td>Home Size</td>
                  <td>{formData?.moveSize || '1BHK'}</td>
                </tr>
                <tr>
                  <td>Move Date</td>
                  <td>{formData?.moveDate || 'Not specified'}</td>
                </tr>
                <tr>
                  <td>Floor Level (Origin)</td>
                  <td>{formData?.floorLevelOrigin || 0}{formData?.hasElevatorOrigin ? ' (Elevator available)' : ''}</td>
                </tr>
                <tr>
                  <td>Floor Level (Destination)</td>
                  <td>{formData?.floorLevelDestination || 0}{formData?.hasElevatorDestination ? ' (Elevator available)' : ''}</td>
                </tr>
                <tr>
                  <td>Parking Distance (Origin)</td>
                  <td>{formData?.parkingDistanceOrigin || 0} meters</td>
                </tr>
                <tr>
                  <td>Parking Distance (Destination)</td>
                  <td>{formData?.parkingDistanceDestination || 0} meters</td>
                </tr>
                <tr>
                  <td>Premium Packing</td>
                  <td>{formData?.premiumPacking ? 'Yes' : 'No'}</td>
                </tr>
                <tr>
                  <td>Special Items</td>
                  <td>
                    {formData?.specialItems && formData.specialItems.length > 0 
                      ? formData.specialItems.map((item, index) => (
                          <div key={index}>
                            {item.quantity || 1} x {item.category || 'Standard'}
                          </div>
                        ))
                      : 'None'}
                  </td>
                </tr>
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
} 