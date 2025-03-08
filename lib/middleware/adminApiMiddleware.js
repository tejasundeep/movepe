import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth';
import { auditService } from '../services/auditService';
import { systemHealthService } from '../services/systemHealthService';

// Track in-flight requests to prevent duplicates
const inflightRequests = new Map();

// Generate a unique key for a request
function getRequestKey(request, action) {
  try {
    const url = new URL(request.url);
    return `${request.method}:${url.pathname}:${action}`;
  } catch (error) {
    return `${request.method}:${action}:${Date.now()}`;
  }
}

/**
 * Middleware for admin API routes to handle authentication, authorization,
 * error handling, and audit logging consistently
 * 
 * @param {Function} handler - The API route handler function
 * @param {Object} options - Options for the middleware
 * @param {string} options.action - The action being performed (for audit logging)
 * @param {string} options.entityType - The type of entity being affected (for audit logging)
 * @param {boolean} options.skipAudit - Whether to skip audit logging
 * @param {boolean} options.trackMetrics - Whether to track API metrics
 * @param {boolean} options.deduplicateRequests - Whether to deduplicate identical concurrent requests
 * @param {number} options.maxConcurrentRequests - Maximum number of concurrent requests for this endpoint
 * @returns {Function} The wrapped handler function
 */
export function withAdminApiMiddleware(handler, options = {}) {
  const {
    action = 'access',
    entityType = 'admin_api',
    skipAudit = false,
    trackMetrics = true,
    deduplicateRequests = true,
    maxConcurrentRequests = 5
  } = options;
  
  return async function wrappedHandler(request, ...args) {
    const startTime = Date.now();
    let statusCode = 200;
    
    // Generate a unique key for this request
    const requestKey = getRequestKey(request, action);
    
    try {
      // Check for duplicate requests if deduplication is enabled
      if (deduplicateRequests && inflightRequests.has(requestKey)) {
        // Return the existing promise to avoid duplicate processing
        return await inflightRequests.get(requestKey);
      }
      
      // Check for too many concurrent requests
      const concurrentCount = Array.from(inflightRequests.keys())
        .filter(key => key.includes(action))
        .length;
      
      if (concurrentCount >= maxConcurrentRequests) {
        statusCode = 429;
        return NextResponse.json({ 
          error: 'Too many concurrent requests',
          message: 'Please try again later'
        }, { status: statusCode });
      }
      
      // Create a promise for this request
      const responsePromise = (async () => {
        try {
          // Check if user is authenticated and is an admin
          const session = await getServerSession(authOptions);
          
          if (!session) {
            statusCode = 401;
            return NextResponse.json({ error: 'Not authenticated' }, { status: statusCode });
          }
          
          if (session.user.role !== 'admin') {
            statusCode = 403;
            return NextResponse.json({ error: 'Not authorized' }, { status: statusCode });
          }
          
          // Call the handler
          const response = await handler(request, ...args);
          
          // If the response is not a NextResponse, convert it
          if (!(response instanceof NextResponse)) {
            statusCode = 200;
            return NextResponse.json(response);
          }
          
          // Extract status code from response
          statusCode = response.status;
          
          // Log the action if not skipped
          if (!skipAudit) {
            try {
              const url = new URL(request.url);
              const entityId = url.pathname;
              
              await auditService.logAction(
                session.user.email,
                action,
                entityType,
                entityId,
                { 
                  method: request.method,
                  path: url.pathname,
                  query: Object.fromEntries(url.searchParams.entries()),
                  statusCode
                }
              ).catch(err => console.error('Failed to log audit action:', err));
            } catch (error) {
              console.error('Error logging admin action:', error);
            }
          }
          
          return response;
        } catch (error) {
          console.error(`Error in admin API route (${action}):`, error);
          
          // Determine appropriate status code based on error
          if (error.name === 'ValidationError') {
            statusCode = 400;
          } else if (error.name === 'UnauthorizedError') {
            statusCode = 401;
          } else if (error.name === 'ForbiddenError') {
            statusCode = 403;
          } else if (error.name === 'NotFoundError') {
            statusCode = 404;
          } else {
            statusCode = 500;
          }
          
          return NextResponse.json({ 
            error: 'An error occurred processing your request',
            message: error.message,
            code: error.code
          }, { status: statusCode });
        } finally {
          // Track API metrics if enabled
          if (trackMetrics) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            try {
              const url = new URL(request.url);
              const endpoint = `${request.method} ${url.pathname}`;
              
              systemHealthService.recordApiMetrics(endpoint, responseTime, statusCode)
                .catch(err => console.error('Failed to record API metrics:', err));
            } catch (error) {
              console.error('Error recording API metrics:', error);
            }
          }
          
          // Remove this request from the inflight map
          if (deduplicateRequests) {
            inflightRequests.delete(requestKey);
          }
        }
      })();
      
      // Store the promise if deduplication is enabled
      if (deduplicateRequests) {
        inflightRequests.set(requestKey, responsePromise);
      }
      
      // Return the response
      return await responsePromise;
    } catch (error) {
      // This catch block handles errors in the middleware itself
      console.error(`Middleware error in admin API route (${action}):`, error);
      
      // Clean up the inflight request
      if (deduplicateRequests) {
        inflightRequests.delete(requestKey);
      }
      
      return NextResponse.json({ 
        error: 'Internal server error in middleware',
        message: 'An unexpected error occurred'
      }, { status: 500 });
    }
  };
} 