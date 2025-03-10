export const dynamic = 'force-dynamic';

import NextAuth from 'next-auth'
import { authOptions } from '../../../../lib/auth'

// Create a handler using the NextAuth handler function
const handler = NextAuth(authOptions)

// Export the handler functions
export { handler as GET, handler as POST } 