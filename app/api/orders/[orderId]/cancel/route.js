import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { orderService } from '../../../../../lib/services/orderService'
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware'
import { authOptions } from '../../../../lib/auth'

async function cancelOrder(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = params
    const { reason } = await request.json()

    // Cancel the order using the order service
    const updatedOrder = await orderService.cancelOrder(orderId, session.user.email, reason)

    return NextResponse.json({
      success: true,
      order: updatedOrder
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    
    let status = 500
    let errorMessage = 'Failed to cancel order'
    
    if (error.message === 'Order not found') {
      status = 404
      errorMessage = error.message
    } else if (error.message === 'Not authorized to cancel this order') {
      status = 403
      errorMessage = error.message
    } else if (error.message === 'Order cannot be cancelled in its current state') {
      status = 400
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(cancelOrder, 'orders'); 