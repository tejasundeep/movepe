import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Navigation from '../components/Navigation'

// Configure the Inter font with fallback to system fonts
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    'sans-serif',
  ]
})

export const metadata = {
  title: 'MovePE - Moving and Delivery Management Platform',
  description: 'A comprehensive platform for managing moves and deliveries',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  alternates: {
    canonical: '/',
  },
  other: {
    'google-font-preconnect': 'https://fonts.googleapis.com',
    'gstatic-font-preconnect': 'https://fonts.gstatic.com'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
          <Navigation />
          <div className="container mx-auto px-4 py-8">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
} 