import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { vendorService } from '../../../../lib/services/vendorService'
import { storage, vendorStorage } from '../../../../lib/storage'
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

    // Get vendor details using Prisma
    const vendor = await vendorService.getVendorByEmail(session.user.email)
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Get performance metrics
    const metrics = await vendorService.getVendorPerformanceMetrics(vendor.id)
    
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