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

    const { status } = await request.json()
    if (!['available', 'busy', 'vacation'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Update vendor availability using the vendor service
    const updatedVendor = await vendorService.updateAvailability(session.user.email, status)

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