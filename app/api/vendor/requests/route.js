import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { vendorService } from '../../../../lib/services/vendorService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

export const dynamic = 'force-dynamic'

async function getVendorRequests(request) {
  try {
    // Check if vendor is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    try {
      // Get vendor details using the vendor service
      const vendor = await vendorService.getVendorByEmail(session.user.email)
      if (!vendor) {
        return NextResponse.json(
          { error: 'Vendor not found' },
          { status: 404 }
        )
      }

      // Get vendor requests using the vendor service
      const requests = await vendorService.getVendorRequests(vendor.vendorId)

      return NextResponse.json(requests)
    } catch (error) {
      console.error('Error fetching vendor requests:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch vendor requests' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error in vendor requests API:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getVendorRequests, 'vendor'); 