import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Mutex for file operations to prevent race conditions
const fileLocks = {};

// Get a lock for a file
const acquireLock = async (filename) => {
  if (!fileLocks[filename]) {
    fileLocks[filename] = {
      locked: false,
      queue: []
    };
  }
  
  const lock = fileLocks[filename];
  
  if (lock.locked) {
    // Wait for lock to be released
    return new Promise(resolve => {
      lock.queue.push(resolve);
    });
  }
  
  lock.locked = true;
  return Promise.resolve();
};

// Release a lock for a file
const releaseLock = (filename) => {
  const lock = fileLocks[filename];
  if (!lock) return;
  
  if (lock.queue.length > 0) {
    // Release to next in queue
    const next = lock.queue.shift();
    next();
  } else {
    lock.locked = false;
  }
};

// In-memory cache for frequently accessed data
const cache = {
  data: {},
  timestamps: {},
  ttl: {
    'riders.json': 60 * 1000, // 1 minute for riders (frequently updated)
    'orders.json': 5 * 60 * 1000, // 5 minutes for orders
    'default': 15 * 60 * 1000 // 15 minutes default
  },
  
  // Get TTL for a specific file
  getTTL(filename) {
    return this.ttl[filename] || this.ttl.default;
  },
  
  // Check if cache is valid
  isValid(filename) {
    if (!this.timestamps[filename]) return false;
    
    const now = Date.now();
    const timestamp = this.timestamps[filename];
    const ttl = this.getTTL(filename);
    
    return (now - timestamp) < ttl;
  },
  
  // Get data from cache
  get(filename) {
    if (this.isValid(filename)) {
      return this.data[filename];
    }
    return null;
  },
  
  // Set data in cache
  set(filename, data) {
    if (!data) return; // Don't cache null or undefined
    
    try {
      // Deep clone to prevent reference issues
      this.data[filename] = JSON.parse(JSON.stringify(data));
      this.timestamps[filename] = Date.now();
    } catch (error) {
      console.error(`Error caching data for ${filename}:`, error);
      // If we can't cache it, just skip it
    }
  },
  
  // Invalidate cache for a file
  invalidate(filename) {
    delete this.data[filename];
    delete this.timestamps[filename];
  },
  
  // Invalidate all cache
  invalidateAll() {
    this.data = {};
    this.timestamps = {};
  }
};

const DATA_PATH = process.env.DATA_PATH || path.join(process.cwd(), 'data')

