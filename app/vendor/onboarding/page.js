'use client'

import { useState } from 'react'
import { Container, Row, Col, Card, Button, ProgressBar } from 'react-bootstrap'
import { useRouter } from 'next/navigation'
import { FaCheck, FaMapMarkerAlt, FaRupeeSign, FaTruck, FaStar, FaPhoneAlt } from 'react-icons/fa'

export default function VendorOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const router = useRouter()
  const totalSteps = 5

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      router.push('/vendor/dashboard')
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center mb-5">
        <Col md={10} lg={8}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h1 className="text-center mb-4">Welcome to MovePe!</h1>
              
              <ProgressBar 
                now={(currentStep / totalSteps) * 100} 
                className="mb-4" 
                variant="success"
              />
              
              <div className="step-indicator mb-4">
                <div className="d-flex justify-content-between">
                  {[1, 2, 3, 4, 5].map(step => (
                    <div 
                      key={step} 
                      className={`step-circle ${step <= currentStep ? 'active' : ''}`}
                      onClick={() => setCurrentStep(step)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Go to step ${step}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setCurrentStep(step);
                        }
                      }}
                    >
                      {step < currentStep ? <FaCheck /> : step}
                    </div>
                  ))}
                </div>
                <div className="step-title text-center mt-2">
                  {currentStep === 1 && "How It Works"}
                  {currentStep === 2 && "Getting Job Requests"}
                  {currentStep === 3 && "Sending Price Quotes"}
                  {currentStep === 4 && "Completing Jobs"}
                  {currentStep === 5 && "Getting Paid"}
                </div>
              </div>
              
              {/* Step 1: How It Works */}
              {currentStep === 1 && (
                <div className="step-content">
                  <div className="text-center mb-4">
                    <img 
                      src="/images/vendor-onboarding-1.png" 
                      alt="How It Works" 
                      className="img-fluid rounded mb-3"
                      style={{ maxHeight: '200px' }}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.style.display = 'none'
                      }}
                    />
                    <h3>How MovePe Works</h3>
                  </div>
                  
                  <div className="simple-steps">
                    <div className="simple-step">
                      <div className="step-number">1</div>
                      <div className="step-text">
                        Customers request moving services
                      </div>
                    </div>
                    
                    <div className="simple-step">
                      <div className="step-number">2</div>
                      <div className="step-text">
                        You receive job requests
                      </div>
                    </div>
                    
                    <div className="simple-step">
                      <div className="step-number">3</div>
                      <div className="step-text">
                        You send your price
                      </div>
                    </div>
                    
                    <div className="simple-step">
                      <div className="step-number">4</div>
                      <div className="step-text">
                        Customer selects you
                      </div>
                    </div>
                    
                    <div className="simple-step">
                      <div className="step-number">5</div>
                      <div className="step-text">
                        You complete the job and get paid
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 2: Getting Job Requests */}
              {currentStep === 2 && (
                <div className="step-content">
                  <div className="text-center mb-4">
                    <div className="icon-circle mb-3">
                      <FaMapMarkerAlt size={40} />
                    </div>
                    <h3>Getting Job Requests</h3>
                  </div>
                  
                  <div className="info-card mb-4">
                    <h4>How You'll Get Jobs:</h4>
                    <ul className="simple-list">
                      <li>
                        <span className="bullet">•</span>
                        <span>Customers in your service area will send you job requests</span>
                      </li>
                      <li>
                        <span className="bullet">•</span>
                        <span>You'll get a notification by SMS and email</span>
                      </li>
                      <li>
                        <span className="bullet">•</span>
                        <span>New jobs will appear in your dashboard</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="info-card">
                    <h4>Your Availability:</h4>
                    <div className="d-flex align-items-center justify-content-center mb-3">
                      <div className="availability-toggle">
                        <div className="toggle-option active">
                          Available
                        </div>
                        <div className="toggle-option">
                          Not Available
                        </div>
                      </div>
                    </div>
                    <p className="text-center">
                      You can change your availability anytime from your dashboard
                    </p>
                  </div>
                </div>
              )}
              
              {/* Step 3: Sending Price Quotes */}
              {currentStep === 3 && (
                <div className="step-content">
                  <div className="text-center mb-4">
                    <div className="icon-circle mb-3">
                      <FaRupeeSign size={40} />
                    </div>
                    <h3>Sending Price Quotes</h3>
                  </div>
                  
                  <div className="demo-card mb-4">
                    <div className="demo-header">
                      <span className="badge bg-primary">New Request</span>
                      <span className="move-type">2BHK Move</span>
                    </div>
                    <div className="demo-body">
                      <div className="demo-location">
                        <FaMapMarkerAlt className="me-2" />
                        <span><strong>From:</strong> 400001 <strong>To:</strong> 400701</span>
                      </div>
                      <div className="demo-price-box">
                        <div className="demo-price-label">Suggested Price</div>
                        <div className="demo-price-value">₹9,000</div>
                      </div>
                      <button className="demo-button">Send Price Quote</button>
                    </div>
                  </div>
                  
                  <div className="info-card">
                    <h4>Tips for Pricing:</h4>
                    <ul className="simple-list">
                      <li>
                        <span className="bullet">•</span>
                        <span>We'll suggest a price based on the job details</span>
                      </li>
                      <li>
                        <span className="bullet">•</span>
                        <span>You can use our suggestion or set your own price</span>
                      </li>
                      <li>
                        <span className="bullet">•</span>
                        <span>Competitive prices get more jobs</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Step 4: Completing Jobs */}
              {currentStep === 4 && (
                <div className="step-content">
                  <div className="text-center mb-4">
                    <div className="icon-circle mb-3">
                      <FaTruck size={40} />
                    </div>
                    <h3>Completing Jobs</h3>
                  </div>
                  
                  <div className="process-steps mb-4">
                    <div className="process-step">
                      <div className="process-icon">
                        <FaPhoneAlt />
                      </div>
                      <div className="process-text">
                        <h5>Contact Customer</h5>
                        <p>Call the customer to confirm details</p>
                      </div>
                    </div>
                    
                    <div className="process-connector"></div>
                    
                    <div className="process-step">
                      <div className="process-icon">
                        <FaTruck />
                      </div>
                      <div className="process-text">
                        <h5>Do the Move</h5>
                        <p>Complete the moving service</p>
                      </div>
                    </div>
                    
                    <div className="process-connector"></div>
                    
                    <div className="process-step">
                      <div className="process-icon">
                        <FaCheck />
                      </div>
                      <div className="process-text">
                        <h5>Mark as Complete</h5>
                        <p>Update the job status when done</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="info-card">
                    <h4>Important:</h4>
                    <p className="text-center">
                      Always provide good service to get positive reviews from customers
                    </p>
                  </div>
                </div>
              )}
              
              {/* Step 5: Getting Paid */}
              {currentStep === 5 && (
                <div className="step-content">
                  <div className="text-center mb-4">
                    <div className="icon-circle mb-3">
                      <FaRupeeSign size={40} />
                    </div>
                    <h3>Getting Paid</h3>
                  </div>
                  
                  <div className="payment-info mb-4">
                    <div className="payment-method">
                      <h4>Payment Methods:</h4>
                      <div className="payment-options">
                        <div className="payment-option">
                          <div className="payment-icon">💳</div>
                          <div>Online Payment</div>
                        </div>
                        <div className="payment-option">
                          <div className="payment-icon">💵</div>
                          <div>Cash on Delivery</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="info-card mb-4">
                    <h4>Payment Process:</h4>
                    <ul className="simple-list">
                      <li>
                        <span className="bullet">•</span>
                        <span>Online payments go directly to your bank account</span>
                      </li>
                      <li>
                        <span className="bullet">•</span>
                        <span>For cash payments, you collect from the customer</span>
                      </li>
                      <li>
                        <span className="bullet">•</span>
                        <span>Our fee is 10% of the job value</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="text-center">
                    <div className="rating-stars">
                      <FaStar color="#FFD700" />
                      <FaStar color="#FFD700" />
                      <FaStar color="#FFD700" />
                      <FaStar color="#FFD700" />
                      <FaStar color="#FFD700" />
                    </div>
                    <p>Good service = Good ratings = More jobs!</p>
                  </div>
                </div>
              )}
              
              <div className="d-flex justify-content-between mt-4">
                <Button 
                  variant="outline-secondary" 
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  aria-label="Go to previous step"
                >
                  Back
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleNext}
                  aria-label={currentStep === totalSteps ? 'Finish onboarding and go to dashboard' : 'Go to next step'}
                >
                  {currentStep === totalSteps ? 'Go to Dashboard' : 'Next'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <style jsx global>{`
        .step-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .step-circle.active {
          background-color: #28a745;
          color: white;
        }
        
        .simple-steps {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .simple-step {
          display: flex;
          align-items: center;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 10px;
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
        }
        
        .step-text {
          font-size: 16px;
        }
        
        .info-card {
          background-color: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
        }
        
        .info-card h4 {
          text-align: center;
          margin-bottom: 15px;
          color: #007bff;
        }
        
        .simple-list {
          list-style-type: none;
          padding: 0;
        }
        
        .simple-list li {
          display: flex;
          margin-bottom: 10px;
        }
        
        .bullet {
          color: #007bff;
          font-size: 20px;
          margin-right: 10px;
          line-height: 1;
        }
        
        .icon-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: #e8f4ff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          color: #007bff;
        }
        
        .availability-toggle {
          display: flex;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #dee2e6;
        }
        
        .toggle-option {
          padding: 10px 20px;
          cursor: pointer;
          text-align: center;
          background-color: #f8f9fa;
        }
        
        .toggle-option.active {
          background-color: #28a745;
          color: white;
        }
        
        .demo-card {
          border: 1px solid #dee2e6;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .demo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }
        
        .demo-body {
          padding: 15px;
        }
        
        .demo-location {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .demo-price-box {
          background-color: #e8f4ff;
          border-radius: 10px;
          padding: 15px;
          text-align: center;
          margin-bottom: 15px;
        }
        
        .demo-price-label {
          font-size: 14px;
          color: #0066cc;
          margin-bottom: 5px;
        }
        
        .demo-price-value {
          font-size: 24px;
          font-weight: bold;
        }
        
        .demo-button {
          width: 100%;
          padding: 10px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        
        .process-steps {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .process-step {
          display: flex;
          align-items: center;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 10px;
        }
        
        .process-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #007bff;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
        }
        
        .process-text h5 {
          margin-bottom: 5px;
        }
        
        .process-text p {
          margin-bottom: 0;
          color: #6c757d;
        }
        
        .process-connector {
          width: 2px;
          height: 20px;
          background-color: #007bff;
          margin-left: 20px;
        }
        
        .payment-options {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 15px;
        }
        
        .payment-option {
          text-align: center;
        }
        
        .payment-icon {
          font-size: 30px;
          margin-bottom: 5px;
        }
        
        .rating-stars {
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        @media (max-width: 768px) {
          .step-circle {
            width: 30px;
            height: 30px;
            font-size: 14px;
          }
          
          .payment-options {
            flex-direction: column;
            gap: 10px;
          }
        }
      `}</style>
    </Container>
  )
} 