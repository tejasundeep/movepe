'use client'

import { useState, useEffect } from 'react'
import { Modal, Button, Alert, Spinner } from 'react-bootstrap'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function PaymentModal({ 
  show, 
  onHide, 
  orderId, 
  vendorId, 
  amount 
}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  useEffect(() => {
    // Reset error when modal is opened/closed
    if (show) setError('')
  }, [show])

  const handlePayment = async () => {
    if (!session) {
      setError('Please sign in to make a payment')
      return
    }

    if (!scriptLoaded) {
      setError('Payment system is still loading. Please wait.')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Create Razorpay order through our payment service API
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId, quoteId: vendorId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment order')
      }

      const data = await response.json()

      // Initialize Razorpay
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'Move Management System',
        description: `Payment for Order #${orderId}`,
        order_id: data.id,
        handler: async function (response) {
          try {
            // Verify payment through our payment service API
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                orderId,
                vendorId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            })

            let errorData;
            try {
              const responseData = await verifyResponse.json();
              
              if (!verifyResponse.ok) {
                errorData = responseData;
                throw new Error(errorData.error || 'Payment verification failed');
              }
              
              // Close modal and redirect
              onHide();
              router.refresh(); // Refresh the page data
              router.push(`/order/${orderId}`);
            } catch (jsonError) {
              console.error('Error parsing verification response:', jsonError);
              
              if (verifyResponse.status === 200) {
                // If status is OK but JSON parsing failed, still consider it a success
                onHide();
                router.refresh();
                router.push(`/order/${orderId}`);
              } else {
                // Handle error from non-JSON response
                const errorText = errorData?.error || 'Payment verification failed with an unexpected response';
                throw new Error(errorText);
              }
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setError('Failed to verify payment. Please contact support.');
            setLoading(false);
          }
        },
        prefill: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          contact: '' // You can get this from user profile
        },
        modal: {
          ondismiss: function() {
            setLoading(false)
          }
        },
        theme: {
          color: '#0d6efd'
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', function (response) {
        setError(`Payment failed: ${response.error.description}`)
        setLoading(false)
      })
      razorpay.open()
    } catch (error) {
      console.error('Payment error:', error)
      setError(error.message || 'Failed to initiate payment. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setError('Failed to load payment system')}
      />
      
      <Modal show={show} onHide={onHide} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Payment Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <p><strong>Order ID:</strong> {orderId}</p>
          <p><strong>Amount:</strong> ₹{amount ? amount.toLocaleString('en-IN') : 'N/A'}</p>
          
          <div className="alert alert-info">
            <small>
              You will be redirected to Razorpay's secure payment gateway to complete your payment.
              Please do not refresh or close this window during the payment process.
            </small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={onHide}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePayment}
            disabled={loading || !scriptLoaded || !amount}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
} 