class Storage {
  constructor() {
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(DATA_PATH, { recursive: true })
    } catch (error) {
      console.error('Error creating data directory:', error)
    }
  }

  /**
   * Read data from a file
   * @param {string} filename - Name of the data file
   * @returns {Promise<any>} - Parsed data from the file
   */
  async readData(filename) {
    // Check cache first for performance
    const cachedData = cache.get(filename);
    if (cachedData) {
      return JSON.parse(JSON.stringify(cachedData));
    }

    await this.ensureDataDirectory();
    const filePath = path.join(DATA_PATH, filename);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      let parsedData;
      
      try {
        parsedData = JSON.parse(data);
      } catch (parseError) {
        console.error(`Error parsing JSON from ${filename}:`, parseError);
        
        // Try to recover from backup
        const backupData = await this.recoverFromBackup(filename);
        if (backupData) {
          console.log(`Recovered data for ${filename} from backup`);
          parsedData = backupData;
        } else {
          console.warn(`Could not recover data for ${filename}, returning empty array`);
          parsedData = [];
        }
      }
      
      // Cache the data
      cache.set(filename, parsedData);
      
      return parsedData;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty array
        return [];
      }
      
      console.error(`Error reading data from ${filename}:`, error);
      
      // Try to recover from backup
      const backupData = await this.recoverFromBackup(filename);
      if (backupData) {
        console.log(`Recovered data for ${filename} from backup`);
        return backupData;
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Write data to a file
   * @param {string} filename - Name of the data file
   * @param {any} data - Data to write to the file
   * @returns {Promise<boolean>} - Whether the write was successful
   */
  async writeData(filename, data) {
    if (!data) {
      console.error(`Attempted to write null or undefined data to ${filename}`);
      return false;
    }
    
    await this.ensureDataDirectory();
    const filePath = path.join(DATA_PATH, filename);
    
    // Acquire lock to prevent concurrent writes
    await acquireLock(filename);
    
    try {
      // Create a backup before writing
      await this.createBackup(filename);
      
      // Format data with pretty-printing for readability
      const jsonData = JSON.stringify(data, null, 2);
      
      // Write to a temporary file first
      const tempFilePath = `${filePath}.tmp`;
      await fs.writeFile(tempFilePath, jsonData, 'utf8');
      
      // Rename temp file to actual file (atomic operation)
      await fs.rename(tempFilePath, filePath);
      
      // Update cache
      cache.set(filename, data);
      
      return true;
    } catch (error) {
      console.error(`Error writing data to ${filename}:`, error);
      return false;
    } finally {
      // Release lock
      releaseLock(filename);
    }
  }

  /**
   * Update data in a file using a callback function
   * @param {string} filename - Name of the data file
   * @param {Function} updateFn - Function to update the data
   * @returns {Promise<boolean>} - Whether the update was successful
   */
  async updateData(filename, updateFn) {
    // Acquire lock to prevent concurrent updates
    await acquireLock(filename);
    
    try {
      const data = await this.readData(filename);
      
      let updatedData;
      try {
        updatedData = updateFn(data || []);
      } catch (updateError) {
        console.error(`Error in update function for ${filename}:`, updateError);
        throw updateError;
      }
      
      if (!updatedData) {
        throw new Error('Update function did not return data');
      }
      
      const success = await this.writeData(filename, updatedData);
      
      // Invalidate cache to ensure fresh data on next read
      if (success) {
        cache.set(filename, updatedData);
      } else {
        cache.invalidate(filename);
      }
      
      return success;
    } catch (error) {
      console.error(`Error updating data in ${filename}:`, error);
      cache.invalidate(filename); // Invalidate cache on error
      return false;
    } finally {
      // Release lock
      releaseLock(filename);
    }
  }

  /**
   * Clear cache for a specific file or all files
   * @param {string} [filename] - Name of the file to clear cache for, or undefined for all
   */
  clearCache(filename) {
    if (filename) {
      cache.invalidate(filename);
    } else {
      cache.invalidateAll();
    }
  }

  /**
   * Create a backup of a data file
   * @param {string} filename - Name of the data file
   * @returns {Promise<string|null>} - Backup filename or null if failed
   */
  async createBackup(filename) {
    await this.ensureDataDirectory();
    const filePath = path.join(DATA_PATH, filename);
    
    // Check if file exists before backing up
    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, no need to back up
      return null;
    }
    
    const backupDir = path.join(DATA_PATH, 'backups');
    const backupFilename = `${path.basename(filename, path.extname(filename))}_${Date.now()}_${uuidv4().substring(0, 8)}${path.extname(filename)}`;
    const backupFilePath = path.join(backupDir, backupFilename);
    
    try {
      // Ensure backups directory exists
      await fs.mkdir(backupDir, { recursive: true });
      
      // Copy file to backup
      await fs.copyFile(filePath, backupFilePath);
      
      // Clean up old backups (keep only last 5)
      await this.cleanupOldBackups(filename);
      
      return backupFilename;
    } catch (error) {
      console.error(`Error creating backup of ${filename}:`, error);
      return null;
    }
  }
  
  /**
   * Clean up old backups, keeping only the most recent ones
   * @param {string} filename - Base filename
   * @param {number} keepCount - Number of backups to keep
   * @returns {Promise<void>}
   */
  async cleanupOldBackups(filename, keepCount = 5) {
    const backupDir = path.join(DATA_PATH, 'backups');
    const baseFilename = path.basename(filename, path.extname(filename));
    const extension = path.extname(filename);
    
    try {
      // Get all backup files for this filename
      const files = await fs.readdir(backupDir);
      const backups = files
        .filter(file => file.startsWith(baseFilename) && file.endsWith(extension))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          timestamp: parseInt(file.split('_')[1] || '0')
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
      
      // Delete older backups
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        for (const backup of toDelete) {
          try {
            await fs.unlink(backup.path);
          } catch (error) {
            console.error(`Error deleting old backup ${backup.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error cleaning up old backups for ${filename}:`, error);
    }
  }
  
  /**
   * Recover data from the most recent backup
   * @param {string} filename - Name of the data file
   * @returns {Promise<any|null>} - Recovered data or null if recovery failed
   */
  async recoverFromBackup(filename) {
    const backupDir = path.join(DATA_PATH, 'backups');
    const baseFilename = path.basename(filename, path.extname(filename));
    const extension = path.extname(filename);
    
    try {
      // Get all backup files for this filename
      const files = await fs.readdir(backupDir);
      const backups = files
        .filter(file => file.startsWith(baseFilename) && file.endsWith(extension))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          timestamp: parseInt(file.split('_')[1] || '0')
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
      
      if (backups.length === 0) {
        return null;
      }
      
      // Try to read the most recent backup
      const mostRecent = backups[0];
      const data = await fs.readFile(mostRecent.path, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error recovering from backup for ${filename}:`, error);
      return null;
    }
  }
}

export const storage = new Storage(); 