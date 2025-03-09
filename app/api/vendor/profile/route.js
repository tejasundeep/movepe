import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { vendorService } from '../../../../lib/services/vendorService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'
import { authOptions } from '../../../../lib/auth'

async function getVendorProfile(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get vendor profile using the vendor service
    const vendor = await vendorService.getVendorByEmail(session.user.email)
    
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      vendor
    })
  } catch (error) {
    console.error('Error fetching vendor profile:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch vendor profile' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getVendorProfile, 'vendor'); 