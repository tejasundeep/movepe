'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'

export function Providers({ children }) {
  // Load Bootstrap CSS on the client side
  useEffect(() => {
    import('bootstrap/dist/css/bootstrap.min.css')
  }, [])

  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
} 