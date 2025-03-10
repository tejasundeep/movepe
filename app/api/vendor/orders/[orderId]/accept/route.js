export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../../lib/auth'
import { storage, vendorStorage } from '../../../../../../lib/storage'
import { orderService } from '../../../../../../lib/services/orderService'
import { vendorService } from '../../../../../../lib/services/vendorService'
import { withRateLimit } from '../../../../../../lib/middleware/rateLimitMiddleware'

async function acceptOrder(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = params

    // Get vendor details using Prisma
    const vendor = await vendorService.getVendorByEmail(session.user.email)
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Accept the order using the order service
    const updatedOrder = await orderService.acceptOrder(orderId, vendor.id)

    return NextResponse.json({
      success: true,
      order: updatedOrder
    })
  } catch (error) {
    console.error('Error accepting order:', error)
    
    let status = 500
    let errorMessage = 'Failed to accept order'
    
    if (error.message === 'Order not found') {
      status = 404
      errorMessage = error.message
    } else if (error.message === 'Order not assigned to this vendor') {
      status = 403
      errorMessage = error.message
    } else if (error.message === 'Order is not in a state where it can be accepted') {
      status = 400
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(acceptOrder, 'vendor'); 