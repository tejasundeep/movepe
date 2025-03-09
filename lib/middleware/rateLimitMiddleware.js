/**
 * Rate Limiting Middleware
 * Provides rate limiting functionality for API routes
 */

// Simple in-memory store for rate limiting
// In production, you would use Redis or another distributed store
const rateLimitStore = new Map();

/**
 * Apply rate limit check to a request
 * @param {Request} request - The incoming request
 * @param {string} routeKey - A key to identify the rate limit group
 * @returns {Object|null} Rate limit response or null if not rate limited
 */
export async function applyRateLimit(request, routeKey = 'default') {
  // Get client IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Create a unique identifier for this client and rate limit group
  const identifier = `${ip}:${routeKey}`;
  
  // Get current time
  const now = Date.now();
  
  // Default rate limit settings
  const maxRequests = 60; // 60 requests
  const windowMs = 60000; // per minute
  
  // Get or create rate limit entry
  let rateLimit = rateLimitStore.get(identifier);
  
  if (!rateLimit) {
    rateLimit = {
      count: 0,
      resetAt: now + windowMs
    };
  } else if (now > rateLimit.resetAt) {
    // Reset if window has passed
    rateLimit = {
      count: 0,
      resetAt: now + windowMs
    };
  }
  
  // Increment count
  rateLimit.count += 1;
  
  // Update store
  rateLimitStore.set(identifier, rateLimit);
  
  // Check if rate limit exceeded
  if (rateLimit.count > maxRequests) {
    // Calculate remaining time until reset
    const remainingMs = rateLimit.resetAt - now;
    const remainingSec = Math.ceil(remainingMs / 1000);
    
    return {
      status: 429,
      message: 'Too many requests, please try again later.',
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(rateLimit.resetAt / 1000).toString(),
        'Retry-After': remainingSec.toString()
      }
    };
  }
  
  return null;
}

/**
 * Higher-order function to apply rate limiting to a route handler
 * @param {Function} handler - The route handler function
 * @param {string} routeKey - A key to identify the rate limit group
 * @returns {Function} Rate-limited handler function
 */
export function withRateLimit(handler, routeKey = 'default') {
  return async function rateLimitedHandler(request, ...args) {
    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(request, routeKey);
    
    // If rate limited, return rate limit response
    if (rateLimitResult) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.message }),
        {
          status: rateLimitResult.status,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitResult.headers
          }
        }
      );
    }
    
    // Otherwise, call the original handler
    return handler(request, ...args);
  };
} 