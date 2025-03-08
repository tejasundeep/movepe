import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { clearPricingCache, getCacheStats } from '../../../lib/services/pricingService';

/**
 * GET handler for retrieving cache statistics
 */
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cache statistics
    const cacheStats = getCacheStats();
    
    return NextResponse.json({
      success: true,
      cacheStats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json({ error: 'Failed to get cache statistics' }, { status: 500 });
  }
}

/**
 * POST handler for clearing cache
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { cacheType, key } = await request.json();
    
    // Clear cache
    clearPricingCache(cacheType, key);
    
    return NextResponse.json({
      success: true,
      message: `Cache ${cacheType ? (key ? `key "${key}" in "${cacheType}"` : `type "${cacheType}"`) : 'all'} cleared successfully`
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
} 