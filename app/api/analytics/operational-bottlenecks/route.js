import { NextResponse } from 'next/server';
import { operationalAnalyticsService } from '../../../../lib/services/operationalAnalyticsService';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

/**
 * GET /api/analytics/operational-bottlenecks
 * Retrieves operational bottleneck analysis data
 * 
 * Query parameters:
 * - startDate (optional): ISO date string for analysis start date
 * - endDate (optional): ISO date string for analysis end date 
 * - resolution (optional): Time resolution for analysis ('hour', 'day', 'week')
 */
export async function GET(request) {
  try {
    // Authenticate request
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (error) {
      console.error('Error getting server session:', error);
      return new NextResponse(JSON.stringify({ error: 'Authentication error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is authorized
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user has required role
    if (!session.user || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
      return new NextResponse(JSON.stringify({ error: 'Insufficient permissions to access this resource' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate startDate
    let startDate = searchParams.get('startDate') || null;
    if (startDate) {
      try {
        const parsedDate = new Date(startDate);
        if (isNaN(parsedDate.getTime())) {
          console.warn(`Invalid startDate parameter: ${startDate}`);
          startDate = null;
        }
      } catch (error) {
        console.warn(`Error parsing startDate: ${startDate}`, error);
        startDate = null;
      }
    }
    
    // Parse and validate endDate
    let endDate = searchParams.get('endDate') || null;
    if (endDate) {
      try {
        const parsedDate = new Date(endDate);
        if (isNaN(parsedDate.getTime())) {
          console.warn(`Invalid endDate parameter: ${endDate}`);
          endDate = null;
        }
      } catch (error) {
        console.warn(`Error parsing endDate: ${endDate}`, error);
        endDate = null;
      }
    }
    
    // Validate resolution parameter
    const validResolutions = ['hour', 'day', 'week'];
    let resolution = searchParams.get('resolution') || 'day';
    if (!validResolutions.includes(resolution)) {
      console.warn(`Invalid resolution parameter: ${resolution}, defaulting to 'day'`);
      resolution = 'day';
    }

    // First ensure all orders have status history data (required for bottleneck analysis)
    try {
      await operationalAnalyticsService.enhanceOrdersWithStatusHistory();
    } catch (error) {
      console.error('Error enhancing order status history:', error);
      // Continue with analysis even if enhancement fails
    }
    
    // Get bottleneck analysis data with timeout protection
    const ANALYSIS_TIMEOUT = 30000; // 30 seconds timeout for analysis
    let bottleneckData;
    
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timed out')), ANALYSIS_TIMEOUT);
      });
      
      // Create the analysis promise
      const analysisPromise = operationalAnalyticsService.identifyBottlenecks(
        startDate, 
        endDate, 
        resolution
      );
      
      // Race the promises
      bottleneckData = await Promise.race([analysisPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error performing bottleneck analysis:', error);
      return new NextResponse(JSON.stringify({ 
        error: 'Analysis failed or timed out', 
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add request metadata to response
    const responseData = {
      ...bottleneckData,
      requestMetadata: {
        requestedAt: new Date().toISOString(),
        requestedBy: session.user.email,
        parameters: {
          startDate,
          endDate,
          resolution
        }
      }
    };

    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
      }
    });
  } catch (error) {
    console.error('Unhandled error in operational bottlenecks API:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Internal server error', 
      message: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 