import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { vendorService } from '../../../../lib/services/vendorService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

async function getAffiliateStats(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get affiliate stats using the vendor service
    const stats = await vendorService.getAffiliateStats(session.user.email)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching affiliate stats:', error)
    
    let status = 500
    let errorMessage = 'Failed to fetch affiliate stats'
    
    if (error.message === 'Vendor not found') {
      status = 404
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handler
export const GET = withRateLimit(getAffiliateStats, 'vendor'); 