import { storage, inventoryStorage, orderStorage } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import { analyticsService } from './analyticsService';

class InventoryService {
  /**
   * Create inventory for an order
   * @param {string} orderId - Order ID
   * @param {Array} items - Array of inventory items
   * @returns {Promise<Object>} - Created inventory
   */
  async createInventory(orderId, items) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    if (!Array.isArray(items)) {
      throw new Error('Items must be an array');
    }
    
    // Get order to verify it exists
    const order = await orderStorage.getById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Check if inventory already exists for this order
    const existingInventory = await this.getInventoryByOrderId(orderId);
    if (existingInventory) {
      throw new Error('Inventory already exists for this order');
    }
    
    // Process items to ensure they have IDs and timestamps
    const processedItems = items.map(item => ({
      itemId: item.itemId || uuidv4(),
      name: item.name,
      category: item.category,
      description: item.description || '',
      quantity: item.quantity || 1,
      specialHandling: item.specialHandling || false,
      specialHandlingInstructions: item.specialHandlingInstructions || '',
      value: item.value || 0,
      condition: item.condition || 'Good',
      dimensions: item.dimensions || null,
      weight: item.weight || null,
      photos: item.photos || [],
      createdAt: new Date().toISOString()
    }));
    
    // Create new inventory
    const newInventory = {
      id: uuidv4(),
      vendorId: order.vendorId,
      items: processedItems,
      totalItems: processedItems.length,
      totalValue: processedItems.reduce((sum, item) => sum + (item.value || 0), 0),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'Created'
    };
    
    // Save inventory using Prisma
    const createdInventory = await inventoryStorage.create(newInventory);
    
    // Update order with inventory ID
    await orderStorage.update(orderId, {
      inventoryId: createdInventory.id
    });
    
    // Track inventory creation event
    await analyticsService.trackEvent('inventory_created', {
      inventoryId: createdInventory.id,
      orderId: orderId,
      itemCount: createdInventory.items.length
    });
    
    return createdInventory;
  }
  
  /**
   * Get inventory by order ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object|null>} - Inventory or null if not found
   */
  async getInventoryByOrderId(orderId) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    
    // Get order to find inventory ID
    const order = await orderStorage.getById(orderId);
    if (!order || !order.inventoryId) {
      return null;
    }
    
    // Get inventory by ID
    return await inventoryStorage.getById(order.inventoryId);
  }
  
  /**
   * Update inventory item condition
   * @param {string} inventoryId - Inventory ID
   * @param {string} itemId - Item ID
   * @param {string} condition - New condition
   * @param {string} notes - Condition notes
   * @param {Array} photos - Condition photos
   * @returns {Promise<Object>} - Updated inventory
   */
  async updateItemCondition(inventoryId, itemId, condition, notes, photos) {
    if (!inventoryId || !itemId || !condition) {
      throw new Error('Inventory ID, item ID, and condition are required');
    }
    
    // Get inventory
    const inventory = await inventoryStorage.getById(inventoryId);
    if (!inventory) {
      throw new Error('Inventory not found');
    }
    
    // Find and update the item
    const items = inventory.items;
    const itemIndex = items.findIndex(item => item.itemId === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Item not found in inventory');
    }
    
    // Update item condition
    items[itemIndex] = {
      ...items[itemIndex],
      condition,
      conditionNotes: notes || '',
      conditionPhotos: photos || [],
      conditionUpdatedAt: new Date().toISOString()
    };
    
    // Update inventory in database
    const updatedInventory = await inventoryStorage.update(inventoryId, {
      items,
      updatedAt: new Date()
    });
    
    // Track item condition update event
    await analyticsService.trackEvent('item_condition_updated', {
      inventoryId,
      itemId,
      condition
    });
    
    return updatedInventory;
  }
  
  /**
   * Verify inventory at delivery
   * @param {string} orderId - Order ID
   * @param {Array} itemConditions - Array of item conditions
   * @param {string} verifiedBy - User who verified the inventory
   * @returns {Promise<Object>} - Updated inventory
   */
  async verifyInventoryAtDelivery(orderId, itemConditions, verifiedBy) {
    if (!orderId || !Array.isArray(itemConditions)) {
      throw new Error('Order ID and item conditions are required');
    }
    
    // Get inventory
    const inventory = await this.getInventoryByOrderId(orderId);
    if (!inventory) {
      throw new Error('Inventory not found for this order');
    }
    
    // Update item conditions
    for (const condition of itemConditions) {
      await this.updateItemCondition(
        inventory.id,
        condition.itemId,
        condition.condition,
        condition.notes,
        condition.photos
      );
    }
    
    // Get updated inventory
    const updatedInventory = await this.getInventoryByOrderId(orderId);
    
    // Track inventory verification event
    await analyticsService.trackEvent('inventory_verified', {
      inventoryId: updatedInventory.id,
      orderId: orderId,
      verifiedBy,
      itemCount: updatedInventory.items.length,
      damagedItemCount: updatedInventory.items.filter(item => 
        item.condition && item.condition !== 'Excellent'
      ).length
    });
    
    // Update inventory status
    const finalInventory = await inventoryStorage.update(updatedInventory.id, {
      status: 'Verified',
      verifiedAt: new Date(),
      verifiedBy: verifiedBy
    });
    
    return finalInventory;
  }
}

// Export a singleton instance
export const inventoryService = new InventoryService(); 