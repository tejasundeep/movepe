export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { pincodeStorage } from '../../../../lib/storage'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

async function searchPincodes(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json([])
  }

  // Search pincodes using the pincode storage
  const filteredPincodes = await pincodeStorage.search(query, 5); // Limit to 5 suggestions

  return NextResponse.json(filteredPincodes)
}

// Apply rate limiting to the handler
export const GET = withRateLimit(searchPincodes, 'default'); 