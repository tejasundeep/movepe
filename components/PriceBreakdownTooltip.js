import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaInfoCircle } from 'react-icons/fa';

/**
 * Reusable component for displaying price breakdown tooltips
 * @param {string} componentName - The name of the pricing component
 * @param {string} explanation - The explanation text for the tooltip
 * @returns {JSX.Element} - The tooltip component
 */
export default function PriceBreakdownTooltip({ componentName, explanation }) {
  return (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id={`tooltip-${componentName.toLowerCase().replace(/\s+/g, '-')}`}>
          {explanation}
        </Tooltip>
      }
    >
      <span className="ms-1 text-primary">
        <FaInfoCircle size={14} />
      </span>
    </OverlayTrigger>
  );
}

/**
 * Get standard explanations for pricing components
 * @returns {Object} - Object containing explanations for each pricing component
 */
export function getPricingExplanations() {
  return {
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
    dataAdjustment: "Market-based adjustment based on historical pricing data for similar moves.",
    totalCost: "The final price including all costs, adjustments, and taxes."
  };
} 