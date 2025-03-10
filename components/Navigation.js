'use client'

import { Container, Nav, Navbar, Dropdown } from 'react-bootstrap'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaHome, FaUser, FaTruck, FaSignOutAlt, FaSignInAlt, FaUserPlus, FaCog, FaQuestionCircle, FaBook, FaExchangeAlt } from 'react-icons/fa'

export default function Navigation() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/auth/signin')
  }

  const navigateTo = (path) => {
    router.push(path)
  }

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Link href="/" passHref legacyBehavior>
          <Navbar.Brand className="d-flex align-items-center">
            <FaTruck className="me-2" /> MovePe
          </Navbar.Brand>
        </Link>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/* Show Home link only for non-vendors */}
            {(!session?.user || session?.user?.role !== 'vendor') && (
              <Link href="/" passHref legacyBehavior>
                <Nav.Link className="d-flex align-items-center">
                  <FaHome className="me-2" /> Home
                </Nav.Link>
              </Link>
            )}
            
            {session?.user && (
              <>
                {/* Show Dashboard link only for non-vendors */}
                {session.user.role !== 'vendor' && session.user.role !== 'admin' && session.user.role !== 'rider' && (
                  <Link href="/dashboard" passHref legacyBehavior>
                    <Nav.Link className="d-flex align-items-center">
                      <FaUser className="me-2" /> My Moves
                    </Nav.Link>
                  </Link>
                )}
                
                {/* Show Vendor Dashboard link only for vendors */}
                {session.user.role === 'vendor' && (
                  <>
                    <Link href="/vendor/affiliate" passHref legacyBehavior>
                      <Nav.Link className="d-flex align-items-center">
                        <FaExchangeAlt className="me-2" /> Affiliate
                      </Nav.Link>
                    </Link>
                    <Link href="/vendor/help" passHref legacyBehavior>
                      <Nav.Link className="d-flex align-items-center">
                        <FaQuestionCircle className="me-2" /> Help
                      </Nav.Link>
                    </Link>
                  </>
                )}
                
                {/* Show Rider Dashboard link only for riders */}
                {session.user.role === 'rider' && (
                  <Link href="/rider-dashboard" passHref legacyBehavior>
                    <Nav.Link className="d-flex align-items-center">
                      <FaTruck className="me-2" /> My Deliveries
                    </Nav.Link>
                  </Link>
                )}
                
                {/* Show Admin Panel link only for admins */}
                {session.user.role === 'admin' && (
                  <Link href="/admin/dashboard" passHref legacyBehavior>
                    <Nav.Link className="d-flex align-items-center">
                      <FaCog className="me-2" /> Admin Panel
                    </Nav.Link>
                  </Link>
                )}
              </>
            )}
          </Nav>
          <Nav>
            {session?.user ? (
              <>
                <Dropdown align="end">
                  <Dropdown.Toggle variant="dark" id="user-dropdown" className="user-dropdown">
                    <span className="me-1">{session.user.name}</span>
                    {session.user.role === 'admin' && (
                      <span className="ms-1 badge bg-danger">Admin</span>
                    )}
                    {session.user.role === 'vendor' && (
                      <span className="ms-1 badge bg-primary">Vendor</span>
                    )}
                    {session.user.role === 'rider' && (
                      <span className="ms-1 badge bg-success">Rider</span>
                    )}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {session.user.role === 'vendor' && (
                      <>
                        <Dropdown.Item onClick={() => navigateTo('/vendor/dashboard')}>
                          <FaTruck className="me-2" /> My Jobs
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => navigateTo('/vendor/affiliate')}>
                          <FaExchangeAlt className="me-2" /> Affiliate Program
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => navigateTo('/vendor/onboarding')}>
                          <FaBook className="me-2" /> Onboarding Guide
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => navigateTo('/vendor/help')}>
                          <FaQuestionCircle className="me-2" /> Help Center
                        </Dropdown.Item>
                        <Dropdown.Divider />
                      </>
                    )}
                    <Dropdown.Item onClick={() => navigateTo('/settings')}>
                      <FaCog className="me-2" /> Settings
                    </Dropdown.Item>
                    <Dropdown.Item onClick={handleSignOut}>
                      <FaSignOutAlt className="me-2" /> Sign Out
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </>
            ) : (
              <>
                <Link href="/auth/signin" passHref legacyBehavior>
                  <Nav.Link className="d-flex align-items-center">
                    <FaSignInAlt className="me-2" /> Sign In
                  </Nav.Link>
                </Link>
                <Link href="/auth/register" passHref legacyBehavior>
                  <Nav.Link className="d-flex align-items-center">
                    <FaUserPlus className="me-2" /> Register
                  </Nav.Link>
                </Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
      
      <style jsx global>{`
        .user-dropdown::after {
          display: none;
        }
        
        .dropdown-item {
          display: flex;
          align-items: center;
        }
        
        @media (max-width: 768px) {
          .navbar-nav .nav-link {
            padding: 0.5rem 0;
          }
        }
      `}</style>
    </Navbar>
  )
} 