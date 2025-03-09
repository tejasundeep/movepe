export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { orderService } from '../../../../../lib/services/orderService'
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware'

async function requestQuotes(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = params
    const { vendorIds } = await request.json()

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one vendor ID is required' },
        { status: 400 }
      )
    }

    // Request quotes from vendors using the order service
    const updatedOrder = await orderService.requestQuotes(orderId, vendorIds, session.user.email)

    return NextResponse.json({
      success: true,
      order: updatedOrder
    })
  } catch (error) {
    console.error('Error requesting quotes:', error)
    
    let status = 500
    let errorMessage = 'Failed to request quotes'
    
    if (error.message === 'Order not found') {
      status = 404
      errorMessage = error.message
    } else if (error.message === 'Not authorized to request quotes for this order') {
      status = 403
      errorMessage = error.message
    } else if (error.message === 'Order is not in a state where quotes can be requested') {
      status = 400
      errorMessage = error.message
    } else if (error.message === 'One or more vendors not found') {
      status = 400
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(requestQuotes, 'orders'); 