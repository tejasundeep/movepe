export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware'

// GET /api/inventory - Get inventory for a vendor
async function getInventory(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get('vendorId')
    
    // If vendorId is not provided, get the vendor ID from the user's session
    let targetVendorId = vendorId
    
    if (!targetVendorId) {
      // Check if the user is a vendor
      if (session.user.role !== 'vendor' && session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Vendor ID is required for non-vendor users' },
          { status: 400 }
        )
      }
      
      // Get the vendor profile for the user
      const vendor = await prisma.vendor.findUnique({
        where: { userId: session.user.id },
      })
      
      if (!vendor) {
        return NextResponse.json(
          { error: 'Vendor profile not found' },
          { status: 404 }
        )
      }
      
      targetVendorId = vendor.id
    } else if (session.user.role !== 'admin') {
      // If vendorId is provided and user is not an admin, check if they have permission
      const vendor = await prisma.vendor.findUnique({
        where: { id: targetVendorId },
      })
      
      if (!vendor || vendor.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to view this inventory' },
          { status: 403 }
        )
      }
    }
    
    // Get the inventory
    const inventory = await prisma.inventory.findUnique({
      where: { vendorId: targetVendorId },
    })
    
    if (!inventory) {
      // If inventory doesn't exist, create an empty one
      const newInventory = await prisma.inventory.create({
        data: {
          vendorId: targetVendorId,
          items: JSON.stringify([]),
        },
      })
      
      return NextResponse.json({
        success: true,
        inventory: {
          ...newInventory,
          items: [],
        },
      })
    }
    
    // Parse the items JSON
    const items = JSON.parse(inventory.items || '[]')
    
    return NextResponse.json({
      success: true,
      inventory: {
        ...inventory,
        items,
      },
    })
  } catch (error) {
    console.error('Error getting inventory:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get inventory' },
      { status: 500 }
    )
  }
}

// POST /api/inventory - Update inventory for a vendor
async function updateInventory(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { vendorId, items } = body
    
    // If vendorId is not provided, get the vendor ID from the user's session
    let targetVendorId = vendorId
    
    if (!targetVendorId) {
      // Check if the user is a vendor
      if (session.user.role !== 'vendor' && session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Vendor ID is required for non-vendor users' },
          { status: 400 }
        )
      }
      
      // Get the vendor profile for the user
      const vendor = await prisma.vendor.findUnique({
        where: { userId: session.user.id },
      })
      
      if (!vendor) {
        return NextResponse.json(
          { error: 'Vendor profile not found' },
          { status: 404 }
        )
      }
      
      targetVendorId = vendor.id
    } else if (session.user.role !== 'admin') {
      // If vendorId is provided and user is not an admin, check if they have permission
      const vendor = await prisma.vendor.findUnique({
        where: { id: targetVendorId },
      })
      
      if (!vendor || vendor.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to update this inventory' },
          { status: 403 }
        )
      }
    }
    
    // Validate items
    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array' },
        { status: 400 }
      )
    }
    
    // Validate each item
    for (const item of items) {
      if (!item.id || !item.name || item.quantity === undefined) {
        return NextResponse.json(
          { error: 'Each item must have an id, name, and quantity' },
          { status: 400 }
        )
      }
    }
    
    // Update or create the inventory
    const inventory = await prisma.inventory.upsert({
      where: { vendorId: targetVendorId },
      update: {
        items: JSON.stringify(items),
        updatedAt: new Date(),
      },
      create: {
        vendorId: targetVendorId,
        items: JSON.stringify(items),
      },
    })
    
    // Create an audit log for the inventory update
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_INVENTORY',
        entityType: 'INVENTORY',
        entityId: inventory.id,
        userId: session.user.id,
        details: JSON.stringify({
          itemCount: items.length,
          updatedAt: new Date(),
        }),
      },
    })
    
    return NextResponse.json({
      success: true,
      inventory: {
        ...inventory,
        items,
      },
    })
  } catch (error) {
    console.error('Error updating inventory:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update inventory' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getInventory, { limit: 100, windowMs: 60000 })
export const POST = withRateLimit(updateInventory, { limit: 50, windowMs: 60000 }) 