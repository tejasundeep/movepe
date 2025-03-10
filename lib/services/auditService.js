import { storage, auditStorage, userStorage } from '../storage';
import { v4 as uuidv4 } from 'uuid';

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
      
      // Find the user by email
      const user = await userStorage.getByEmail(adminEmail);
      const userId = user ? user.id : null;
      
      // Create audit log entry
      const auditLog = {
        id: uuidv4(),
        action: String(action).trim(),
        entityType: String(entityType).trim().toLowerCase(),
        entityId: String(entityId),
        userId,
        details: sanitizedDetails,
        createdAt: new Date()
      };
      
      // Save to database using Prisma
      const createdLog = await auditStorage.create(auditLog);
      
      return createdLog;
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
   * @param {string} options.userId - Filter by user ID
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
      
      // If adminEmail is provided, find the user ID
      let userId = options.userId;
      if (adminEmail && !userId) {
        const user = await userStorage.getByEmail(adminEmail);
        userId = user ? user.id : null;
      }
      
      // Get paginated logs using Prisma
      return await auditStorage.getPaginated({
        page: validPage,
        limit: validLimit,
        userId,
        entityType,
        action,
        startDate,
        endDate
      });
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }
}; 