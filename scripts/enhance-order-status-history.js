/**
 * Script to enhance existing orders with status history for bottleneck analysis
 * 
 * This script creates synthetic status history entries for existing orders
 * that don't have proper status history tracking, enabling bottleneck analysis
 * on historical data.
 */

const { storage } = require('../lib/storage');
const { operationalAnalyticsService } = require('../lib/services/operationalAnalyticsService');
const fs = require('fs').promises;
const path = require('path');

// Configurable settings
const CONFIG = {
  BACKUP_BEFORE_ENHANCEMENT: true,
  BACKUP_DIR: path.join(process.cwd(), 'data', 'backups'),
  LOG_FILE: path.join(process.cwd(), 'logs', 'enhancement.log'),
  DETAILED_REPORTING: true,
};

/**
 * Create a backup of orders data before making changes
 * @returns {Promise<boolean>} Success status
 */
async function createBackup() {
  if (!CONFIG.BACKUP_BEFORE_ENHANCEMENT) return true;
  
  try {
    // Create backup directory if it doesn't exist
    try {
      await fs.mkdir(CONFIG.BACKUP_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating backup directory:', error);
      return false;
    }
    
    // Read the current orders data
    const orders = await storage.readData('orders.json');
    if (!orders) {
      console.error('No orders data found to backup');
      return false;
    }
    
    // Create a timestamp for the backup file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFile = path.join(CONFIG.BACKUP_DIR, `orders_backup_${timestamp}.json`);
    
    // Write the backup file
    await fs.writeFile(backupFile, JSON.stringify(orders, null, 2));
    console.log(`Backup created at: ${backupFile}`);
    return true;
  } catch (error) {
    console.error('Error creating backup:', error);
    return false;
  }
}

/**
 * Log a message to both console and log file
 * @param {string} message - Message to log
 * @param {string} level - Log level (info, warn, error)
 */
async function log(message, level = 'info') {
  // Create timestamp
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  // Log to console with appropriate color
  switch (level) {
    case 'warn':
      console.warn(logEntry);
      break;
    case 'error':
      console.error(logEntry);
      break;
    default:
      console.log(logEntry);
  }
  
  // Log to file if configured
  try {
    // Create logs directory if it doesn't exist
    const logsDir = path.dirname(CONFIG.LOG_FILE);
    await fs.mkdir(logsDir, { recursive: true });
    
    // Append to log file
    await fs.appendFile(CONFIG.LOG_FILE, logEntry + '\n');
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

/**
 * Generate a detailed report of the enhancement process
 * @param {Array} originalOrders - Orders before enhancement
 * @param {Array} enhancedOrders - Orders after enhancement
 */
async function generateReport(originalOrders, enhancedOrders) {
  if (!CONFIG.DETAILED_REPORTING) return;
  
  try {
    // Create a timestamp for the report file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const reportFile = path.join(process.cwd(), 'reports', `status_history_enhancement_${timestamp}.json`);
    
    // Create reports directory if it doesn't exist
    await fs.mkdir(path.dirname(reportFile), { recursive: true });
    
    // Build report data
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOrders: originalOrders.length,
        ordersEnhanced: 0,
        statusEntriesAdded: 0,
        statusEntriesCorrected: 0,
      },
      details: []
    };
    
    // Compare each order before and after
    originalOrders.forEach((originalOrder, index) => {
      if (!originalOrder || !originalOrder.orderId) return;
      
      const enhancedOrder = enhancedOrders.find(o => o.orderId === originalOrder.orderId);
      if (!enhancedOrder) return;
      
      const originalHistory = Array.isArray(originalOrder.statusHistory) ? originalOrder.statusHistory : [];
      const enhancedHistory = Array.isArray(enhancedOrder.statusHistory) ? enhancedOrder.statusHistory : [];
      
      if (enhancedHistory.length > originalHistory.length) {
        report.summary.ordersEnhanced++;
        report.summary.statusEntriesAdded += (enhancedHistory.length - originalHistory.length);
        
        report.details.push({
          orderId: originalOrder.orderId,
          originalHistoryCount: originalHistory.length,
          enhancedHistoryCount: enhancedHistory.length,
          entriesAdded: enhancedHistory.length - originalHistory.length
        });
      }
    });
    
    // Write the report file
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    await log(`Enhancement report created at: ${reportFile}`);
    
    // Log summary to console
    await log(`Enhancement Summary:
  - Total Orders Processed: ${report.summary.totalOrders}
  - Orders Enhanced: ${report.summary.ordersEnhanced}
  - Status Entries Added: ${report.summary.statusEntriesAdded}
  - Status Entries Corrected: ${report.summary.statusEntriesCorrected}`);
  } catch (error) {
    console.error('Error generating report:', error);
  }
}

/**
 * Main function to enhance order status history
 */
async function enhanceOrdersWithStatusHistory() {
  await log('Starting order status history enhancement...');
  
  try {
    // Create backup before making changes
    const backupSuccess = await createBackup();
    if (!backupSuccess) {
      await log('Warning: Failed to create backup before proceeding', 'warn');
    }
    
    // Get all orders before enhancement
    const originalOrders = await storage.readData('orders.json');
    
    if (!originalOrders || !Array.isArray(originalOrders)) {
      await log('No orders found or orders data is not an array', 'error');
      return;
    }
    
    await log(`Found ${originalOrders.length} orders to process`);
    
    // Count how many orders need enhancement
    const ordersWithoutHistory = originalOrders.filter(order => 
      !order.statusHistory || !Array.isArray(order.statusHistory) || order.statusHistory.length < 2
    );
    await log(`${ordersWithoutHistory.length} orders need status history enhancement`);
    
    if (ordersWithoutHistory.length === 0) {
      await log('No orders require enhancement, exiting.');
      return;
    }
    
    // Set up performance monitoring
    const startTime = Date.now();
    
    // Perform the enhancement using the operational analytics service
    const success = await operationalAnalyticsService.enhanceOrdersWithStatusHistory();
    
    // Calculate execution time
    const executionTime = (Date.now() - startTime) / 1000;
    
    if (success) {
      await log(`Successfully enhanced order status history (took ${executionTime.toFixed(2)} seconds)`);
      
      // Verify the enhancement
      const enhancedOrders = await storage.readData('orders.json');
      
      if (!enhancedOrders || !Array.isArray(enhancedOrders)) {
        await log('Failed to verify enhanced orders', 'error');
        return;
      }
      
      const nowWithHistory = enhancedOrders.filter(order => 
        order && order.statusHistory && Array.isArray(order.statusHistory) && order.statusHistory.length >= 1
      );
      
      await log(`Before: ${originalOrders.length - ordersWithoutHistory.length} orders had status history`);
      await log(`After: ${nowWithHistory.length} orders have status history`);
      await log(`Enhanced ${nowWithHistory.length - (originalOrders.length - ordersWithoutHistory.length)} orders`);
      
      // Generate detailed report if configured
      await generateReport(originalOrders, enhancedOrders);
      
    } else {
      await log('Failed to enhance order status history', 'error');
    }
  } catch (error) {
    await log(`Error enhancing order status history: ${error.message}`, 'error');
    console.error(error);
  }
}

// Run the enhancement with proper error handling
enhanceOrdersWithStatusHistory().then(() => {
  log('Finished order status history enhancement process');
  process.exit(0);
}).catch(error => {
  log(`Fatal error during enhancement: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
}); 