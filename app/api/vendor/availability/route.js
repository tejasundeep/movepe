export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { vendorService } from '../../../../lib/services/vendorService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'
import { authOptions } from '../../../../lib/auth'

async function updateAvailability(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { availability } = await request.json()
    if (!['available', 'unavailable'].includes(availability)) {
      return NextResponse.json(
        { error: 'Invalid availability status. Must be "available" or "unavailable".' },
        { status: 400 }
      )
    }

    // Update vendor availability using the vendor service
    const updatedVendor = await vendorService.updateAvailability(session.user.email, availability)

    return NextResponse.json({ 
      success: true,
      vendor: updatedVendor
    })
  } catch (error) {
    console.error('Error updating vendor availability:', error)
    
    let status = 500
    let errorMessage = 'Failed to update availability'
    
    if (error.message === 'Vendor not found') {
      status = 404
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(updateAvailability, 'vendor'); 