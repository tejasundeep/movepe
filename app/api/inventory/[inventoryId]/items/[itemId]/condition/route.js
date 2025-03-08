import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../../lib/auth'
import { inventoryService } from '../../../../../../../lib/services/inventoryService'

export const dynamic = 'force-dynamic'

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { inventoryId, itemId } = params
    
    // Validate path parameters
    if (!inventoryId || !itemId) {
      return NextResponse.json(
        { error: 'Inventory ID and item ID are required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { condition, notes, photos } = body

    // Validate required fields
    if (!condition) {
      return NextResponse.json(
        { error: 'Condition is required' },
        { status: 400 }
      )
    }

    // Update item condition
    const updatedInventory = await inventoryService.updateItemCondition(
      inventoryId,
      itemId,
      condition,
      notes || '',
      photos || []
    )

    return NextResponse.json(updatedInventory)
  } catch (error) {
    console.error('Error updating item condition:', error)
    
    let status = 500
    let errorMessage = 'Failed to update item condition'
    
    if (error.message === 'Inventory not found' || error.message === 'Item not found in inventory') {
      status = 404
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    )
  }
} 