import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { orderService } from '../../../../../lib/services/orderService'
import { inventoryService } from '../../../../../lib/services/inventoryService'
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware'

export const dynamic = 'force-dynamic'

async function getInventory(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = params
    
    // Validate path parameters
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Get inventory for this order
    const inventory = await inventoryService.getInventoryByOrderId(orderId)
    
    if (!inventory) {
      return NextResponse.json(
        { error: 'Inventory not found for this order' },
        { status: 404 }
      )
    }

    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

async function createInventory(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = params
    
    // Validate path parameters
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { items } = body

    // Validate required fields
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      )
    }

    // Check if inventory already exists
    const existingInventory = await inventoryService.getInventoryByOrderId(orderId)
    if (existingInventory) {
      return NextResponse.json(
        { error: 'Inventory already exists for this order', inventory: existingInventory },
        { status: 409 }
      )
    }

    // Create inventory
    const inventory = await inventoryService.createInventory(orderId, items)

    // Get the order
    const order = await orderService.getOrderById(orderId)
    
    // Send notifications if needed
    if (order && order.selectedVendorId) {
      // This would be implemented in a real system
      console.log(`Would send notification to vendor ${order.selectedVendorId} about inventory creation`)
    }

    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error creating inventory:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create inventory' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getInventory, 'orders')
export const POST = withRateLimit(createInventory, 'orders') 