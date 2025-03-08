/**
 * Centralized Rate Limiting Service
 * 
 * This service provides rate limiting functionality for API routes.
 * It uses a token bucket algorithm to limit requests based on IP address.
 * Different limits can be set for different routes and HTTP methods.
 */

class TokenBucket {
  constructor(capacity, fillPerMs, fillInterval) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.fillPerMs = fillPerMs;
    this.lastFilled = Date.now();
    this.fillInterval = fillInterval;
  }

  consume(tokens = 1) {
    this.refill();
    if (this.tokens < tokens) {
      return false;
    }
    this.tokens -= tokens;
    return true;
  }

  refill() {
    const now = Date.now();
    const timePassed = now - this.lastFilled;
    const refillAmount = (timePassed / this.fillInterval) * this.fillPerMs;
    this.tokens = Math.min(this.capacity, this.tokens + refillAmount);
    this.lastFilled = now;
  }
}

class RateLimitService {
  constructor() {
    // Store token buckets in memory with route-specific maps
    this.buckets = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000); // Cleanup every hour
    
    // Default configurations for different API routes
    this.routeConfigs = {
      // Authentication routes
      'auth': { limit: 10, interval: 60 * 1000 }, // 10 requests per minute
      
      // User routes
      'user': { limit: 20, interval: 60 * 1000 }, // 20 requests per minute
      
      // Order routes
      'orders': { limit: 30, interval: 60 * 1000 }, // 30 requests per minute
      
      // Payment routes
      'payment': { limit: 10, interval: 60 * 1000 }, // 10 requests per minute
      
      // Review routes
      'reviews': {
        'GET': { limit: 50, interval: 60 * 1000 }, // 50 GET requests per minute
        'POST': { limit: 10, interval: 60 * 1000 }, // 10 POST requests per minute
        'PUT': { limit: 5, interval: 60 * 1000 },   // 5 PUT requests per minute
        'DELETE': { limit: 3, interval: 60 * 1000 } // 3 DELETE requests per minute
      },
      
      // Vendor routes
      'vendor': { limit: 20, interval: 60 * 1000 }, // 20 requests per minute
      
      // Analytics routes
      'analytics': { limit: 10, interval: 60 * 1000 }, // 10 requests per minute
      
      // Default for all other routes
      'default': { limit: 30, interval: 60 * 1000 } // 30 requests per minute
    };
  }

  /**
   * Check if a request is within rate limits
   * @param {Request} request - The incoming request
   * @param {string} routeKey - The route identifier (e.g., 'auth', 'orders')
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @returns {Promise<void>} - Resolves if within limits, rejects if exceeded
   */
  async checkLimit(request, routeKey = 'default', method = 'GET') {
    // Get client IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Create a unique key for this IP and route combination
    const bucketKey = `${ip}:${routeKey}:${method}`;
    
    // Get the appropriate config for this route and method
    let config;
    if (this.routeConfigs[routeKey] && 
        typeof this.routeConfigs[routeKey] === 'object' && 
        this.routeConfigs[routeKey][method]) {
      // Route has method-specific config
      config = this.routeConfigs[routeKey][method];
    } else if (this.routeConfigs[routeKey]) {
      // Route has general config
      config = this.routeConfigs[routeKey];
    } else {
      // Use default config
      config = this.routeConfigs.default;
    }
    
    // Get or create bucket for this key
    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = new TokenBucket(config.limit, config.limit, config.interval);
      this.buckets.set(bucketKey, bucket);
    }
    
    // Check if request is within limits
    if (!bucket.consume(1)) {
      return Promise.reject(new Error('Rate limit exceeded'));
    }
    
    return Promise.resolve();
  }

  /**
   * Clean up old buckets to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      // Remove buckets that haven't been used in the last hour
      if (now - bucket.lastFilled > 60 * 60 * 1000) {
        this.buckets.delete(key);
      }
    }
  }

  /**
   * Set custom configuration for a route
   * @param {string} routeKey - The route identifier
   * @param {Object} config - Configuration object with limit and interval
   * @param {string} method - Optional HTTP method for method-specific limits
   */
  setRouteConfig(routeKey, config, method = null) {
    if (!method) {
      this.routeConfigs[routeKey] = config;
    } else {
      if (!this.routeConfigs[routeKey] || typeof this.routeConfigs[routeKey] !== 'object') {
        this.routeConfigs[routeKey] = {};
      }
      this.routeConfigs[routeKey][method] = config;
    }
  }
}

// Create a singleton instance
const rateLimitService = new RateLimitService();

export { rateLimitService }; 