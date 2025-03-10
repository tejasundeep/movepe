export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { vendorService } from '../../../../lib/services/vendorService';
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware';

// GET /api/quotes/templates - Get quote templates for a vendor
async function getQuoteTemplates(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    
    // Validate parameters
    if (!vendorId) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
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
        { error: 'You do not have permission to view these templates' },
        { status: 403 }
      );
    }
    
    // Get quote templates for the vendor
    const templates = await vendorService.getQuoteTemplates(vendorId);

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error getting quote templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get quote templates' },
      { status: 500 }
    );
  }
}

// POST /api/quotes/templates - Create a new quote template
async function createQuoteTemplate(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { vendorId, name, description, baseAmount, details } = body;
    
    // Validate required fields
    if (!vendorId || !name || !baseAmount) {
      return NextResponse.json(
        { error: 'Vendor ID, name, and base amount are required' },
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
        { error: 'You do not have permission to create a template for this vendor' },
        { status: 403 }
      );
    }
    
    // Create the quote template
    const template = await vendorService.createQuoteTemplate(
      vendorId,
      name,
      description || '',
      baseAmount,
      details || {}
    );

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error creating quote template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create quote template' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getQuoteTemplates, { limit: 100, windowMs: 60000 });
export const POST = withRateLimit(createQuoteTemplate, { limit: 50, windowMs: 60000 }); 