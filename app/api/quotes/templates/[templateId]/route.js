export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { vendorService } from '../../../../../lib/services/vendorService';
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware';

// GET /api/quotes/templates/[templateId] - Get a specific quote template
async function getQuoteTemplate(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { templateId } = params;
    
    // Get the quote template
    const template = await vendorService.getQuoteTemplateById(templateId);
    
    if (!template) {
      return NextResponse.json({ error: 'Quote template not found' }, { status: 404 });
    }
    
    // Check if user is the vendor or an admin
    const vendor = await vendorService.getVendorById(template.vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    if (vendor.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to view this template' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error getting quote template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get quote template' },
      { status: 500 }
    );
  }
}

// PUT /api/quotes/templates/[templateId] - Update a quote template
async function updateQuoteTemplate(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { templateId } = params;
    
    // Get the quote template
    const template = await vendorService.getQuoteTemplateById(templateId);
    
    if (!template) {
      return NextResponse.json({ error: 'Quote template not found' }, { status: 404 });
    }
    
    // Check if user is the vendor or an admin
    const vendor = await vendorService.getVendorById(template.vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    if (vendor.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to update this template' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { name, description, baseAmount, details } = body;
    
    // Validate required fields
    if (!name || !baseAmount) {
      return NextResponse.json(
        { error: 'Name and base amount are required' },
        { status: 400 }
      );
    }
    
    // Update the quote template
    const updatedTemplate = await vendorService.updateQuoteTemplate(
      templateId,
      name,
      description || template.description,
      baseAmount,
      details || template.details
    );

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
    });
  } catch (error) {
    console.error('Error updating quote template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update quote template' },
      { status: 500 }
    );
  }
}

// DELETE /api/quotes/templates/[templateId] - Delete a quote template
async function deleteQuoteTemplate(request, { params }) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { templateId } = params;
    
    // Get the quote template
    const template = await vendorService.getQuoteTemplateById(templateId);
    
    if (!template) {
      return NextResponse.json({ error: 'Quote template not found' }, { status: 404 });
    }
    
    // Check if user is the vendor or an admin
    const vendor = await vendorService.getVendorById(template.vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    if (vendor.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to delete this template' },
        { status: 403 }
      );
    }
    
    // Delete the quote template
    await vendorService.deleteQuoteTemplate(templateId);

    return NextResponse.json({
      success: true,
      message: 'Quote template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting quote template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete quote template' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getQuoteTemplate, { limit: 100, windowMs: 60000 });
export const PUT = withRateLimit(updateQuoteTemplate, { limit: 50, windowMs: 60000 });
export const DELETE = withRateLimit(deleteQuoteTemplate, { limit: 20, windowMs: 60000 }); 