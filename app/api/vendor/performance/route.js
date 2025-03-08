import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { vendorService } from '../../../../lib/services/vendorService'
import { storage } from '../../../../lib/storage'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

export const dynamic = 'force-dynamic'

async function getVendorPerformance(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get vendor ID from session user
    const vendors = await storage.readData('vendors.json')
    if (!vendors) {
      return NextResponse.json(
        { error: 'Failed to read vendors data' },
        { status: 500 }
      )
    }
    
    const vendor = vendors.find(v => v && v.email === session.user.email)
    if (!vendor || !vendor.vendorId) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Get performance metrics
    const metrics = await vendorService.getVendorPerformanceMetrics(vendor.vendorId)
    
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching vendor performance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getVendorPerformance, 'vendor'); 