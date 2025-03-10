/**
 * Operational Analytics Service
 * 
 * Provides advanced analytics for identifying operational bottlenecks,
 * delay patterns, and efficiency metrics across the move management process.
 */

import { storage, orderStorage } from '../storage';

class OperationalAnalyticsService {
  /**
   * Analyzes order timeline data to identify bottlenecks in the operational workflow
   * 
   * @param {string} startDate - Start date for analysis (ISO string)
   * @param {string} endDate - End date for analysis (ISO string)
   * @param {string} [resolution='day'] - Time resolution for analysis ('hour', 'day', 'week')
   * @returns {Promise<Object>} - Bottleneck analysis data for heat map visualization
   */
  async identifyBottlenecks(startDate, endDate, resolution = 'day') {
    try {
      // Validate resolution parameter
      if (!['hour', 'day', 'week'].includes(resolution)) {
        resolution = 'day'; // Default to day if invalid
      }

      // Set default dates if not provided or invalid
      let end, start;
      try {
        end = endDate ? new Date(endDate) : new Date();
        // Ensure end date is valid
        if (isNaN(end.getTime())) {
          end = new Date();
        }
        
        start = startDate ? new Date(startDate) : new Date(new Date().setMonth(end.getMonth() - 3));
        // Ensure start date is valid
        if (isNaN(start.getTime())) {
          start = new Date(new Date().setMonth(end.getMonth() - 3));
        }
        
        // Ensure start date is before end date
        if (start > end) {
          start = new Date(new Date().setMonth(end.getMonth() - 3));
        }
      } catch (error) {
        console.error('Error parsing dates:', error);
        end = new Date();
        start = new Date(new Date().setMonth(end.getMonth() - 3));
      }
      
      // Get orders data from Prisma
      const orders = await orderStorage.getAll();
      
      // Validate orders data structure
      if (!Array.isArray(orders)) {
        console.error('Orders data is not an array');
        return this.createEmptyResponse();
      }
      
      // Filter orders by date range
      const filteredOrders = orders.filter(order => {
        if (!order || !order.createdAt) return false;
        
        try {
          const orderDate = new Date(order.createdAt);
          return !isNaN(orderDate.getTime()) && orderDate >= start && orderDate <= end;
        } catch (error) {
          return false;
        }
      });

      // Define operational stages and their expected durations (in hours)
      const operationalStages = {
        'Initiated': { nextStage: 'Requests Sent', expectedDuration: 24 },
        'Requests Sent': { nextStage: 'Quoted', expectedDuration: 48 },
        'Quoted': { nextStage: 'Accepted', expectedDuration: 72 },
        'Accepted': { nextStage: 'Paid', expectedDuration: 48 },
        'Paid': { nextStage: 'In Progress', expectedDuration: 24 },
        'In Progress': { nextStage: 'In Transit', expectedDuration: 12 },
        'In Transit': { nextStage: 'Delivered', expectedDuration: 24 },
        'Delivered': { nextStage: 'Completed', expectedDuration: 24 }
      };

      // Collect stage transition timing data
      const stageTransitions = [];
      const bottleneckScores = {};
      const stageDelays = {};
      
      // Initialize bottleneck scores and stage delays for each stage
      Object.keys(operationalStages).forEach(stage => {
        bottleneckScores[stage] = 0;
        stageDelays[stage] = [];
      });

      // Analyze each order for stage transition durations
      for (const order of filteredOrders) {
        // Get order status history from Prisma
        const statusHistory = await this.getOrderStatusHistory(order.id);
        
        if (!statusHistory || !Array.isArray(statusHistory) || statusHistory.length < 2) continue;
        
        // Ensure status history entries have timestamps
        const validHistory = statusHistory.filter(entry => entry && entry.status && entry.createdAt);
        if (validHistory.length < 2) continue;
        
        // Sort status history by timestamp
        const history = [...validHistory].sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateA - dateB;
        });
        
        // Calculate transition durations
        for (let i = 0; i < history.length - 1; i++) {
          const currentStage = history[i].status;
          const nextStage = history[i + 1].status;
          
          // Skip if not in our defined stages
          if (!operationalStages[currentStage]) continue;
          
          // Calculate duration in hours
          let durationHours;
          try {
            const startTime = new Date(history[i].createdAt);
            const endTime = new Date(history[i + 1].createdAt);
            
            // Skip if either date is invalid
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) continue;
            
            durationHours = Math.max(0, (endTime - startTime) / (1000 * 60 * 60));
          } catch (error) {
            continue; // Skip this entry if date parsing fails
          }
          
          // Record the transition
          stageTransitions.push({
            orderId: order.id,
            fromStage: currentStage,
            toStage: nextStage,
            duration: durationHours,
            startTime: new Date(history[i].createdAt),
            endTime: new Date(history[i + 1].createdAt),
            expectedDuration: operationalStages[currentStage].expectedDuration,
            delay: Math.max(0, durationHours - operationalStages[currentStage].expectedDuration)
          });
          
          // Accumulate delay scores for bottleneck identification
          if (durationHours > operationalStages[currentStage].expectedDuration) {
            const delayFactor = durationHours / operationalStages[currentStage].expectedDuration;
            bottleneckScores[currentStage] += delayFactor;
            stageDelays[currentStage].push({
              orderId: order.id,
              delay: durationHours - operationalStages[currentStage].expectedDuration,
              delayFactor,
              timestamp: new Date(history[i].createdAt)
            });
          }
        }
      }

      // Generate time-series data for heat map based on resolution
      const timeSeriesData = this.generateTimeSeriesData(stageDelays, start, end, resolution);

      // Calculate bottleneck severity
      // Normalize bottleneck scores based on the number of orders that went through each stage
      Object.keys(bottleneckScores).forEach(stage => {
        const stageTransitionCount = stageTransitions.filter(t => t.fromStage === stage).length;
        if (stageTransitionCount > 0) {
          bottleneckScores[stage] = bottleneckScores[stage] / stageTransitionCount;
        }
      });

      // Find the top bottlenecks
      const sortedBottlenecks = Object.entries(bottleneckScores)
        .map(([stage, score]) => ({ stage, score }))
        .sort((a, b) => b.score - a.score);

      // Calculate average delays for each stage
      const averageDelays = {};
      Object.keys(stageDelays).forEach(stage => {
        if (stageDelays[stage].length > 0) {
          const totalDelay = stageDelays[stage].reduce((sum, item) => sum + item.delay, 0);
          averageDelays[stage] = totalDelay / stageDelays[stage].length;
        } else {
          averageDelays[stage] = 0;
        }
      });

      return {
        bottleneckScores,
        sortedBottlenecks,
        averageDelays,
        stageTransitions,
        timeSeriesData,
        metadata: {
          analysisStartDate: start.toISOString(),
          analysisEndDate: end.toISOString(),
          resolution,
          totalOrdersAnalyzed: filteredOrders.length,
          ordersWithTransitions: stageTransitions.length > 0 ? 
            [...new Set(stageTransitions.map(t => t.orderId))].length : 0
        }
      };
    } catch (error) {
      console.error('Error in bottleneck identification:', error);
      return this.createEmptyResponse();
    }
  }

  /**
   * Creates an empty response for error cases
   * @returns {Object} Empty analysis response
   */
  createEmptyResponse() {
    return {
      bottleneckScores: {},
      sortedBottlenecks: [],
      averageDelays: {},
      stageTransitions: [],
      timeSeriesData: {
        timeBuckets: [],
        data: {}
      },
      metadata: {
        error: true,
        message: 'Failed to generate bottleneck analysis',
        totalOrdersAnalyzed: 0,
        ordersWithTransitions: 0
      }
    };
  }

  /**
   * Generate time-series data for heat map visualization
   * 
   * @param {Object} stageDelays - Delays by stage
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} resolution - Time resolution ('hour', 'day', 'week')
   * @returns {Object} - Time series data for heat map
   */
  generateTimeSeriesData(stageDelays, startDate, endDate, resolution) {
    try {
      // Validate input parameters
      if (!stageDelays || typeof stageDelays !== 'object') {
        return { timeBuckets: [], data: {} };
      }
      
      if (!(startDate instanceof Date) || !(endDate instanceof Date) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
        endDate = new Date();
      }
      
      if (!['hour', 'day', 'week'].includes(resolution)) {
        resolution = 'day'; // Default to day if invalid
      }
      
      const timeSeriesData = {};
      const stages = Object.keys(stageDelays);
      
      // Create time buckets based on resolution
      const timeBuckets = this.createTimeBuckets(startDate, endDate, resolution);
      
      // Initialize data structure
      stages.forEach(stage => {
        timeSeriesData[stage] = {};
        timeBuckets.forEach(bucket => {
          timeSeriesData[stage][bucket.key] = { 
            count: 0, 
            totalDelay: 0, 
            intensity: 0 
          };
        });
      });
      
      // Aggregate delay data into time buckets
      stages.forEach(stage => {
        if (!Array.isArray(stageDelays[stage])) return;
        
        stageDelays[stage].forEach(delayEntry => {
          if (!delayEntry || !delayEntry.timestamp) return;
          
          let timestamp;
          try {
            timestamp = delayEntry.timestamp instanceof Date ? 
              delayEntry.timestamp : new Date(delayEntry.timestamp);
            
            // Skip if date is invalid
            if (isNaN(timestamp.getTime())) return;
          } catch (error) {
            return; // Skip this entry if date parsing fails
          }
          
          const bucketKey = this.getTimeBucketKey(timestamp, resolution);
          
          if (timeSeriesData[stage][bucketKey]) {
            timeSeriesData[stage][bucketKey].count++;
            timeSeriesData[stage][bucketKey].totalDelay += delayEntry.delay || 0;
          }
        });
      });
      
      // Calculate intensity values (normalized for heat map)
      stages.forEach(stage => {
        const bucketKeys = Object.keys(timeSeriesData[stage]);
        
        // Find maximum average delay across all buckets for this stage
        const maxDelay = Math.max(...bucketKeys.map(key => {
          const bucket = timeSeriesData[stage][key];
          return bucket.count > 0 ? bucket.totalDelay / bucket.count : 0;
        }));
        
        bucketKeys.forEach(key => {
          const bucket = timeSeriesData[stage][key];
          if (bucket.count > 0) {
            const avgDelay = bucket.totalDelay / bucket.count;
            // Avoid division by zero
            bucket.intensity = maxDelay > 0 ? Math.min(1, avgDelay / maxDelay) : 0;
          }
        });
      });
      
      return {
        timeBuckets: timeBuckets.map(b => ({ key: b.key, label: b.label })),
        data: timeSeriesData
      };
    } catch (error) {
      console.error('Error generating time series data:', error);
      return { timeBuckets: [], data: {} };
    }
  }
  
  /**
   * Create time buckets based on the selected resolution
   * 
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} resolution - Time resolution ('hour', 'day', 'week')
   * @returns {Array} - Array of time bucket objects
   */
  createTimeBuckets(startDate, endDate, resolution) {
    try {
      // Validate dates
      if (!(startDate instanceof Date) || !(endDate instanceof Date) || 
          isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return [];
      }
      
      // Limit maximum number of buckets to prevent performance issues
      const MAX_BUCKETS = 366; // Maximum one year of daily data
      const durationMs = endDate.getTime() - startDate.getTime();
      let adjustedResolution = resolution;
      let adjustedStart = new Date(startDate);
      
      // Adjust resolution if too many buckets would be created
      if (resolution === 'hour' && durationMs > MAX_BUCKETS * 60 * 60 * 1000) {
        adjustedResolution = 'day';
      }
      if (resolution === 'day' && durationMs > MAX_BUCKETS * 24 * 60 * 60 * 1000) {
        adjustedResolution = 'week';
      }
      
      // If still too many buckets, adjust start date
      const msPerBucket = adjustedResolution === 'hour' ? 60 * 60 * 1000 :
                         adjustedResolution === 'day' ? 24 * 60 * 60 * 1000 :
                         7 * 24 * 60 * 60 * 1000;
      
      if (durationMs > MAX_BUCKETS * msPerBucket) {
        adjustedStart = new Date(endDate.getTime() - (MAX_BUCKETS * msPerBucket));
      }
      
      const buckets = [];
      const current = new Date(adjustedStart);
      
      // Create buckets until we reach or exceed end date
      let safetyCounter = 0; // Prevent infinite loops
      while (current <= endDate && safetyCounter < MAX_BUCKETS) {
        const key = this.getTimeBucketKey(current, adjustedResolution);
        let label = '';
        
        switch (adjustedResolution) {
          case 'hour':
            label = `${current.toLocaleDateString()} ${String(current.getHours()).padStart(2, '0')}:00`;
            current.setHours(current.getHours() + 1);
            break;
          case 'day':
            label = current.toLocaleDateString();
            current.setDate(current.getDate() + 1);
            break;
          case 'week':
            label = `Week of ${current.toLocaleDateString()}`;
            current.setDate(current.getDate() + 7);
            break;
          default:
            label = current.toLocaleDateString();
            current.setDate(current.getDate() + 1);
        }
        
        buckets.push({ key, label });
        safetyCounter++;
      }
      
      return buckets;
    } catch (error) {
      console.error('Error creating time buckets:', error);
      return [];
    }
  }
  
  /**
   * Get a standardized key for a time bucket
   * 
   * @param {Date} date - Date to get bucket key for
   * @param {string} resolution - Time resolution ('hour', 'day', 'week')
   * @returns {string} - Bucket key
   */
  getTimeBucketKey(date, resolution) {
    try {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'invalid-date';
      }
      
      const d = new Date(date);
      
      switch (resolution) {
        case 'hour':
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}`;
        case 'day':
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        case 'week':
          // Get the monday of the week
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
          const monday = new Date(d);
          monday.setDate(diff);
          return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        default:
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch (error) {
      console.error('Error generating time bucket key:', error);
      return 'invalid-date';
    }
  }
  
  /**
   * Get order status history from Prisma
   * 
   * @param {string} orderId - Order ID
   * @returns {Promise<Array>} - Order status history
   */
  async getOrderStatusHistory(orderId) {
    try {
      // Get order status history from Prisma
      const statusHistory = await storage.prisma.orderStatusHistory.findMany({
        where: { orderId },
        orderBy: { createdAt: 'asc' }
      });
      
      return statusHistory;
    } catch (error) {
      console.error(`Error getting status history for order ${orderId}:`, error);
      return [];
    }
  }
}

// Export a singleton instance
export const operationalAnalyticsService = new OperationalAnalyticsService(); 