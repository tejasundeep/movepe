export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { storage } from '../../../../../lib/storage'
import { orderService } from '../../../../../lib/services/orderService'
import { vendorService } from '../../../../../lib/services/vendorService'
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware'

async function submitQuote(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = params
    const { amount } = await request.json()

    // Validate amount
    if (!amount || isNaN(Number(amount)) || Number(amount) < 1000) {
      return NextResponse.json(
        { error: 'Invalid quote amount. Minimum quote amount is ₹1,000' },
        { status: 400 }
      )
    }

    // Get vendor details
    const vendors = await storage.readData('vendors.json')
    if (!vendors) {
      return NextResponse.json(
        { error: 'Failed to read vendors data' },
        { status: 500 }
      )
    }
    
    const vendor = vendors.find(v => v.email === session.user.email)
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Get order details to check price estimate
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Calculate recommended price using pricing service
    let recommendedPrice = null;
    let priceWarning = null;
    
    try {
      // Get move details from order
      const moveDetails = {
        pickupPincode: order.pickupPincode,
        destinationPincode: order.destinationPincode,
        moveSize: order.moveSize
      };
      
      // Calculate vendor-specific price
      const priceDetails = await vendorService.calculateVendorPrice(vendor.vendorId, moveDetails);
      
      // Check if quote amount is within reasonable range (±30% of recommended price)
      const minReasonablePrice = Math.round(priceDetails.basePrice * 0.7);
      const maxReasonablePrice = Math.round(priceDetails.basePrice * 1.3);
      
      recommendedPrice = priceDetails.basePrice;
      
      if (Number(amount) < minReasonablePrice) {
        priceWarning = 'Your quote is significantly lower than the recommended price. This may affect your profit margin.';
      } else if (Number(amount) > maxReasonablePrice) {
        priceWarning = 'Your quote is significantly higher than the recommended price. This may reduce your chances of being selected.';
      }
    } catch (error) {
      console.error('Error calculating recommended price:', error);
      // Continue without price recommendation if there's an error
    }

    // Submit quote using the order service
    const result = await orderService.submitQuote(
      orderId,
      vendor.vendorId,
      Number(amount)
    );

    return NextResponse.json({
      success: true,
      orderId,
      vendorId: vendor.vendorId,
      amount: Number(amount),
      submittedAt: result.submittedAt,
      recommendedPrice,
      priceWarning
    });
  } catch (error) {
    console.error('Error submitting quote:', error)
    
    let status = 500
    let errorMessage = 'Failed to submit quote'
    
    if (error.message === 'Order not found') {
      status = 404
      errorMessage = error.message
    } else if (error.message === 'Vendor not requested for this order') {
      status = 400
      errorMessage = error.message
    } else if (error.message === 'Quote already submitted') {
      status = 400
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(submitQuote, 'vendor'); 