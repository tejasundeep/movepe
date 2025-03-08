'use client'

import { Container, Nav, Navbar } from 'react-bootstrap'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Navigation() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/auth/signin')
  }

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Link href="/" passHref legacyBehavior>
          <Navbar.Brand>Move Management</Navbar.Brand>
        </Link>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/* Show Home link only for non-vendors */}
            {(!session?.user || session?.user?.role !== 'vendor') && (
              <Link href="/" passHref legacyBehavior>
                <Nav.Link>Home</Nav.Link>
              </Link>
            )}
            
            {session?.user && (
              <>
                {/* Show Dashboard link only for non-vendors */}
                {session.user.role !== 'vendor' && session.user.role !== 'admin' && (
                  <Link href="/dashboard" passHref legacyBehavior>
                    <Nav.Link>Dashboard</Nav.Link>
                  </Link>
                )}
                
                {/* Show Vendor Dashboard link only for vendors */}
                {session.user.role === 'vendor' && (
                  <Link href="/vendor/dashboard" passHref legacyBehavior>
                    <Nav.Link>Vendor Dashboard</Nav.Link>
                  </Link>
                )}
                
                {/* Show Admin Panel link only for admins */}
                {session.user.role === 'admin' && (
                  <Link href="/admin/dashboard" passHref legacyBehavior>
                    <Nav.Link>Admin Panel</Nav.Link>
                  </Link>
                )}
              </>
            )}
          </Nav>
          <Nav>
            {session?.user ? (
              <>
                <Navbar.Text className="me-3">
                  {session.user.name} 
                  {session.user.role === 'admin' && (
                    <span className="ms-1 badge bg-danger">Admin</span>
                  )}
                  {session.user.role === 'vendor' && (
                    <span className="ms-1 badge bg-primary">Vendor</span>
                  )}
                </Navbar.Text>
                <Link href="/settings" passHref legacyBehavior>
                  <Nav.Link>Settings</Nav.Link>
                </Link>
                <Nav.Link onClick={handleSignOut}>Sign Out</Nav.Link>
              </>
            ) : (
              <>
                <Link href="/auth/signin" passHref legacyBehavior>
                  <Nav.Link>Sign In</Nav.Link>
                </Link>
                <Link href="/auth/register" passHref legacyBehavior>
                  <Nav.Link>Register</Nav.Link>
                </Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
} 