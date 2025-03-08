import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { orderService } from '../../../../lib/services/orderService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

export const dynamic = 'force-dynamic'

async function getOrder(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get order by ID using the order service
    const order = await orderService.getOrderById(params.orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user is authorized to view this order
    if (order.userEmail !== session.user.email && session.user.role !== 'vendor') {
      return NextResponse.json({ error: 'Not authorized to view this order' }, { status: 403 })
    }

    // Return the order
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error in order API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

async function updateOrder(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()

    // Update order using the order service
    const updatedOrder = await orderService.updateOrder(
      params.orderId, 
      updates, 
      session.user.email, 
      session.user.role
    )

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating order:', error)
    
    let status = 500
    if (error.message.includes('not found')) {
      status = 404
    } else if (error.message.includes('Not authorized')) {
      status = 403
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status }
    )
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getOrder, 'orders');
export const PUT = withRateLimit(updateOrder, 'orders'); 