import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { inventoryService } from '../../../lib/services/inventoryService'
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware'

export const dynamic = 'force-dynamic'

async function createInventory(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orderId, items } = body

    // Validate required fields
    if (!orderId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Order ID and items array are required' },
        { status: 400 }
      )
    }

    // Validate items
    for (const item of items) {
      if (!item.name || !item.category) {
        return NextResponse.json(
          { error: 'Each item must have a name and category' },
          { status: 400 }
        )
      }
    }

    // Create inventory using the inventory service
    const inventory = await inventoryService.createInventory(orderId, items, session.user.email)

    return NextResponse.json({
      success: true,
      inventoryId: inventory.inventoryId,
      itemCount: inventory.items.length
    })
  } catch (error) {
    console.error('Error creating inventory:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create inventory' },
      { status: 500 }
    )
  }
}

async function getInventories(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const userEmail = searchParams.get('userEmail')

    // Get inventories using the inventory service
    const inventories = await inventoryService.getInventories(orderId, userEmail || session.user.email)

    return NextResponse.json(inventories)
  } catch (error) {
    console.error('Error fetching inventories:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventories' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handlers
export const POST = withRateLimit(createInventory, 'default');
export const GET = withRateLimit(getInventories, 'default'); 