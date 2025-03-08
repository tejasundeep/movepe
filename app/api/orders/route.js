import { NextResponse } from 'next/server'
import { orderService } from '../../../lib/services/orderService'
import { vendorService } from '../../../lib/services/vendorService'
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware'

async function createOrder(request) {
  try {
    const body = await request.json()
    const { pickupPincode, destinationPincode, moveSize, moveDate, userEmail } = body

    // Validate required fields
    if (!pickupPincode || !destinationPincode || !moveSize || !moveDate || !userEmail) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Create new order using the order service
    const newOrder = await orderService.createOrder(body)
    
    // Find recommended vendors for this move
    const recommendedVendors = await vendorService.findRecommendedVendors({
      pickupPincode,
      destinationPincode,
      moveSize,
      moveDate
    }, 5)
    
    // If we have recommended vendors, automatically request quotes from them
    if (recommendedVendors.length > 0) {
      const vendorIds = recommendedVendors.map(vendor => vendor.vendorId)
      await orderService.requestQuotes(newOrder.orderId, vendorIds, userEmail)
    }

    return NextResponse.json({ 
      orderId: newOrder.orderId,
      recommendedVendors: recommendedVendors.map(v => ({
        vendorId: v.vendorId,
        name: v.name,
        rating: v.rating,
        matchScore: v.matchScore
      }))
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(createOrder, 'orders'); 