import { storage } from '../storage';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Service for monitoring system health and performance
 */
export const systemHealthService = {
  /**
   * Get system health metrics
   * @returns {Promise<object>} System health metrics
   */
  async getHealthMetrics() {
    try {
      // Get storage metrics
      const storageMetrics = await this.getStorageMetrics().catch(error => {
        console.error('Error getting storage metrics:', error);
        return {
          status: 'error',
          message: error.message,
          files: 0,
          totalSize: 0
        };
      });
      
      // Get system metrics
      const systemMetrics = this.getSystemMetrics();
      
      // Get API metrics
      const apiMetrics = await this.getApiMetrics().catch(error => {
        console.error('Error getting API metrics:', error);
        return {
          status: 'error',
          message: error.message,
          totalRequests: 0,
          endpoints: {},
          responseTime: {
            average: 0,
            min: 0,
            max: 0
          },
          errors: {
            total: 0,
            byType: {}
          }
        };
      });
      
      return {
        storage: storageMetrics,
        system: systemMetrics,
        api: apiMetrics,
        timestamp: new Date().toISOString(),
        status: this.determineOverallStatus(storageMetrics, systemMetrics, apiMetrics)
      };
    } catch (error) {
      console.error('Error getting system health metrics:', error);
      throw error;
    }
  },
  
  /**
   * Determine overall system status based on component statuses
   * @param {object} storage - Storage metrics
   * @param {object} system - System metrics
   * @param {object} api - API metrics
   * @returns {string} Overall status (healthy, warning, error)
   */
  determineOverallStatus(storage, system, api) {
    if (storage.status === 'error' || system.status === 'error' || api.status === 'error') {
      return 'error';
    }
    
    if (storage.status === 'warning' || system.status === 'warning' || api.status === 'warning') {
      return 'warning';
    }
    
    return 'healthy';
  },
  
  /**
   * Get storage metrics
   * @returns {Promise<object>} Storage metrics
   */
  async getStorageMetrics() {
    try {
      const dataPath = process.env.DATA_PATH || path.join(process.cwd(), 'data');
      
      // Check if data directory exists
      let dataDirectoryExists = false;
      try {
        await fs.access(dataPath);
        dataDirectoryExists = true;
      } catch (error) {
        dataDirectoryExists = false;
      }
      
      if (!dataDirectoryExists) {
        return {
          status: 'error',
          message: 'Data directory does not exist',
          files: 0,
          totalSize: 0
        };
      }
      
      // Get list of files in data directory
      const files = await fs.readdir(dataPath);
      
      // Get file stats
      let totalSize = 0;
      const fileStats = [];
      const filePromises = [];
      
      for (const file of files) {
        const filePath = path.join(dataPath, file);
        filePromises.push(
          fs.stat(filePath)
            .then(stats => {
              if (stats.isFile()) {
                totalSize += stats.size;
                fileStats.push({
                  name: file,
                  size: stats.size,
                  lastModified: stats.mtime
                });
              }
            })
            .catch(error => {
              console.warn(`Error getting stats for file ${file}:`, error);
            })
        );
      }
      
      // Wait for all file stats to be processed
      await Promise.allSettled(filePromises);
      
      // Determine status based on storage metrics
      let status = 'healthy';
      let message = '';
      
      // Check if there are too many files (potential issue)
      if (fileStats.length > 100) {
        status = 'warning';
        message = 'Large number of files detected';
      }
      
      // Check if total size is too large (potential issue)
      const maxSizeBytes = 100 * 1024 * 1024; // 100 MB
      if (totalSize > maxSizeBytes) {
        status = 'warning';
        message = message ? `${message}, large total size` : 'Large total size detected';
      }
      
      return {
        status,
        message,
        files: fileStats.length,
        totalSize,
        fileStats: fileStats.sort((a, b) => b.size - a.size) // Sort by size descending
      };
    } catch (error) {
      console.error('Error getting storage metrics:', error);
      return {
        status: 'error',
        message: error.message,
        files: 0,
        totalSize: 0
      };
    }
  },
  
  /**
   * Get system metrics
   * @returns {object} System metrics
   */
  getSystemMetrics() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsage = (usedMemory / totalMemory) * 100;
      
      const cpuUsage = os.loadavg()[0]; // 1 minute load average
      const cpuCount = os.cpus().length;
      const cpuUsagePercentage = (cpuUsage / cpuCount) * 100;
      
      const uptime = os.uptime();
      
      // Determine status based on resource usage
      let status = 'healthy';
      let message = '';
      
      // Check memory usage
      if (memoryUsage > 90) {
        status = 'error';
        message = 'Critical memory usage';
      } else if (memoryUsage > 75) {
        status = 'warning';
        message = 'High memory usage';
      }
      
      // Check CPU usage
      if (cpuUsagePercentage > 90) {
        status = status === 'error' ? 'error' : 'error';
        message = message ? `${message}, critical CPU usage` : 'Critical CPU usage';
      } else if (cpuUsagePercentage > 75) {
        status = status === 'error' ? 'error' : 'warning';
        message = message ? `${message}, high CPU usage` : 'High CPU usage';
      }
      
      return {
        status,
        message,
        memory: {
          total: totalMemory,
          free: freeMemory,
          used: usedMemory,
          usagePercentage: memoryUsage.toFixed(2)
        },
        cpu: {
          count: cpuCount,
          loadAverage: cpuUsage,
          usagePercentage: cpuUsagePercentage.toFixed(2)
        },
        uptime,
        platform: os.platform(),
        hostname: os.hostname(),
        nodeVersion: process.version
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  },
  
  /**
   * Get API metrics
   * @returns {Promise<object>} API metrics
   */
  async getApiMetrics() {
    try {
      // Get API metrics from storage with retry mechanism
      let apiMetrics;
      let retries = 3;
      
      while (retries > 0) {
        try {
          apiMetrics = await storage.readData('api_metrics.json');
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
        }
      }
      
      // Default metrics if none exist
      if (!apiMetrics) {
        return {
          status: 'healthy',
          message: 'No API metrics recorded yet',
          totalRequests: 0,
          endpoints: {},
          responseTime: {
            average: 0,
            min: 0,
            max: 0,
            total: 0
          },
          errors: {
            total: 0,
            byType: {}
          },
          lastUpdated: null
        };
      }
      
      // Determine status based on error rate and response time
      let status = 'healthy';
      let message = '';
      
      // Calculate error rate
      const errorRate = apiMetrics.totalRequests > 0 
        ? (apiMetrics.errors.total / apiMetrics.totalRequests) * 100 
        : 0;
      
      // Check error rate
      if (errorRate > 10) {
        status = 'error';
        message = 'High API error rate';
      } else if (errorRate > 5) {
        status = 'warning';
        message = 'Elevated API error rate';
      }
      
      // Check response time
      if (apiMetrics.responseTime && apiMetrics.responseTime.average > 1000) {
        status = status === 'error' ? 'error' : 'warning';
        message = message ? `${message}, slow response time` : 'Slow API response time';
      }
      
      return {
        status,
        message,
        ...apiMetrics
      };
    } catch (error) {
      console.error('Error getting API metrics:', error);
      return {
        status: 'error',
        message: error.message,
        totalRequests: 0,
        endpoints: {},
        responseTime: {
          average: 0,
          min: 0,
          max: 0
        },
        errors: {
          total: 0,
          byType: {}
        },
        lastUpdated: null
      };
    }
  },
  
  /**
   * Record API request metrics
   * @param {string} endpoint - API endpoint
   * @param {number} responseTime - Response time in milliseconds
   * @param {number} statusCode - HTTP status code
   * @returns {Promise<void>}
   */
  async recordApiMetrics(endpoint, responseTime, statusCode) {
    try {
      // Validate inputs
      if (!endpoint || typeof endpoint !== 'string') {
        console.warn('Invalid endpoint provided to recordApiMetrics');
        return;
      }
      
      if (typeof responseTime !== 'number' || responseTime < 0) {
        console.warn('Invalid response time provided to recordApiMetrics');
        return;
      }
      
      if (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
        console.warn('Invalid status code provided to recordApiMetrics');
        return;
      }
      
      // Get current metrics with retry mechanism
      let apiMetrics;
      let retries = 3;
      
      while (retries > 0) {
        try {
          apiMetrics = await storage.readData('api_metrics.json');
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.error('Failed to read API metrics after retries:', error);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
        }
      }
      
      // Initialize metrics if they don't exist
      if (!apiMetrics) {
        apiMetrics = {
          totalRequests: 0,
          endpoints: {},
          responseTime: {
            average: 0,
            min: Infinity,
            max: 0,
            total: 0
          },
          errors: {
            total: 0,
            byType: {}
          },
          lastUpdated: null
        };
      }
      
      // Update total requests
      apiMetrics.totalRequests += 1;
      
      // Update endpoint metrics
      if (!apiMetrics.endpoints[endpoint]) {
        apiMetrics.endpoints[endpoint] = {
          requests: 0,
          errors: 0
        };
      }
      
      apiMetrics.endpoints[endpoint].requests += 1;
      
      // Update response time metrics
      const totalResponseTime = (apiMetrics.responseTime.total || 0) + responseTime;
      apiMetrics.responseTime.total = totalResponseTime;
      apiMetrics.responseTime.average = totalResponseTime / apiMetrics.totalRequests;
      
      // Handle the case where min is Infinity (first request)
      if (apiMetrics.responseTime.min === Infinity) {
        apiMetrics.responseTime.min = responseTime;
      } else {
        apiMetrics.responseTime.min = Math.min(apiMetrics.responseTime.min, responseTime);
      }
      
      apiMetrics.responseTime.max = Math.max(apiMetrics.responseTime.max || 0, responseTime);
      
      // Update error metrics if status code is 4xx or 5xx
      if (statusCode >= 400) {
        apiMetrics.errors.total = (apiMetrics.errors.total || 0) + 1;
        apiMetrics.endpoints[endpoint].errors += 1;
        
        const errorType = `${Math.floor(statusCode / 100)}xx`;
        if (!apiMetrics.errors.byType[errorType]) {
          apiMetrics.errors.byType[errorType] = 0;
        }
        apiMetrics.errors.byType[errorType] += 1;
      }
      
      // Update last updated timestamp
      apiMetrics.lastUpdated = new Date().toISOString();
      
      // Save updated metrics with retry mechanism
      retries = 3;
      
      while (retries > 0) {
        try {
          await storage.writeData('api_metrics.json', apiMetrics);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.error('Failed to write API metrics after retries:', error);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
        }
      }
    } catch (error) {
      console.error('Error recording API metrics:', error);
    }
  }
}; 