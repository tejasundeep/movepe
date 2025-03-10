import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { orderService } from '../../../../lib/services/orderService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

export const dynamic = 'force-dynamic'

async function getUserOrders(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user orders using the order service
    const userOrders = await orderService.getUserOrders(session.user.email)

    return NextResponse.json(userOrders)
  } catch (error) {
    console.error('Error in user orders API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

async function createUserOrder(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const orderData = await request.json()
    
    // Add user email to order data
    orderData.userEmail = session.user.email
    
    // Create order using the order service
    const newOrder = await orderService.createOrder(orderData)
    
    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber
    })
  } catch (error) {
    console.error('Error creating user order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getUserOrders, 'orders');
export const POST = withRateLimit(createUserOrder, 'orders'); 