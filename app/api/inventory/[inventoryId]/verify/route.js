import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { inventoryService } from '../../../../../lib/services/inventoryService'
import { inventoryStorage } from '../../../../../lib/storage'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { inventoryId } = params
    
    // Validate path parameters
    if (!inventoryId) {
      return NextResponse.json(
        { error: 'Inventory ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { itemConditions } = body

    // Validate required fields
    if (!Array.isArray(itemConditions)) {
      return NextResponse.json(
        { error: 'Item conditions array is required' },
        { status: 400 }
      )
    }

    // Get inventory to find order ID
    const inventory = await inventoryStorage.getById(inventoryId)
    if (!inventory) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 }
      )
    }

    // Verify inventory
    const updatedInventory = await inventoryService.verifyInventoryAtDelivery(
      inventory.orderId,
      itemConditions,
      session.user.email
    )

    return NextResponse.json(updatedInventory)
  } catch (error) {
    console.error('Error verifying inventory:', error)
    
    let status = 500
    let errorMessage = 'Failed to verify inventory'
    
    if (error.message === 'Inventory not found for this order') {
      status = 404
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    )
  }
} 