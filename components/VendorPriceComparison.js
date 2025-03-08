import React from 'react';
import { Card, Table, Badge } from 'react-bootstrap';
import { formatCurrency } from '../lib/utils';
import PriceBreakdownTooltip from './PriceBreakdownTooltip';

/**
 * Component for displaying price comparison between vendors
 * @param {Array} quotes - Array of quotes from vendors
 * @param {Array} vendors - Array of vendor objects
 * @param {Object} priceEstimate - System-generated price estimate
 * @returns {JSX.Element} - The price comparison component
 */
export default function VendorPriceComparison({ quotes, vendors, priceEstimate }) {
  if (!quotes || quotes.length === 0 || !vendors || vendors.length === 0) {
    return null;
  }

  // Sort quotes by price (lowest first)
  const sortedQuotes = [...quotes].sort((a, b) => a.amount - b.amount);
  
  // Find the lowest and highest quotes
  const lowestQuote = sortedQuotes[0];
  const highestQuote = sortedQuotes[sortedQuotes.length - 1];
  
  // Calculate the average quote
  const averageQuote = sortedQuotes.reduce((sum, quote) => sum + quote.amount, 0) / sortedQuotes.length;
  
  // Calculate system estimate reference
  const systemEstimate = priceEstimate?.estimatedCost || sortedQuotes[0]?.systemEstimate || null;
  
  // Calculate price difference from system estimate
  const calculateDifference = (amount) => {
    if (!systemEstimate || systemEstimate === 0 || amount === undefined || amount === null) return null;
    const diff = ((amount - systemEstimate) / systemEstimate) * 100;
    return diff !== undefined && diff !== null ? diff.toFixed(1) : null;
  };
  
  // Get vendor name by ID
  const getVendorName = (vendorId) => {
    const vendor = vendors.find(v => v.vendorId === vendorId);
    return vendor?.name || 'Unknown Vendor';
  };
  
  // Get vendor tier by ID
  const getVendorTier = (vendorId) => {
    const vendor = vendors.find(v => v.vendorId === vendorId);
    return vendor?.pricingTier || 'default';
  };
  
  // Format vendor tier for display
  const formatVendorTier = (tier) => {
    switch (tier) {
      case 'economy': return <Badge bg="secondary">Economy</Badge>;
      case 'premium': return <Badge bg="warning">Premium</Badge>;
      default: return <Badge bg="primary">Standard</Badge>;
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">Price Comparison</h5>
      </Card.Header>
      <Card.Body>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Tier</th>
              <th>Quote Amount</th>
              <th>Difference from Market Price</th>
            </tr>
          </thead>
          <tbody>
            {sortedQuotes.map((quote, index) => {
              const diff = calculateDifference(quote.amount);
              const diffClass = diff === null ? '' : 
                parseFloat(diff) > 10 ? 'text-danger' : 
                parseFloat(diff) < -10 ? 'text-success' : '';
              
              return (
                <tr key={index}>
                  <td>{getVendorName(quote.vendorId)}</td>
                  <td>{formatVendorTier(getVendorTier(quote.vendorId))}</td>
                  <td>{formatCurrency(quote.amount || 0)}</td>
                  <td className={diffClass}>
                    {diff !== null ? `${diff}%` : 'N/A'} 
                    {diff !== null && parseFloat(diff) > 0 ? ' higher' : diff !== null && parseFloat(diff) < 0 ? ' lower' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        
        <div className="mt-3">
          <p><strong>Lowest Quote:</strong> {formatCurrency(lowestQuote?.amount || 0)}</p>
          <p><strong>Highest Quote:</strong> {formatCurrency(highestQuote?.amount || 0)}</p>
          <p><strong>Average Quote:</strong> {formatCurrency(averageQuote || 0)}</p>
          {systemEstimate && <p><strong>System Estimate:</strong> {formatCurrency(systemEstimate)}</p>}
        </div>
        
        <div className="mt-3">
          <small className="text-muted">
            <strong>Note:</strong> Price differences may reflect varying service levels, equipment quality, or special expertise. 
            Consider vendor ratings and reviews alongside pricing when making your decision.
          </small>
        </div>
      </Card.Body>
    </Card>
  );
} 