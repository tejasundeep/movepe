export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { calculateMovingCost, getQuickEstimate, getAvailableMoveSizes, getCostFactors, getDetailedEstimate } from '../../../lib/services/pricingService';

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
 * POST handler for calculating moving or parcel delivery cost
 * Accepts detailed parameters and returns comprehensive cost breakdown
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Determine order type
    const orderType = body.orderType || 'moving';
    
    // Validate required fields based on order type
    let requiredFields = ['fromZip', 'toZip'];
    
    if (orderType === 'moving') {
      requiredFields.push('moveSize');
    }
    // Parcel weight is now optional as we use default values
    
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
    
    // Calculate detailed estimate based on order type
    const estimate = await getDetailedEstimate(body);
    
    return NextResponse.json({ success: true, data: estimate });
  } catch (error) {
    console.error('Error calculating cost:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate cost' },
      { status: 500 }
    );
  }
} 