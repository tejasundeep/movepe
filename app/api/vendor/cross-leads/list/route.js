export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'
import { vendorService } from '../../../../../lib/services/vendorService'
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware'

async function getAvailableCrossLeads(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get vendor details
    const vendor = await vendorService.getVendorByEmail(session.user.email)
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Get available cross-leads
    const availableCrossLeads = await vendorService.getAvailableCrossLeads(vendor.vendorId)

    return NextResponse.json(availableCrossLeads)
  } catch (error) {
    console.error('Error fetching available cross-leads:', error)
    
    let status = 500
    let errorMessage = 'Failed to fetch available cross-leads'
    
    if (error.message === 'Vendor not found') {
      status = 404
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getAvailableCrossLeads, 'vendor'); 