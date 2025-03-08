import { NextResponse } from 'next/server';
import { calculateMovingCost, getQuickEstimate, getAvailableMoveSizes, getCostFactors } from '../../../lib/services/pricingService';

/**
 * GET handler for pricing factors
 * Returns available move sizes, location tiers, and other pricing factors
 */
export async function GET(request) {
  try {
    const factors = getCostFactors();
    return NextResponse.json({ success: true, data: factors });
  } catch (error) {
    console.error('Error fetching pricing factors:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch pricing factors' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for calculating moving cost
 * Accepts detailed move parameters and returns comprehensive cost breakdown
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['fromZip', 'toZip', 'moveSize'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // Calculate detailed estimate
    const estimate = await calculateMovingCost(body);
    
    return NextResponse.json({ success: true, data: estimate });
  } catch (error) {
    console.error('Error calculating moving cost:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate moving cost' },
      { status: 500 }
    );
  }
} 