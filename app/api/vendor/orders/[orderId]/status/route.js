export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../../lib/auth'
import { storage, vendorStorage } from '../../../../../../lib/storage'
import { orderService } from '../../../../../../lib/services/orderService'
import { vendorService } from '../../../../../../lib/services/vendorService'
import { withRateLimit } from '../../../../../../lib/middleware/rateLimitMiddleware'

async function updateOrderStatus(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = params
    const body = await request.json()
    const { status, forceUpdate } = body

    // Validate status
    const validStatuses = ['In Progress', 'In Transit', 'Delivered', 'Completed']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Get vendor details using Prisma
    const vendor = await vendorService.getVendorByEmail(session.user.email)
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Check if inventory verification is required for completing the order
    if (status === 'Completed') {
      const verificationRequired = await orderService.isInventoryVerificationRequired(orderId)
      
      if (verificationRequired && !forceUpdate) {
        return NextResponse.json(
          { 
            error: 'Inventory verification is required before completing this order',
            requiresVerification: true
          },
          { status: 400 }
        )
      }
    }

    // Update order status using the order service with validation
    const updatedOrder = await orderService.updateOrderStatus(
      orderId, 
      vendor.id, 
      status,
      !!forceUpdate // Convert to boolean
    )

    return NextResponse.json({
      success: true,
      order: updatedOrder
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    
    let status = 500
    let errorMessage = 'Failed to update order status'
    
    if (error.message === 'Order not found') {
      status = 404
      errorMessage = error.message
    } else if (error.message === 'Order not assigned to this vendor') {
      status = 403
      errorMessage = error.message
    } else if (error.message.includes('Invalid status transition')) {
      status = 400
      errorMessage = error.message
    } else if (error.message.includes('Inventory verification is required')) {
      status = 400
      errorMessage = error.message
      return NextResponse.json({ 
        error: errorMessage,
        requiresVerification: true
      }, { status })
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handler
export const PUT = withRateLimit(updateOrderStatus, 'vendor'); 