import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { paymentService } from '../../../../lib/services/paymentService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'
import { authOptions } from '../../../../lib/auth'

export const dynamic = 'force-dynamic'

async function processRefund(request) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin (only admins can process refunds)
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can process refunds' },
        { status: 403 }
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
    const { orderId, paymentId, amount, reason } = requestData;
    if (!orderId || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and paymentId' },
        { status: 400 }
      );
    }

    // Process refund using payment service
    try {
      const refundResult = await paymentService.processRefund(
        orderId,
        paymentId,
        amount,
        reason,
        session.user.email
      );

      return NextResponse.json({
        success: true,
        refundId: refundResult.id,
        amount: refundResult.amount,
        status: refundResult.status,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to process refund' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in refund API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(processRefund, 'payment'); 