'use client';

import React, { useState } from 'react';
import { Container, Row, Col, Card, ListGroup, Form, Button, Accordion } from 'react-bootstrap';
import Link from 'next/link';

/**
 * Help and Documentation Page
 * 
 * Provides users with guides, tutorials, and FAQs about the platform.
 */
const HelpPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('getting-started');

  // Categories and topics
  const helpCategories = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: 'bi-rocket-takeoff',
      topics: [
        { id: 'account-setup', title: 'Account Setup' },
        { id: 'platform-overview', title: 'Platform Overview' },
        { id: 'first-order', title: 'Creating Your First Order' },
        { id: 'navigation', title: 'Navigating the Platform' }
      ]
    },
    {
      id: 'customers',
      name: 'For Customers',
      icon: 'bi-people',
      topics: [
        { id: 'booking-move', title: 'Booking a Move' },
        { id: 'tracking-order', title: 'Tracking Your Order' },
        { id: 'comparing-quotes', title: 'Comparing Vendor Quotes' },
        { id: 'payments', title: 'Payment Methods and Process' },
        { id: 'cancellations', title: 'Cancellations and Refunds' }
      ]
    },
    {
      id: 'vendors',
      name: 'For Vendors',
      icon: 'bi-shop',
      topics: [
        { id: 'vendor-registration', title: 'Vendor Registration' },
        { id: 'managing-quotes', title: 'Managing Quotes' },
        { id: 'inventory-management', title: 'Inventory Management' },
        { id: 'order-fulfillment', title: 'Order Fulfillment Process' },
        { id: 'vendor-analytics', title: 'Understanding Analytics' }
      ]
    },
    {
      id: 'riders',
      name: 'For Riders',
      icon: 'bi-truck',
      topics: [
        { id: 'rider-registration', title: 'Rider Registration' },
        { id: 'accepting-orders', title: 'Accepting Orders' },
        { id: 'delivery-process', title: 'Delivery Process' },
        { id: 'rider-app', title: 'Using the Rider App' }
      ]
    },
    {
      id: 'troubleshooting',
      name: 'Troubleshooting',
      icon: 'bi-tools',
      topics: [
        { id: 'common-issues', title: 'Common Issues' },
        { id: 'payment-problems', title: 'Payment Problems' },
        { id: 'app-issues', title: 'App and Website Issues' },
        { id: 'contacting-support', title: 'Contacting Support' }
      ]
    },
    {
      id: 'policies',
      name: 'Policies',
      icon: 'bi-shield-check',
      topics: [
        { id: 'terms-service', title: 'Terms of Service' },
        { id: 'privacy-policy', title: 'Privacy Policy' },
        { id: 'refund-policy', title: 'Refund Policy' },
        { id: 'cancellation-policy', title: 'Cancellation Policy' }
      ]
    }
  ];

  // Get active category
  const activeCategoryData = helpCategories.find(category => category.id === activeCategory);

  // Filter topics based on search query
  const getFilteredTopics = () => {
    if (!searchQuery.trim()) {
      return activeCategoryData.topics;
    }
    
    const query = searchQuery.toLowerCase();
    return activeCategoryData.topics.filter(topic => 
      topic.title.toLowerCase().includes(query)
    );
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search logic here
  };
  
  // Topic content - This would typically come from a CMS or database
  const getTopicContent = (topicId) => {
    const topicContents = {
      'account-setup': (
        <>
          <h3>Account Setup</h3>
          <p>Setting up your MovePE account is quick and easy. Follow these simple steps to get started:</p>
          
          <h5>1. Registration</h5>
          <p>Visit our website or download the MovePE app and click on the "Sign Up" button. You can register using your email address or continue with your Google or Facebook account.</p>
          
          <h5>2. Verify Your Email</h5>
          <p>If you registered with an email address, you'll receive a verification email. Click on the link in the email to verify your account.</p>
          
          <h5>3. Complete Your Profile</h5>
          <p>Add your basic information such as name, phone number, and address to complete your profile. This information will be used to streamline the order process.</p>
          
          <h5>4. Set Notification Preferences</h5>
          <p>Choose how you want to receive updates about your orders and account. You can enable or disable email, SMS, and WhatsApp notifications.</p>
          
          <div className="mt-4 p-3 bg-light rounded">
            <h6><i className="bi bi-lightbulb-fill text-warning me-2"></i>Pro Tip</h6>
            <p className="mb-0">Add your frequently used addresses in your profile to save time when creating new move requests.</p>
          </div>
        </>
      ),
      'platform-overview': (
        <>
          <h3>Platform Overview</h3>
          <p>MovePE is a comprehensive platform designed to connect customers with moving and delivery services. Here's an overview of what our platform offers:</p>
          
          <h5>For Customers</h5>
          <ul>
            <li>Create and track moving and delivery requests</li>
            <li>Receive and compare quotes from multiple vendors</li>
            <li>Secure payment processing</li>
            <li>Real-time order tracking</li>
            <li>Rating and review system</li>
          </ul>
          
          <h5>For Vendors</h5>
          <ul>
            <li>Receive move requests from customers</li>
            <li>Submit competitive quotes</li>
            <li>Manage inventory and resources</li>
            <li>Track orders and deliveries</li>
            <li>Access analytics and performance metrics</li>
          </ul>
          
          <h5>For Riders</h5>
          <ul>
            <li>Accept delivery assignments</li>
            <li>Navigate to pickup and delivery locations</li>
            <li>Update delivery status in real-time</li>
            <li>Manage earnings and performance</li>
          </ul>
          
          <h5>Key Features</h5>
          <Row className="mt-3">
            <Col md={6} className="mb-3">
              <Card className="h-100">
                <Card.Body>
                  <h6><i className="bi bi-truck text-primary me-2"></i>Seamless Delivery</h6>
                  <p className="mb-0">From request to delivery, our platform ensures a smooth and transparent process.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="mb-3">
              <Card className="h-100">
                <Card.Body>
                  <h6><i className="bi bi-shield-check text-primary me-2"></i>Secure Transactions</h6>
                  <p className="mb-0">All payments are processed securely through our integrated payment gateway.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="mb-3">
              <Card className="h-100">
                <Card.Body>
                  <h6><i className="bi bi-geo-alt text-primary me-2"></i>Real-time Tracking</h6>
                  <p className="mb-0">Track your orders in real-time with accurate location updates.</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="mb-3">
              <Card className="h-100">
                <Card.Body>
                  <h6><i className="bi bi-star text-primary me-2"></i>Quality Assurance</h6>
                  <p className="mb-0">Our rating and review system ensures service quality and accountability.</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      ),
      // Additional topic content would be defined here...
      'booking-move': (
        <>
          <h3>Booking a Move</h3>
          <p>Booking a move on MovePE is straightforward. Follow these steps to create your move request:</p>
          
          <h5>Step 1: Create a Move Request</h5>
          <p>From your dashboard, click on "Book a Move" and fill in the required details:</p>
          <ul>
            <li>Pickup location (with pincode)</li>
            <li>Destination location (with pincode)</li>
            <li>Preferred date and time</li>
            <li>Move size (small, medium, large)</li>
            <li>Any special requirements or instructions</li>
          </ul>
          
          <h5>Step 2: Review Vendor Quotes</h5>
          <p>Once your request is submitted, vendors in your area will receive a notification. They'll review your requirements and submit quotes. You can:</p>
          <ul>
            <li>Compare quotes from multiple vendors</li>
            <li>Review vendor ratings and feedback</li>
            <li>View detailed price breakdowns</li>
            <li>Message vendors for clarification if needed</li>
          </ul>
          
          <h5>Step 3: Accept a Quote</h5>
          <p>After reviewing the quotes, select the vendor that best meets your needs and budget. You'll be redirected to the payment page.</p>
          
          <h5>Step 4: Make Payment</h5>
          <p>Complete the payment using one of our supported payment methods. You can choose to pay:</p>
          <ul>
            <li>The full amount upfront</li>
            <li>A deposit (with the remainder due at delivery)</li>
          </ul>
          
          <h5>Step 5: Prepare for Your Move</h5>
          <p>Once payment is confirmed, your move is officially scheduled. You'll receive confirmation details via email and in your dashboard.</p>
          
          <div className="mt-4 p-3 bg-light rounded">
            <h6><i className="bi bi-lightbulb-fill text-warning me-2"></i>Pro Tip</h6>
            <p className="mb-0">For the most competitive quotes, book your move at least 3-5 days in advance, especially during peak seasons.</p>
          </div>
        </>
      ),
    };
    
    return topicContents[topicId] || (
      <div className="text-center py-5">
        <i className="bi bi-file-earmark-text text-muted" style={{ fontSize: '3rem' }}></i>
        <p className="mt-3 text-muted">Content for this topic is under development.</p>
      </div>
    );
  };

  return (
    <Container className="py-5">
      <h1 className="mb-4">Help Center</h1>
      
      {/* Search Bar */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="bg-primary text-white">
          <h4 className="mb-3">How can we help you today?</h4>
          <Form onSubmit={handleSearch}>
            <div className="d-flex">
              <Form.Control
                type="text"
                placeholder="Search for help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow-1 me-2"
              />
              <Button type="submit" variant="light">
                Search
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      
      {/* Popular Help Topics */}
      <h4 className="mb-3">Popular Help Topics</h4>
      <Row className="g-3 mb-5">
        <Col md={4}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="d-flex flex-column align-items-center text-center p-4">
              <div className="rounded-circle bg-primary bg-opacity-10 p-3 mb-3">
                <i className="bi bi-question-circle text-primary" style={{ fontSize: '2rem' }}></i>
              </div>
              <h5>How to Track Orders</h5>
              <p className="text-muted">Learn how to track your orders in real-time</p>
              <Link href="/help?topic=tracking-order" className="mt-auto text-decoration-none">
                View Guide <i className="bi bi-arrow-right"></i>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="d-flex flex-column align-items-center text-center p-4">
              <div className="rounded-circle bg-primary bg-opacity-10 p-3 mb-3">
                <i className="bi bi-credit-card text-primary" style={{ fontSize: '2rem' }}></i>
              </div>
              <h5>Payment Methods</h5>
              <p className="text-muted">Learn about supported payment methods and processes</p>
              <Link href="/help?topic=payments" className="mt-auto text-decoration-none">
                View Guide <i className="bi bi-arrow-right"></i>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="d-flex flex-column align-items-center text-center p-4">
              <div className="rounded-circle bg-primary bg-opacity-10 p-3 mb-3">
                <i className="bi bi-x-circle text-primary" style={{ fontSize: '2rem' }}></i>
              </div>
              <h5>Cancellation Policy</h5>
              <p className="text-muted">Understand our cancellation and refund policies</p>
              <Link href="/help?topic=cancellation-policy" className="mt-auto text-decoration-none">
                View Guide <i className="bi bi-arrow-right"></i>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Help Categories and Content */}
      <Row>
        <Col lg={3} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-transparent">
              <h5 className="mb-0">Help Categories</h5>
            </Card.Header>
            <ListGroup variant="flush">
              {helpCategories.map(category => (
                <ListGroup.Item
                  key={category.id}
                  action
                  active={activeCategory === category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className="d-flex align-items-center"
                >
                  <i className={`bi ${category.icon} me-3`}></i>
                  {category.name}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
          
          <div className="mt-4">
            <Card className="border-0 shadow-sm">
              <Card.Body className="bg-light">
                <h5 className="mb-3">Need More Help?</h5>
                <p>Can't find what you're looking for? Our support team is here to help.</p>
                <div className="d-grid">
                  <Link href="/support" className="btn btn-primary">
                    Contact Support
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Col>
        
        <Col lg={9}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {/* Topic List */}
              <div className="mb-4">
                <h4>{activeCategoryData.name}</h4>
                <Row className="g-3">
                  {getFilteredTopics().map(topic => (
                    <Col md={6} key={topic.id}>
                      <Card 
                        className="h-100 border-0 shadow-sm"
                        onClick={() => {
                          // In a real app, this would navigate to the topic
                          window.location.hash = topic.id;
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Card.Body>
                          <h5>{topic.title}</h5>
                          <i className="bi bi-arrow-right text-primary"></i>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
              
              {/* Content Display */}
              <div id="account-setup" className="mt-5">
                {getTopicContent('account-setup')}
              </div>
              
              <div id="platform-overview" className="mt-5">
                {getTopicContent('platform-overview')}
              </div>
              
              <div id="booking-move" className="mt-5">
                {getTopicContent('booking-move')}
              </div>
              
              {/* FAQ Section */}
              <div className="mt-5">
                <h3 className="mb-4">Frequently Asked Questions</h3>
                <Accordion>
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>How do I track my order?</Accordion.Header>
                    <Accordion.Body>
                      You can track your order by logging into your account and navigating to the Orders section. Click on the specific order you want to track, and you'll see real-time updates on its status and location.
                    </Accordion.Body>
                  </Accordion.Item>
                  
                  <Accordion.Item eventKey="1">
                    <Accordion.Header>What payment methods do you accept?</Accordion.Header>
                    <Accordion.Body>
                      We accept a variety of payment methods including credit/debit cards, UPI, net banking, and digital wallets like PayTM and Google Pay. All payments are processed securely through our payment gateway.
                    </Accordion.Body>
                  </Accordion.Item>
                  
                  <Accordion.Item eventKey="2">
                    <Accordion.Header>What is your cancellation policy?</Accordion.Header>
                    <Accordion.Body>
                      You can cancel your order up to 24 hours before the scheduled pickup time for a full refund. Cancellations made within 24 hours of the scheduled pickup may incur a cancellation fee. For more details, please refer to our Cancellation Policy page.
                    </Accordion.Body>
                  </Accordion.Item>
                  
                  <Accordion.Item eventKey="3">
                    <Accordion.Header>How do I become a vendor on MovePE?</Accordion.Header>
                    <Accordion.Body>
                      To become a vendor, register an account and then navigate to the "Become a Vendor" section in your profile. You'll need to provide business details, service areas, and verification documents. Our team will review your application within 2-3 business days.
                    </Accordion.Body>
                  </Accordion.Item>
                  
                  <Accordion.Item eventKey="4">
                    <Accordion.Header>What happens if my items are damaged during a move?</Accordion.Header>
                    <Accordion.Body>
                      If your items are damaged during a move, document the damage with photos and report it through the support center within 24 hours of delivery. Our team will investigate the claim and work with the vendor to provide an appropriate resolution according to our damage policy.
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Video Tutorials */}
      <div className="mt-5">
        <h4 className="mb-4">Video Tutorials</h4>
        <Row className="g-4">
          <Col md={4}>
            <Card className="border-0 shadow-sm h-100">
              <div className="ratio ratio-16x9">
                <div className="bg-light d-flex align-items-center justify-content-center">
                  <i className="bi bi-play-circle" style={{ fontSize: '3rem' }}></i>
                </div>
              </div>
              <Card.Body>
                <h5>Getting Started with MovePE</h5>
                <p className="text-muted">Learn the basics of using the MovePE platform</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4}>
            <Card className="border-0 shadow-sm h-100">
              <div className="ratio ratio-16x9">
                <div className="bg-light d-flex align-items-center justify-content-center">
                  <i className="bi bi-play-circle" style={{ fontSize: '3rem' }}></i>
                </div>
              </div>
              <Card.Body>
                <h5>How to Book Your First Move</h5>
                <p className="text-muted">Step-by-step guide to creating a move request</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4}>
            <Card className="border-0 shadow-sm h-100">
              <div className="ratio ratio-16x9">
                <div className="bg-light d-flex align-items-center justify-content-center">
                  <i className="bi bi-play-circle" style={{ fontSize: '3rem' }}></i>
                </div>
              </div>
              <Card.Body>
                <h5>Tracking and Managing Orders</h5>
                <p className="text-muted">Learn how to track and manage your orders efficiently</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

export default HelpPage; 