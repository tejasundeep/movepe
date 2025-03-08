import { Inter } from 'next/font/google'
import 'bootstrap/dist/css/bootstrap.min.css'
import { Container } from 'react-bootstrap'
import { Providers } from './providers'
import Navigation from '../components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Move Management System',
  description: 'A platform to streamline the process of organizing moves for users and vendors',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navigation />
          <Container>
            {children}
          </Container>
        </Providers>
      </body>
    </html>
  )
} 