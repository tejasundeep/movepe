'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MoveForm from '../components/MoveForm'
import ParcelDeliveryForm from '../components/ParcelDeliveryForm'
import PriceEstimator from './components/PriceEstimator'
import { Container, Row, Col, Spinner, Card, Tab, Tabs } from 'react-bootstrap'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  useEffect(() => {
    // Redirect vendors to vendor dashboard
    if (status === 'authenticated' && session?.user?.role === 'vendor') {
      router.push('/vendor/dashboard')
    }
  }, [status, session, router])
  
  // Show loading spinner while checking authentication
  if (status === 'loading') {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    )
  }
  
  // If user is a vendor, this will show briefly before the redirect happens
  if (status === 'authenticated' && session?.user?.role === 'vendor') {
    return (
      <Container className="py-5 text-center">
        <p>Redirecting to vendor dashboard...</p>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Redirecting...</span>
        </Spinner>
      </Container>
    )
  }
  
  // Default home page for users who are not vendors
  return (
    <Container className="py-5">
      <Row className="justify-content-center mb-5">
        <Col md={10} lg={8}>
          <h1 className="text-center mb-4">Moving Made Simple</h1>
          <p className="text-center lead mb-5">
            Get instant price estimates, book your move, and connect with verified moving professionals.
          </p>
        </Col>
      </Row>
      
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className="shadow-sm">
            <Card.Body>
              <Tabs defaultActiveKey="estimate" id="home-tabs" className="mb-4">
                <Tab eventKey="estimate" title="Get Price Estimate">
                  <PriceEstimator 
                    onEstimateGenerated={(estimate) => {
                      console.log('Estimate generated:', estimate);
                      // Could store this in local storage or context for later use
                    }}
                  />
                </Tab>
                <Tab eventKey="book" title="Book a Move">
                  <MoveForm />
                </Tab>
                <Tab eventKey="parcel" title="Parcel Delivery">
                  <ParcelDeliveryForm />
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mt-5 pt-3">
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-3">Accurate Pricing</h3>
              <p>Our advanced pricing engine considers distance, home size, and over 20 other factors to give you the most accurate moving cost estimate.</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-3">Verified Vendors</h3>
              <p>All our moving partners are thoroughly vetted and rated by customers to ensure quality service for your move.</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-3">Real-Time Tracking</h3>
              <p>Track your move from start to finish with real-time updates and transparent communication.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
} 