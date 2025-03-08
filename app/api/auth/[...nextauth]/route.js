import NextAuth from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

// Create the NextAuth handler
const nextAuthHandler = NextAuth(authOptions)

// Apply rate limiting to the NextAuth handler
const handler = async (req, ...args) => {
  return withRateLimit(nextAuthHandler, 'auth')(req, ...args)
}

export { handler as GET, handler as POST } 