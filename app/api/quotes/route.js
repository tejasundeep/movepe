export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { orderService } from '../../../lib/services/orderService';
import { vendorService } from '../../../lib/services/vendorService';
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware';

// GET /api/quotes - Get quotes for a vendor or for an order
async function getQuotes(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const vendorId = searchParams.get('vendorId');
    
    // Validate parameters
    if (!orderId && !vendorId) {
      return NextResponse.json(
        { error: 'Either orderId or vendorId is required' },
        { status: 400 }
      );
    }

    let quotes = [];
    
    // Get quotes for an order
    if (orderId) {
      quotes = await orderService.getQuotesForOrder(orderId, session.user.email);
    }
    
    // Get quotes for a vendor
    if (vendorId) {
      // Check if user is the vendor or an admin
      const vendor = await vendorService.getVendorById(vendorId);
      
      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }
      
      if (vendor.userId !== session.user.id && session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'You do not have permission to view these quotes' },
          { status: 403 }
        );
      }
      
      quotes = await vendorService.getQuotesForVendor(vendorId);
    }

    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error) {
    console.error('Error getting quotes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get quotes' },
      { status: 500 }
    );
  }
}

// POST /api/quotes - Create a new quote
async function createQuote(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { orderId, vendorId, amount, details, expiresAt } = body;
    
    // Validate required fields
    if (!orderId || !vendorId || !amount) {
      return NextResponse.json(
        { error: 'Order ID, vendor ID, and amount are required' },
        { status: 400 }
      );
    }
    
    // Check if user is the vendor or an admin
    const vendor = await vendorService.getVendorById(vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    if (vendor.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to create a quote for this vendor' },
        { status: 403 }
      );
    }
    
    // Create the quote
    const quote = await orderService.createQuote(
      orderId,
      vendorId,
      amount,
      details || {},
      expiresAt
    );

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create quote' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getQuotes, { limit: 100, windowMs: 60000 });
export const POST = withRateLimit(createQuote, { limit: 50, windowMs: 60000 }); 