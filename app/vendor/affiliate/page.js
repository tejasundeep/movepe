'use client'

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Alert, Spinner, Button } from 'react-bootstrap'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FaExchangeAlt, FaChartLine, FaHandshake, FaPlus, FaInfoCircle } from 'react-icons/fa'
import AffiliateStats from '../dashboard/components/AffiliateStats'
import CrossLeadForm from '../dashboard/components/CrossLeadForm'
import CrossLeadsList from '../dashboard/components/CrossLeadsList'
import MySubmittedLeads from '../dashboard/components/MySubmittedLeads'

export default function VendorAffiliate() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  useEffect(() => {
    // Redirect if not authenticated or not a vendor
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user?.role !== 'vendor') {
      router.push('/')
    } else if (status === 'authenticated') {
      setLoading(false)
    }
  }, [status, session, router])

  const refreshLeads = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  if (status === 'loading' || loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    )
  }

  if (!session || session?.user?.role !== 'vendor') {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          This page is only accessible to vendors. Please sign in with a vendor account.
        </Alert>
      </Container>
    )
  }

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-0">Affiliate Program</h1>
          <p className="text-muted">Earn commissions by referring customers to other vendors</p>
        </div>
        <Button 
          variant="outline-info" 
          className="d-flex align-items-center"
          onClick={() => setShowHowItWorks(!showHowItWorks)}
        >
          <FaInfoCircle className="me-2" /> How It Works
        </Button>
      </div>

      {/* How It Works (Collapsible) */}
      {showHowItWorks && (
        <Card className="mb-4 shadow-sm border-info">
          <Card.Body>
            <div className="affiliate-steps">
              <div className="d-flex mb-3">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h5>Submit a Cross Lead</h5>
                  <p>When a customer contacts you for a move that you cannot fulfill, submit their details as a cross lead.</p>
                </div>
              </div>
              
              <div className="d-flex mb-3">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h5>Other Vendors Respond</h5>
                  <p>Other vendors in our network will receive the lead and can submit quotes to the customer.</p>
                </div>
              </div>
              
              <div className="d-flex">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h5>Earn Commission</h5>
                  <p>If the customer books with one of these vendors, you earn a 5% discount on the commission for your next order.</p>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Simple Tab Navigation - Matching the vendor dashboard style */}
      <Row className="mb-4">
        <Col>
          <div className="simple-tabs">
            <div 
              className={`simple-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              role="button"
              tabIndex={0}
              aria-label="Show affiliate dashboard"
            >
              <FaChartLine className="me-2" />
              Dashboard
            </div>
            <div 
              className={`simple-tab ${activeTab === 'submitted' ? 'active' : ''}`}
              onClick={() => setActiveTab('submitted')}
              role="button"
              tabIndex={0}
              aria-label="Show my submitted leads"
            >
              <FaExchangeAlt className="me-2" />
              My Submitted Leads
            </div>
            <div 
              className={`simple-tab ${activeTab === 'received' ? 'active' : ''}`}
              onClick={() => setActiveTab('received')}
              role="button"
              tabIndex={0}
              aria-label="Show leads from other vendors"
            >
              <FaHandshake className="me-2" />
              Leads From Others
            </div>
          </div>
        </Col>
      </Row>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            <Row className="mb-4">
              <Col>
                <AffiliateStats />
              </Col>
            </Row>
            <Row>
              <Col className="text-center">
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="d-inline-flex align-items-center"
                  onClick={() => setActiveTab('submitted')}
                >
                  <FaPlus className="me-2" /> Submit New Cross Lead
                </Button>
              </Col>
            </Row>
          </>
        )}

        {/* My Submitted Leads Tab */}
        {activeTab === 'submitted' && (
          <Card className="shadow-sm">
            <Card.Body>
              <div className="mb-4">
                <CrossLeadForm onSubmitSuccess={refreshLeads} />
              </div>
              <MySubmittedLeads key={`submitted-${refreshTrigger}`} />
            </Card.Body>
          </Card>
        )}

        {/* Leads From Others Tab */}
        {activeTab === 'received' && (
          <Card className="shadow-sm">
            <Card.Body>
              <CrossLeadsList key={`received-${refreshTrigger}`} />
            </Card.Body>
          </Card>
        )}
      </div>

      <style jsx global>{`
        .step-number {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #0dcaf0;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-right: 16px;
          flex-shrink: 0;
        }
        
        .step-content {
          flex-grow: 1;
        }
        
        .step-content h5 {
          margin-bottom: 6px;
          color: #0dcaf0;
        }
        
        .step-content p {
          margin-bottom: 0;
          color: #6c757d;
        }
        
        .simple-tabs {
          display: flex;
          overflow-x: auto;
          background-color: #f8f9fa;
          border-radius: 10px;
          padding: 5px;
        }
        
        .simple-tab {
          padding: 12px 16px;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          border-radius: 8px;
          margin: 0 5px;
          transition: all 0.3s ease;
        }
        
        .simple-tab.active {
          background-color: #007bff;
          color: white;
        }
        
        @media (max-width: 768px) {
          .simple-tabs {
            flex-wrap: wrap;
          }
          
          .simple-tab {
            flex: 1 1 40%;
            margin: 5px;
            justify-content: center;
          }
        }
      `}</style>
    </Container>
  )
} 