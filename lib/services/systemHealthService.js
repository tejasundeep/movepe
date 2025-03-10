import { storage, systemHealthStorage } from '../storage';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

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
      // Get API metrics summary from Prisma
      const summary = await systemHealthStorage.getApiMetricsSummary();
      
      // Process endpoint stats
      const endpoints = {};
      if (summary.endpointStats) {
        for (const stat of summary.endpointStats) {
          endpoints[stat.endpoint] = {
            requests: Number(stat.count),
            avgResponseTime: Number(stat.avgResponseTime)
          };
        }
      }
      
      // Process status code stats
      const errorsByType = {};
      if (summary.statusCodeStats) {
        for (const stat of summary.statusCodeStats) {
          if (stat.statusCode >= 400) {
            const errorType = `${Math.floor(stat.statusCode / 100)}xx`;
            if (!errorsByType[errorType]) {
              errorsByType[errorType] = 0;
            }
            errorsByType[errorType] += Number(stat.count);
          }
        }
      }
      
      // Get min and max response times
      const allMetrics = await systemHealthStorage.getAllApiMetrics();
      let minResponseTime = Infinity;
      let maxResponseTime = 0;
      
      for (const metric of allMetrics) {
        minResponseTime = Math.min(minResponseTime, metric.responseTime);
        maxResponseTime = Math.max(maxResponseTime, metric.responseTime);
      }
      
      // If no metrics, set min to 0
      if (minResponseTime === Infinity) {
        minResponseTime = 0;
      }
      
      // Determine status based on metrics
      let status = 'healthy';
      let message = '';
      
      // Check error rate
      if (summary.errorRate > 10) {
        status = 'error';
        message = 'High API error rate';
      } else if (summary.errorRate > 5) {
        status = 'warning';
        message = 'Elevated API error rate';
      }
      
      // Check average response time
      if (summary.avgResponseTime > 1000) {
        status = status === 'error' ? 'error' : 'warning';
        message = message ? `${message}, high average response time` : 'High average response time';
      }
      
      return {
        status,
        message,
        totalRequests: summary.totalRequests,
        endpoints,
        responseTime: {
          average: summary.avgResponseTime,
          min: minResponseTime,
          max: maxResponseTime
        },
        errors: {
          total: summary.errorCount,
          rate: summary.errorRate.toFixed(2),
          byType: errorsByType
        },
        lastUpdated: allMetrics.length > 0 ? allMetrics[0].createdAt.toISOString() : null
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
          rate: '0.00',
          byType: {}
        }
      };
    }
  },
  
  /**
   * Record API metrics
   * @param {string} endpoint - API endpoint
   * @param {number} responseTime - Response time in milliseconds
   * @param {number} statusCode - HTTP status code
   * @param {string} method - HTTP method
   * @returns {Promise<void>}
   */
  async recordApiMetrics(endpoint, responseTime, statusCode, method = 'GET') {
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
      
      // Create metric in database
      await systemHealthStorage.createApiMetric({
        id: uuidv4(),
        path: endpoint,
        responseTime,
        statusCode,
        method,
        createdAt: new Date()
      });
      
      // Periodically clean up old metrics (keep last 30 days)
      if (Math.random() < 0.01) { // 1% chance to run cleanup on each request
        await systemHealthStorage.deleteOldApiMetrics(30);
      }
    } catch (error) {
      console.error('Error recording API metrics:', error);
    }
  }
}; 