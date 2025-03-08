import { storage } from '../storage';
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
    const orders = await storage.readData('orders.json');
    if (!orders) {
      throw new Error('Orders data not found');
    }
    
    const order = orders.find(o => o.orderId === orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Check if inventory already exists
    const inventories = await storage.readData('inventories.json') || [];
    const existingInventory = inventories.find(i => i.orderId === orderId);
    
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
      inventoryId: uuidv4(),
      orderId,
      items: processedItems,
      totalItems: processedItems.length,
      totalValue: processedItems.reduce((sum, item) => sum + (item.value || 0), 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Created'
    };
    
    // Save inventory
    await storage.updateData('inventories.json', (inventories) => {
      return [...(inventories || []), newInventory];
    });
    
    // Update order with inventory ID
    await storage.updateData('orders.json', (orders) => {
      const orderIndex = orders.findIndex(o => o.orderId === orderId);
      if (orderIndex >= 0) {
        orders[orderIndex].inventoryId = newInventory.inventoryId;
      }
      return orders;
    });
    
    // Track inventory creation event
    await analyticsService.trackEvent('inventory_created', {
      inventoryId: newInventory.inventoryId,
      orderId: newInventory.orderId,
      itemCount: newInventory.items.length
    });
    
    return newInventory;
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
    
    const inventories = await storage.readData('inventories.json');
    if (!inventories) {
      return null;
    }
    
    return inventories.find(i => i.orderId === orderId) || null;
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
    
    let updatedInventory = null;
    
    await storage.updateData('inventories.json', (inventories) => {
      if (!inventories) {
        throw new Error('Inventories data not found');
      }
      
      const inventoryIndex = inventories.findIndex(i => i.inventoryId === inventoryId);
      if (inventoryIndex === -1) {
        throw new Error('Inventory not found');
      }
      
      const inventory = inventories[inventoryIndex];
      const itemIndex = inventory.items.findIndex(item => item.itemId === itemId);
      
      if (itemIndex === -1) {
        throw new Error('Item not found in inventory');
      }
      
      // Update item condition
      inventory.items[itemIndex] = {
        ...inventory.items[itemIndex],
        condition,
        conditionNotes: notes || '',
        conditionPhotos: photos || [],
        conditionUpdatedAt: new Date().toISOString()
      };
      
      // Update inventory
      inventories[inventoryIndex] = {
        ...inventory,
        updatedAt: new Date().toISOString()
      };
      
      updatedInventory = inventories[inventoryIndex];
      return inventories;
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
        inventory.inventoryId,
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
      inventoryId: updatedInventory.inventoryId,
      orderId: updatedInventory.orderId,
      verifiedBy,
      itemCount: updatedInventory.items.length,
      damagedItemCount: updatedInventory.items.filter(item => 
        item.deliveryCondition && item.deliveryCondition !== 'Excellent'
      ).length
    });
    
    // Update inventory status
    await storage.updateData('inventories.json', (inventories) => {
      const inventoryIndex = inventories.findIndex(i => i.inventoryId === updatedInventory.inventoryId);
      if (inventoryIndex >= 0) {
        inventories[inventoryIndex].status = 'Verified';
        inventories[inventoryIndex].verifiedAt = new Date().toISOString();
        inventories[inventoryIndex].verifiedBy = verifiedBy;
      }
      return inventories;
    });
    
    return this.getInventoryByOrderId(orderId);
  }
}

// Export a singleton instance
export const inventoryService = new InventoryService(); 