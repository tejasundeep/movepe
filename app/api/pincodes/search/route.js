export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import pincodes from '../../../../data/pincodes.json'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

async function searchPincodes(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json([])
  }

  const filteredPincodes = pincodes.filter(pin => 
    pin.pincode.includes(query) ||
    pin.city.toLowerCase().includes(query.toLowerCase()) ||
    pin.state.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5) // Limit to 5 suggestions

  return NextResponse.json(filteredPincodes)
}

// Apply rate limiting to the handler
export const GET = withRateLimit(searchPincodes, 'default'); 