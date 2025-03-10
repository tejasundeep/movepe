export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// POST /api/inventory/allocate - Allocate inventory items to an order
async function allocateInventory(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is a vendor or admin
    if (session.user.role !== 'vendor' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only vendors and admins can allocate inventory' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { orderId, vendorId, items } = body;
    
    // Validate required fields
    if (!orderId || !vendorId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Order ID, vendor ID, and items array are required' },
        { status: 400 }
      );
    }
    
    // Validate each item
    for (const item of items) {
      if (!item.id || !item.name || item.quantity === undefined) {
        return NextResponse.json(
          { error: 'Each item must have an id, name, and quantity' },
          { status: 400 }
        );
      }
    }
    
    // Check if the order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check if the vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    // Check if the user is the vendor or an admin
    if (vendor.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to allocate inventory for this vendor' },
        { status: 403 }
      );
    }
    
    // Check if the order is assigned to the vendor
    if (order.vendorId !== vendorId) {
      return NextResponse.json(
        { error: 'This order is not assigned to the specified vendor' },
        { status: 400 }
      );
    }
    
    // Get the vendor's inventory
    const inventory = await prisma.inventory.findUnique({
      where: { vendorId },
    });
    
    if (!inventory) {
      return NextResponse.json(
        { error: 'Vendor inventory not found' },
        { status: 404 }
      );
    }
    
    // Parse the inventory items
    const inventoryItems = JSON.parse(inventory.items || '[]');
    
    // Check if there's enough inventory for allocation
    for (const allocatedItem of items) {
      const inventoryItem = inventoryItems.find(item => item.id === allocatedItem.id);
      
      if (!inventoryItem) {
        return NextResponse.json(
          { error: `Item ${allocatedItem.name} (ID: ${allocatedItem.id}) not found in inventory` },
          { status: 400 }
        );
      }
      
      if (inventoryItem.quantity < allocatedItem.quantity) {
        return NextResponse.json(
          { 
            error: `Not enough ${allocatedItem.name} in inventory. Requested: ${allocatedItem.quantity}, Available: ${inventoryItem.quantity}` 
          },
          { status: 400 }
        );
      }
    }
    
    // Update inventory quantities
    const updatedInventoryItems = inventoryItems.map(item => {
      const allocatedItem = items.find(allocItem => allocItem.id === item.id);
      
      if (allocatedItem) {
        return {
          ...item,
          quantity: item.quantity - allocatedItem.quantity,
        };
      }
      
      return item;
    });
    
    // Update the inventory
    await prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        items: JSON.stringify(updatedInventoryItems),
        updatedAt: new Date(),
      },
    });
    
    // Create or update the order inventory allocation
    const existingAllocation = await prisma.orderInventory.findFirst({
      where: {
        orderId,
        inventoryId: inventory.id,
      },
    });
    
    if (existingAllocation) {
      // Update existing allocation
      const existingItems = JSON.parse(existingAllocation.items || '[]');
      
      // Merge existing and new items
      const mergedItems = [...existingItems];
      
      for (const newItem of items) {
        const existingItemIndex = mergedItems.findIndex(item => item.id === newItem.id);
        
        if (existingItemIndex >= 0) {
          // Update existing item
          mergedItems[existingItemIndex] = {
            ...mergedItems[existingItemIndex],
            quantity: mergedItems[existingItemIndex].quantity + newItem.quantity,
          };
        } else {
          // Add new item
          mergedItems.push(newItem);
        }
      }
      
      await prisma.orderInventory.update({
        where: { id: existingAllocation.id },
        data: {
          items: JSON.stringify(mergedItems),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new allocation
      await prisma.orderInventory.create({
        data: {
          orderId,
          inventoryId: inventory.id,
          items: JSON.stringify(items),
        },
      });
    }
    
    // Create an audit log for the allocation
    await prisma.auditLog.create({
      data: {
        action: 'ALLOCATE_INVENTORY',
        entityType: 'ORDER',
        entityId: orderId,
        userId: session.user.id,
        details: JSON.stringify({
          vendorId,
          itemCount: items.length,
          items,
          updatedAt: new Date(),
        }),
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Inventory allocated successfully',
      allocatedItems: items,
    });
  } catch (error) {
    console.error('Error allocating inventory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to allocate inventory' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(allocateInventory, { limit: 50, windowMs: 60000 }); 