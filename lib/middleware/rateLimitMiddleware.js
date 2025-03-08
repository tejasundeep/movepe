/**
 * Rate Limiting Middleware
 * 
 * This middleware provides a convenient way to apply rate limiting to API routes.
 * It uses the centralized rateLimitService to enforce limits.
 */

import { NextResponse } from 'next/server';
import { rateLimitService } from '../services/rateLimitService';

/**
 * Apply rate limiting to a request
 * @param {Request} request - The incoming request
 * @param {string} routeKey - The route identifier (e.g., 'auth', 'orders')
 * @returns {Promise<NextResponse|null>} - Returns a response if rate limit is exceeded, null otherwise
 */
export async function applyRateLimit(request, routeKey = 'default') {
  try {
    // Extract the HTTP method
    const method = request.method;
    
    // Check rate limit
    await rateLimitService.checkLimit(request, routeKey, method);
    
    // If we get here, the request is within limits
    return null;
  } catch (error) {
    // Rate limit exceeded
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
}

/**
 * Higher-order function to create a rate-limited route handler
 * @param {Function} handler - The original route handler function
 * @param {string} routeKey - The route identifier
 * @returns {Function} - A new handler function with rate limiting applied
 */
export function withRateLimit(handler, routeKey = 'default') {
  return async function rateLimitedHandler(request, ...args) {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, routeKey);
    
    // If rate limit is exceeded, return the error response
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Otherwise, proceed with the original handler
    return handler(request, ...args);
  };
} 