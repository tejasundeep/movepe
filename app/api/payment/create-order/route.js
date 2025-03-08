import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { paymentService } from '../../../../lib/services/paymentService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

export const dynamic = 'force-dynamic'

async function createPaymentOrder(request) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
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

    // Validate required fields
    const { orderId, quoteId } = requestData;
    if (!orderId || !quoteId) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and quoteId' },
        { status: 400 }
      );
    }

    // Validate orderId format (assuming it's a UUID or similar)
    if (typeof orderId !== 'string' || orderId.length < 8) {
      return NextResponse.json(
        { error: 'Invalid orderId format' },
        { status: 400 }
      );
    }

    // Use the payment service to create a payment order
    try {
      const paymentOrder = await paymentService.createPaymentOrder(
        orderId,
        quoteId,
        session.user.email
      );

      return NextResponse.json(paymentOrder);
    } catch (error) {
      console.error('Error creating payment order:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create payment order' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in create-order API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(createPaymentOrder, 'payment'); 