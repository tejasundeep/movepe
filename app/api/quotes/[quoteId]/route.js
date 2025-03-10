export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { orderService } from '../../../../lib/services/orderService';
import { vendorService } from '../../../../lib/services/vendorService';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// GET /api/quotes/[quoteId] - Get a specific quote
async function getQuote(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { quoteId } = params;
    
    // Get the quote
    const quote = await orderService.getQuoteById(quoteId);
    
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    
    // Check if user has permission to view the quote
    const order = await orderService.getOrderById(quote.orderId);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    const vendor = await vendorService.getVendorById(quote.vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    // Allow access if user is the customer, the vendor, or an admin
    if (
      order.customerId !== session.user.id &&
      vendor.userId !== session.user.id &&
      session.user.role !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to view this quote' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    console.error('Error getting quote:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get quote' },
      { status: 500 }
    );
  }
}

// PUT /api/quotes/[quoteId] - Update a quote
async function updateQuote(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { quoteId } = params;
    
    // Get the quote
    const quote = await orderService.getQuoteById(quoteId);
    
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    
    // Check if user is the vendor or an admin
    const vendor = await vendorService.getVendorById(quote.vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    if (vendor.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to update this quote' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { amount, details, expiresAt } = body;
    
    // Validate required fields
    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }
    
    // Update the quote
    const updatedQuote = await orderService.updateQuote(
      quoteId,
      amount,
      details || quote.details,
      expiresAt || quote.expiresAt
    );

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
    });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update quote' },
      { status: 500 }
    );
  }
}

// DELETE /api/quotes/[quoteId] - Delete a quote
async function deleteQuote(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { quoteId } = params;
    
    // Get the quote
    const quote = await orderService.getQuoteById(quoteId);
    
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    
    // Check if user is the vendor or an admin
    const vendor = await vendorService.getVendorById(quote.vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    if (vendor.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to delete this quote' },
        { status: 403 }
      );
    }
    
    // Delete the quote
    await orderService.deleteQuote(quoteId);

    return NextResponse.json({
      success: true,
      message: 'Quote deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete quote' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getQuote, { limit: 100, windowMs: 60000 });
export const PUT = withRateLimit(updateQuote, { limit: 50, windowMs: 60000 });
export const DELETE = withRateLimit(deleteQuote, { limit: 20, windowMs: 60000 }); 