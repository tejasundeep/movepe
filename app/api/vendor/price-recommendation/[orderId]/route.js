export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { storage } from '../../../../../lib/storage';
import { orderService } from '../../../../../lib/services/orderService';
import { vendorService } from '../../../../../lib/services/vendorService';
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware';

async function getPriceRecommendation(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { orderId } = params;
    
    // Get vendor details
    const vendors = await storage.readData('vendors.json');
    if (!vendors) {
      return NextResponse.json(
        { error: 'Failed to read vendors data' },
        { status: 500 }
      );
    }
    
    const vendor = vendors.find(v => v.email === session.user.email);
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Get order details
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if vendor is requested for this order
    if (!order.vendorRequests?.includes(vendor.vendorId)) {
      return NextResponse.json(
        { error: 'Vendor not requested for this order' },
        { status: 403 }
      );
    }

    // Get move details from order
    const moveDetails = {
      pickupPincode: order.pickupPincode,
      destinationPincode: order.destinationPincode,
      moveSize: order.moveSize
    };
    
    // Calculate vendor-specific price
    const priceDetails = await vendorService.calculateVendorPrice(vendor.vendorId, moveDetails);
    
    return NextResponse.json({
      success: true,
      orderId,
      vendorId: vendor.vendorId,
      recommendedPrice: priceDetails.basePrice,
      systemEstimate: priceDetails.systemEstimate,
      distance: priceDetails.distance,
      vendorTier: priceDetails.vendorTier,
      tierMultiplier: priceDetails.tierMultiplier,
      minRecommendedPrice: Math.round(priceDetails.basePrice * 0.7),
      maxRecommendedPrice: Math.round(priceDetails.basePrice * 1.3)
    });
  } catch (error) {
    console.error('Error getting price recommendation:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to get price recommendation' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getPriceRecommendation, 'vendor'); 