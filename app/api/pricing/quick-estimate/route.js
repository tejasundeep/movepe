export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getQuickEstimate } from '../../../../lib/services/pricingService';

/**
 * POST handler for quick moving cost estimates
 * Accepts minimal parameters (fromZip, toZip, moveSize) and returns a simplified estimate
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { fromZip, toZip, moveSize } = body;
    
    if (!fromZip || !toZip || !moveSize) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: fromZip, toZip, and moveSize are required' 
        },
        { status: 400 }
      );
    }
    
    // Get quick estimate
    const estimate = await getQuickEstimate(fromZip, toZip, moveSize);
    
    return NextResponse.json({ success: true, data: estimate });
  } catch (error) {
    console.error('Error generating quick estimate:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate quick estimate' },
      { status: 500 }
    );
  }
} 