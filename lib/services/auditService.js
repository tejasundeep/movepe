import { storage } from '../storage';

/**
 * Service for tracking admin actions for audit purposes
 */
export const auditService = {
  /**
   * Log an admin action
   * @param {string} adminEmail - Email of the admin performing the action
   * @param {string} action - Description of the action performed
   * @param {string} entityType - Type of entity affected (user, vendor, order, etc.)
   * @param {string} entityId - ID of the entity affected
   * @param {object} details - Additional details about the action
   * @returns {Promise<object>} The created audit log entry
   */
  async logAction(adminEmail, action, entityType, entityId, details = {}) {
    try {
      // Validate required parameters
      if (!adminEmail) {
        throw new Error('Admin email is required');
      }
      
      if (!action) {
        throw new Error('Action is required');
      }
      
      if (!entityType) {
        throw new Error('Entity type is required');
      }
      
      if (!entityId) {
        throw new Error('Entity ID is required');
      }
      
      // Sanitize inputs
      const sanitizedDetails = typeof details === 'object' ? details : {};
      
      // Create audit log entry
      const auditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        adminEmail: String(adminEmail).trim().toLowerCase(),
        action: String(action).trim(),
        entityType: String(entityType).trim().toLowerCase(),
        entityId: String(entityId),
        details: sanitizedDetails,
        timestamp: new Date().toISOString()
      };
      
      // Read existing audit logs with retry mechanism
      let auditLogs = [];
      let retries = 3;
      
      while (retries > 0) {
        try {
          auditLogs = await storage.readData('audit_logs.json') || [];
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
        }
      }
      
      // Add new log to the beginning of the array
      auditLogs.unshift(auditLog);
      
      // Keep only the last 1000 logs to prevent the file from growing too large
      const trimmedLogs = auditLogs.slice(0, 1000);
      
      // Save updated logs with retry mechanism
      retries = 3;
      
      while (retries > 0) {
        try {
          await storage.writeData('audit_logs.json', trimmedLogs);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
        }
      }
      
      return auditLog;
    } catch (error) {
      console.error('Error logging admin action:', error);
      throw error;
    }
  },
  
  /**
   * Get audit logs with pagination and filtering
   * @param {object} options - Query options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Number of logs per page
   * @param {string} options.adminEmail - Filter by admin email
   * @param {string} options.entityType - Filter by entity type
   * @param {string} options.action - Filter by action
   * @param {string} options.startDate - Filter by start date (ISO string)
   * @param {string} options.endDate - Filter by end date (ISO string)
   * @returns {Promise<object>} Paginated audit logs and metadata
   */
  async getLogs(options = {}) {
    try {
      // Set default options and validate
      const {
        page = 1,
        limit = 20,
        adminEmail,
        entityType,
        action,
        startDate,
        endDate
      } = options;
      
      // Validate pagination parameters
      const validPage = Math.max(1, parseInt(page, 10) || 1);
      const validLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      
      // Read all audit logs with retry mechanism
      let auditLogs = [];
      let retries = 3;
      
      while (retries > 0) {
        try {
          auditLogs = await storage.readData('audit_logs.json') || [];
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
        }
      }
      
      // Apply filters
      if (adminEmail) {
        const emailFilter = adminEmail.trim().toLowerCase();
        auditLogs = auditLogs.filter(log => 
          log.adminEmail && log.adminEmail.toLowerCase().includes(emailFilter)
        );
      }
      
      if (entityType) {
        const typeFilter = entityType.trim().toLowerCase();
        auditLogs = auditLogs.filter(log => 
          log.entityType && log.entityType.toLowerCase() === typeFilter
        );
      }
      
      if (action) {
        const actionFilter = action.trim().toLowerCase();
        auditLogs = auditLogs.filter(log => 
          log.action && log.action.toLowerCase().includes(actionFilter)
        );
      }
      
      if (startDate) {
        try {
          const start = new Date(startDate);
          auditLogs = auditLogs.filter(log => 
            log.timestamp && new Date(log.timestamp) >= start
          );
        } catch (error) {
          console.warn('Invalid start date format:', error);
        }
      }
      
      if (endDate) {
        try {
          const end = new Date(endDate);
          // Add one day to include the end date fully
          end.setDate(end.getDate() + 1);
          auditLogs = auditLogs.filter(log => 
            log.timestamp && new Date(log.timestamp) <= end
          );
        } catch (error) {
          console.warn('Invalid end date format:', error);
        }
      }
      
      // Calculate pagination
      const totalLogs = auditLogs.length;
      const totalPages = Math.ceil(totalLogs / validLimit);
      const offset = (validPage - 1) * validLimit;
      const paginatedLogs = auditLogs.slice(offset, offset + validLimit);
      
      return {
        logs: paginatedLogs,
        pagination: {
          page: validPage,
          limit: validLimit,
          totalLogs,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }
}; 