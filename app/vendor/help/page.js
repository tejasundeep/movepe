'use client'

import { useState } from 'react'
import { Container, Row, Col, Card, Accordion, Button } from 'react-bootstrap'
import { FaQuestionCircle, FaPhoneAlt, FaWhatsapp, FaEnvelope, FaRupeeSign, FaTruck, FaUser, FaStar } from 'react-icons/fa'

export default function VendorHelp() {
  const [activeCategory, setActiveCategory] = useState('basics')

  const helpCategories = [
    { id: 'basics', name: 'Basics', icon: <FaQuestionCircle /> },
    { id: 'pricing', name: 'Pricing', icon: <FaRupeeSign /> },
    { id: 'jobs', name: 'Jobs', icon: <FaTruck /> },
    { id: 'account', name: 'Account', icon: <FaUser /> },
    { id: 'ratings', name: 'Ratings', icon: <FaStar /> }
  ]

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">Vendor Help Center</h1>
          <p className="text-center lead">Find answers to common questions</p>
        </Col>
      </Row>

      {/* Help Categories */}
      <Row className="mb-5">
        <Col>
          <div className="help-categories">
            {helpCategories.map(category => (
              <div 
                key={category.id}
                className={`help-category ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
                role="button"
                tabIndex={0}
                aria-label={`Show ${category.name} help topics`}
                aria-selected={activeCategory === category.id}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveCategory(category.id);
                  }
                }}
              >
                <div className="category-icon">
                  {category.icon}
                </div>
                <div className="category-name">
                  {category.name}
                </div>
              </div>
            ))}
          </div>
        </Col>
      </Row>

      {/* Basics */}
      {activeCategory === 'basics' && (
        <Row>
          <Col md={12} lg={8} className="mx-auto">
            <Card className="mb-4 shadow-sm">
              <Card.Body>
                <h3 className="mb-4">Getting Started</h3>
                
                <div className="help-item mb-4">
                  <div className="help-question">
                    <h5>How do I get started as a vendor?</h5>
                  </div>
                  <div className="help-answer">
                    <ol className="simple-steps">
                      <li>Complete your profile with all details</li>
                      <li>Set your service areas (pincodes you serve)</li>
                      <li>Set your availability to "Available"</li>
                      <li>Wait for job requests to come in</li>
                    </ol>
                    <div className="text-center mt-3">
                      <Button variant="primary" href="/vendor/onboarding">
                        View Onboarding Guide
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="help-item mb-4">
                  <div className="help-question">
                    <h5>How do I receive job requests?</h5>
                  </div>
                  <div className="help-answer">
                    <p>
                      When a customer in your service area needs a moving service, you'll receive:
                    </p>
                    <div className="notification-types">
                      <div className="notification-type">
                        <div className="notification-icon">
                          <FaEnvelope size={24} />
                        </div>
                        <div>Email</div>
                      </div>
                      <div className="notification-type">
                        <div className="notification-icon">
                          <FaPhoneAlt size={24} />
                        </div>
                        <div>SMS</div>
                      </div>
                      <div className="notification-type">
                        <div className="notification-icon">
                          <FaWhatsapp size={24} />
                        </div>
                        <div>WhatsApp</div>
                      </div>
                    </div>
                    <p className="mt-3">
                      You'll also see new requests in your dashboard.
                    </p>
                  </div>
                </div>
                
                <div className="help-item">
                  <div className="help-question">
                    <h5>How do I set my availability?</h5>
                  </div>
                  <div className="help-answer">
                    <div className="help-image mb-3">
                      <img 
                        src="/images/help-availability.png" 
                        alt="Availability Toggle" 
                        className="img-fluid border rounded"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                    <p>
                      On your dashboard, click the "Available" or "Not Available" button at the top.
                    </p>
                    <ul className="simple-list">
                      <li>
                        <span className="bullet green">●</span>
                        <span><strong>Available:</strong> You will receive new job requests</span>
                      </li>
                      <li>
                        <span className="bullet red">●</span>
                        <span><strong>Not Available:</strong> You won't receive new job requests</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Pricing */}
      {activeCategory === 'pricing' && (
        <Row>
          <Col md={12} lg={8} className="mx-auto">
            <Card className="mb-4 shadow-sm">
              <Card.Body>
                <h3 className="mb-4">Pricing Help</h3>
                
                <div className="help-item mb-4">
                  <div className="help-question">
                    <h5>How do I send a price quote?</h5>
                  </div>
                  <div className="help-answer">
                    <div className="steps-with-images">
                      <div className="step-with-image">
                        <div className="step-number">1</div>
                        <div className="step-content">
                          <p>Find the new request in your dashboard</p>
                          <div className="help-image">
                            <img 
                              src="/images/help-quote-1.png" 
                              alt="New Request" 
                              className="img-fluid border rounded"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.style.display = 'none'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="step-with-image">
                        <div className="step-number">2</div>
                        <div className="step-content">
                          <p>Click "Send Price Quote" button</p>
                          <div className="help-image">
                            <img 
                              src="/images/help-quote-2.png" 
                              alt="Send Quote Button" 
                              className="img-fluid border rounded"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.style.display = 'none'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="step-with-image">
                        <div className="step-number">3</div>
                        <div className="step-content">
                          <p>Enter your price and click "Send Price"</p>
                          <div className="help-image">
                            <img 
                              src="/images/help-quote-3.png" 
                              alt="Enter Price" 
                              className="img-fluid border rounded"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.style.display = 'none'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="help-item">
                  <div className="help-question">
                    <h5>What price should I quote?</h5>
                  </div>
                  <div className="help-answer">
                    <p>
                      We provide a suggested price based on:
                    </p>
                    <ul className="simple-list">
                      <li>
                        <span className="bullet">●</span>
                        <span>Distance between locations</span>
                      </li>
                      <li>
                        <span className="bullet">●</span>
                        <span>Size of the move (1BHK, 2BHK, etc.)</span>
                      </li>
                      <li>
                        <span className="bullet">●</span>
                        <span>Current market rates</span>
                      </li>
                    </ul>
                    <div className="pricing-tips mt-3">
                      <h6>Tips for successful pricing:</h6>
                      <ul className="simple-list">
                        <li>
                          <span className="bullet green">●</span>
                          <span>Stay close to the suggested price</span>
                        </li>
                        <li>
                          <span className="bullet yellow">●</span>
                          <span>Competitive prices get more jobs</span>
                        </li>
                        <li>
                          <span className="bullet red">●</span>
                          <span>Very high prices are rarely selected</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Jobs */}
      {activeCategory === 'jobs' && (
        <Row>
          <Col md={12} lg={8} className="mx-auto">
            <Card className="mb-4 shadow-sm">
              <Card.Body>
                <h3 className="mb-4">Managing Jobs</h3>
                
                <div className="help-item mb-4">
                  <div className="help-question">
                    <h5>What do the different job statuses mean?</h5>
                  </div>
                  <div className="help-answer">
                    <div className="status-cards">
                      <div className="status-card primary">
                        <div className="status-name">New Request</div>
                        <div className="status-description">
                          Customer is waiting for your price quote
                        </div>
                      </div>
                      
                      <div className="status-card warning">
                        <div className="status-name">Waiting</div>
                        <div className="status-description">
                          You sent a price, waiting for customer to decide
                        </div>
                      </div>
                      
                      <div className="status-card success">
                        <div className="status-name">Confirmed</div>
                        <div className="status-description">
                          Customer selected your price and paid
                        </div>
                      </div>
                      
                      <div className="status-card danger">
                        <div className="status-name">Not Selected</div>
                        <div className="status-description">
                          Customer selected another vendor
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="help-item">
                  <div className="help-question">
                    <h5>How do I complete a job?</h5>
                  </div>
                  <div className="help-answer">
                    <div className="steps-with-images">
                      <div className="step-with-image">
                        <div className="step-number">1</div>
                        <div className="step-content">
                          <p>Contact the customer to confirm details</p>
                          <div className="contact-methods">
                            <div className="contact-method">
                              <FaPhoneAlt size={24} />
                              <div>Call</div>
                            </div>
                            <div className="contact-method">
                              <FaWhatsapp size={24} />
                              <div>WhatsApp</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="step-with-image">
                        <div className="step-number">2</div>
                        <div className="step-content">
                          <p>Complete the moving service</p>
                        </div>
                      </div>
                      
                      <div className="step-with-image">
                        <div className="step-number">3</div>
                        <div className="step-content">
                          <p>Mark the job as complete in your dashboard</p>
                          <div className="help-image">
                            <img 
                              src="/images/help-complete-job.png" 
                              alt="Complete Job" 
                              className="img-fluid border rounded"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.style.display = 'none'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Account */}
      {activeCategory === 'account' && (
        <Row>
          <Col md={12} lg={8} className="mx-auto">
            <Card className="mb-4 shadow-sm">
              <Card.Body>
                <h3 className="mb-4">Account Settings</h3>
                
                <div className="help-item mb-4">
                  <div className="help-question">
                    <h5>How do I update my profile?</h5>
                  </div>
                  <div className="help-answer">
                    <ol className="simple-steps">
                      <li>Go to "Settings" in the menu</li>
                      <li>Click on "Profile"</li>
                      <li>Update your information</li>
                      <li>Click "Save Changes"</li>
                    </ol>
                    <div className="text-center mt-3">
                      <Button variant="primary" href="/vendor/settings/profile">
                        Go to Profile Settings
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="help-item">
                  <div className="help-question">
                    <h5>How do I update my service areas?</h5>
                  </div>
                  <div className="help-answer">
                    <p>
                      Service areas are the pincodes where you offer your moving services.
                    </p>
                    <ol className="simple-steps">
                      <li>Go to "Settings" in the menu</li>
                      <li>Click on "Service Areas"</li>
                      <li>Add or remove pincodes</li>
                      <li>Click "Save Changes"</li>
                    </ol>
                    <div className="text-center mt-3">
                      <Button variant="primary" href="/vendor/settings/service-areas">
                        Go to Service Areas
                      </Button>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Ratings */}
      {activeCategory === 'ratings' && (
        <Row>
          <Col md={12} lg={8} className="mx-auto">
            <Card className="mb-4 shadow-sm">
              <Card.Body>
                <h3 className="mb-4">Ratings & Reviews</h3>
                
                <div className="help-item mb-4">
                  <div className="help-question">
                    <h5>How do ratings work?</h5>
                  </div>
                  <div className="help-answer">
                    <p>
                      After completing a job, customers can rate your service from 1 to 5 stars.
                    </p>
                    <div className="rating-example">
                      <div className="stars">
                        <FaStar color="#FFD700" />
                        <FaStar color="#FFD700" />
                        <FaStar color="#FFD700" />
                        <FaStar color="#FFD700" />
                        <FaStar color="#FFD700" />
                      </div>
                      <div>5 stars = Excellent service</div>
                    </div>
                    <p className="mt-3">
                      Your average rating is shown on your profile and affects how many jobs you get.
                    </p>
                  </div>
                </div>
                
                <div className="help-item">
                  <div className="help-question">
                    <h5>How do I respond to reviews?</h5>
                  </div>
                  <div className="help-answer">
                    <div className="steps-with-images">
                      <div className="step-with-image">
                        <div className="step-number">1</div>
                        <div className="step-content">
                          <p>Go to "Reviews" in the menu</p>
                        </div>
                      </div>
                      
                      <div className="step-with-image">
                        <div className="step-number">2</div>
                        <div className="step-content">
                          <p>Find the review you want to respond to</p>
                        </div>
                      </div>
                      
                      <div className="step-with-image">
                        <div className="step-number">3</div>
                        <div className="step-content">
                          <p>Click "Respond" and write your response</p>
                          <div className="help-image">
                            <img 
                              src="/images/help-review-response.png" 
                              alt="Review Response" 
                              className="img-fluid border rounded"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.style.display = 'none'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="tips-box mt-3">
                      <h6>Tips for responding to reviews:</h6>
                      <ul className="simple-list">
                        <li>
                          <span className="bullet">●</span>
                          <span>Always be polite and professional</span>
                        </li>
                        <li>
                          <span className="bullet">●</span>
                          <span>Thank customers for positive reviews</span>
                        </li>
                        <li>
                          <span className="bullet">●</span>
                          <span>For negative reviews, apologize and explain how you'll improve</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Contact Support */}
      <Row className="mt-5">
        <Col md={12} lg={8} className="mx-auto">
          <Card className="shadow-sm">
            <Card.Body className="text-center p-4">
              <h3 className="mb-3">Need More Help?</h3>
              <p>Our support team is here to help you</p>
              <div className="support-options">
                <a href="tel:+911234567890" className="support-option" aria-label="Call support at +91 1234567890">
                  <div className="support-icon">
                    <FaPhoneAlt size={24} />
                  </div>
                  <div>
                    <div className="support-label">Call Us</div>
                    <div className="support-value">+91 1234567890</div>
                  </div>
                </a>
                <a href="https://wa.me/911234567890" className="support-option" target="_blank" rel="noopener noreferrer" aria-label="Contact support via WhatsApp">
                  <div className="support-icon">
                    <FaWhatsapp size={24} />
                  </div>
                  <div>
                    <div className="support-label">WhatsApp</div>
                    <div className="support-value">+91 1234567890</div>
                  </div>
                </a>
                <a href="mailto:support@movepe.com" className="support-option" aria-label="Email support at support@movepe.com">
                  <div className="support-icon">
                    <FaEnvelope size={24} />
                  </div>
                  <div>
                    <div className="support-label">Email</div>
                    <div className="support-value">support@movepe.com</div>
                  </div>
                </a>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style jsx global>{`
        .help-categories {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .help-category {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 15px;
          border-radius: 10px;
          background-color: #f8f9fa;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 120px;
        }
        
        .help-category:hover {
          background-color: #e9ecef;
        }
        
        .help-category.active {
          background-color: #007bff;
          color: white;
        }
        
        .category-icon {
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        .help-item {
          margin-bottom: 30px;
          border-bottom: 1px solid #dee2e6;
          padding-bottom: 20px;
        }
        
        .help-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        
        .help-question {
          margin-bottom: 15px;
        }
        
        .help-answer {
          color: #495057;
        }
        
        .simple-steps {
          padding-left: 20px;
        }
        
        .simple-steps li {
          margin-bottom: 10px;
        }
        
        .notification-types {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin: 20px 0;
        }
        
        .notification-type {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .notification-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background-color: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          color: #007bff;
        }
        
        .simple-list {
          list-style-type: none;
          padding: 0;
        }
        
        .simple-list li {
          display: flex;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        
        .bullet {
          color: #007bff;
          font-size: 20px;
          margin-right: 10px;
          line-height: 1;
        }
        
        .bullet.green {
          color: #28a745;
        }
        
        .bullet.red {
          color: #dc3545;
        }
        
        .bullet.yellow {
          color: #ffc107;
        }
        
        .help-image {
          margin: 15px 0;
          text-align: center;
        }
        
        .help-image img {
          max-width: 100%;
          max-height: 200px;
        }
        
        .steps-with-images {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .step-with-image {
          display: flex;
          align-items: flex-start;
        }
        
        .step-number {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #007bff;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-right: 15px;
          flex-shrink: 0;
        }
        
        .step-content {
          flex-grow: 1;
        }
        
        .status-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        
        .status-card {
          padding: 15px;
          border-radius: 10px;
          text-align: center;
        }
        
        .status-card.primary {
          background-color: #cfe2ff;
          color: #084298;
        }
        
        .status-card.warning {
          background-color: #fff3cd;
          color: #664d03;
        }
        
        .status-card.success {
          background-color: #d1e7dd;
          color: #0f5132;
        }
        
        .status-card.danger {
          background-color: #f8d7da;
          color: #842029;
        }
        
        .status-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .contact-methods {
          display: flex;
          gap: 20px;
          margin-top: 10px;
        }
        
        .contact-method {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #007bff;
        }
        
        .rating-example {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 15px 0;
        }
        
        .stars {
          display: flex;
          gap: 5px;
          margin-bottom: 5px;
        }
        
        .tips-box {
          background-color: #f8f9fa;
          border-radius: 10px;
          padding: 15px;
        }
        
        .support-options {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
        }
        
        .support-option {
          display: flex;
          align-items: center;
          padding: 15px;
          border-radius: 10px;
          background-color: #f8f9fa;
          text-decoration: none;
          color: inherit;
          transition: all 0.3s ease;
        }
        
        .support-option:hover {
          background-color: #e9ecef;
        }
        
        .support-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background-color: #e8f4ff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          color: #007bff;
        }
        
        .support-label {
          font-size: 14px;
          color: #6c757d;
        }
        
        .support-value {
          font-weight: bold;
        }
        
        @media (max-width: 768px) {
          .help-categories {
            gap: 10px;
          }
          
          .help-category {
            width: 100px;
            padding: 10px;
          }
          
          .notification-types {
            flex-direction: column;
            align-items: center;
            gap: 15px;
          }
          
          .status-cards {
            grid-template-columns: 1fr;
          }
          
          .support-options {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </Container>
  )
} 