'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { Container, Row, Col, Nav, Spinner, Button } from 'react-bootstrap'
import Link from 'next/link'
import { 
  FaUsers, FaStore, FaBoxes, FaChartBar, FaCog, FaTachometerAlt, 
  FaSignOutAlt, FaBell, FaFileExport, FaHistory, FaServer
} from 'react-icons/fa'
import { signOut } from 'next-auth/react'

export default function AdminLayout({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(() => {
    // Initialize from localStorage if available, otherwise default to false
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('adminSidebarCollapsed');
      return savedState ? JSON.parse(savedState) : false;
    }
    return false;
  })

  useEffect(() => {
    // Check authentication status
    if (status === 'loading') {
      return
    }
    
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/dashboard')
      return
    }
    
    // Check if user is admin
    if (session?.user?.role === 'admin') {
      setIsAuthorized(true)
    } else {
      // Redirect non-admin users
      router.push('/')
    }
    
    setIsLoading(false)
  }, [status, session, router])

  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminSidebarCollapsed', JSON.stringify(collapsed));
    }
  }, [collapsed]);

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/')
  }

  if (isLoading || status === 'loading') {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3">Loading admin panel...</p>
        </div>
      </Container>
    )
  }

  if (!isAuthorized) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <h2 className="text-danger mb-3">Access Denied</h2>
          <p className="mb-4">You do not have permission to access the admin panel.</p>
          <Link href="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </Container>
    )
  }

  const isActive = (path) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  return (
    <div className="admin-layout d-flex">
      {/* Sidebar */}
      <div 
        className={`sidebar bg-dark text-white ${collapsed ? 'collapsed' : ''}`} 
        style={{ 
          width: collapsed ? '80px' : '250px', 
          minHeight: '100vh',
          transition: 'width 0.3s ease',
          position: 'fixed',
          zIndex: 1000
        }}
        role="navigation"
        aria-label="Admin navigation"
      >
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
          {!collapsed && <h4 className="mb-0">Admin Panel</h4>}
          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={() => setCollapsed(!collapsed)}
            className="ms-auto"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? '→' : '←'}
          </Button>
        </div>
        
        <div className="p-2">
          <Nav className="flex-column" aria-label="Admin sections">
            <Nav.Item>
              <Link 
                href="/admin/dashboard" 
                className={`nav-link text-white d-flex align-items-center py-3 ${isActive('/admin/dashboard') ? 'active bg-primary rounded' : ''}`}
                aria-current={isActive('/admin/dashboard') ? 'page' : undefined}
              >
                <FaTachometerAlt className="me-3" aria-hidden="true" />
                {!collapsed && <span>Dashboard</span>}
              </Link>
            </Nav.Item>
            <Nav.Item>
              <Link 
                href="/admin/users" 
                className={`nav-link text-white d-flex align-items-center py-3 ${isActive('/admin/users') ? 'active bg-primary rounded' : ''}`}
                aria-current={isActive('/admin/users') ? 'page' : undefined}
              >
                <FaUsers className="me-3" aria-hidden="true" />
                {!collapsed && <span>User Management</span>}
              </Link>
            </Nav.Item>
            <Nav.Item>
              <Link 
                href="/admin/vendors" 
                className={`nav-link text-white d-flex align-items-center py-3 ${isActive('/admin/vendors') ? 'active bg-primary rounded' : ''}`}
              >
                <FaStore className="me-3" />
                {!collapsed && <span>Vendor Management</span>}
              </Link>
            </Nav.Item>
            <Nav.Item>
              <Link 
                href="/admin/orders" 
                className={`nav-link text-white d-flex align-items-center py-3 ${isActive('/admin/orders') ? 'active bg-primary rounded' : ''}`}
              >
                <FaBoxes className="me-3" />
                {!collapsed && <span>Order Management</span>}
              </Link>
            </Nav.Item>
            <Nav.Item>
              <Link 
                href="/admin/orders/export" 
                className={`nav-link text-white d-flex align-items-center py-3 ${isActive('/admin/orders/export') ? 'active bg-primary rounded' : ''}`}
              >
                <FaFileExport className="me-3" />
                {!collapsed && <span>Export Orders</span>}
              </Link>
            </Nav.Item>
            <Nav.Item>
              <Link 
                href="/admin/notifications" 
                className={`nav-link text-white d-flex align-items-center py-3 ${isActive('/admin/notifications') ? 'active bg-primary rounded' : ''}`}
              >
                <FaBell className="me-3" />
                {!collapsed && <span>Notifications</span>}
              </Link>
            </Nav.Item>
            <Nav.Item>
              <Link 
                href="/admin/analytics" 
                className={`nav-link text-white d-flex align-items-center py-3 ${isActive('/admin/analytics') ? 'active bg-primary rounded' : ''}`}
              >
                <FaChartBar className="me-3" />
                {!collapsed && <span>Analytics</span>}
              </Link>
            </Nav.Item>
            <Nav.Item>
              <Link 
                href="/admin/audit-logs" 
                className={`nav-link text-white d-flex align-items-center py-3 ${isActive('/admin/audit-logs') ? 'active bg-primary rounded' : ''}`}
              >
                <FaHistory className="me-3" />
                {!collapsed && <span>Audit Logs</span>}
              </Link>
            </Nav.Item>
            <Nav.Item>
              <Link 
                href="/admin/system-health" 
                className={`nav-link text-white d-flex align-items-center py-3 ${isActive('/admin/system-health') ? 'active bg-primary rounded' : ''}`}
              >
                <FaServer className="me-3" />
                {!collapsed && <span>System Health</span>}
              </Link>
            </Nav.Item>
            <Nav.Item>
              <Link 
                href="/admin/settings" 
                className={`nav-link text-white d-flex align-items-center py-3 ${isActive('/admin/settings') ? 'active bg-primary rounded' : ''}`}
              >
                <FaCog className="me-3" />
                {!collapsed && <span>Settings</span>}
              </Link>
            </Nav.Item>
          </Nav>
        </div>
        
        <div className="mt-auto p-3 border-top border-secondary">
          <Button 
            variant="outline-danger" 
            size="sm" 
            className="w-100 d-flex align-items-center justify-content-center"
            onClick={handleSignOut}
            aria-label="Sign out of admin panel"
          >
            <FaSignOutAlt className="me-2" aria-hidden="true" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content" style={{ 
        marginLeft: collapsed ? '80px' : '250px',
        width: collapsed ? 'calc(100% - 80px)' : 'calc(100% - 250px)',
        transition: 'margin-left 0.3s ease, width 0.3s ease',
        minHeight: '100vh'
      }}
      role="main"
      >
        {/* Header */}
        <div 
          className="bg-white shadow-sm p-3 d-flex justify-content-between align-items-center"
          role="banner"
        >
          <h4 className="mb-0">{pathname?.split('/').pop()?.charAt(0).toUpperCase() + pathname?.split('/').pop()?.slice(1) || 'Dashboard'}</h4>
          <div className="d-flex align-items-center">
            <span className="me-3">Welcome, {session?.user?.name}</span>
            <span className="badge bg-danger" role="status">Admin</span>
          </div>
        </div>
        
        {/* Page content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
} 