import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { paymentService } from '../../../../lib/services/paymentService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

export const dynamic = 'force-dynamic'

async function verifyPayment(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      console.error('Error parsing request JSON:', error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
      vendorId
    } = requestData;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId || !vendorId) {
      return NextResponse.json(
        { error: 'Missing required payment information' },
        { status: 400 }
      )
    }

    // Use the payment service to verify the payment
    try {
      await paymentService.verifyPayment(
        orderId,
        vendorId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        session.user.email
      );

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        orderId,
        vendorId
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to verify payment' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in verify payment API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(verifyPayment, 'payment'); 