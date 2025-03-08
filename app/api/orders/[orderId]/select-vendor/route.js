import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { orderService } from '../../../../../lib/services/orderService'
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware'

async function selectVendor(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = params
    const { vendorId } = await request.json()

    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      )
    }

    // Select vendor for the order using the order service
    const updatedOrder = await orderService.selectVendor(orderId, vendorId, session.user.email)

    return NextResponse.json({
      success: true,
      order: updatedOrder
    })
  } catch (error) {
    console.error('Error selecting vendor:', error)
    
    let status = 500
    let errorMessage = 'Failed to select vendor'
    
    if (error.message === 'Order not found') {
      status = 404
      errorMessage = error.message
    } else if (error.message === 'Not authorized to select vendor for this order') {
      status = 403
      errorMessage = error.message
    } else if (error.message === 'Vendor not found') {
      status = 404
      errorMessage = error.message
    } else if (error.message === 'Vendor has not provided a quote for this order') {
      status = 400
      errorMessage = error.message
    } else if (error.message === 'Order is not in a state where vendor can be selected') {
      status = 400
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(selectVendor, 'orders'); 