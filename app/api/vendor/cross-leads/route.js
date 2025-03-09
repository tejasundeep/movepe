export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { vendorService } from '../../../../lib/services/vendorService'
import { notificationService } from '../../../../lib/services/notificationService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

async function createCrossLead(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse the request body
    let requestBody
    try {
      requestBody = await request.json()
    } catch (error) {
      console.error('Error parsing request body:', error)
      return NextResponse.json(
        { error: 'Invalid request body. Please provide valid JSON.' },
        { status: 400 }
      )
    }
    
    // Create cross-lead using the vendor service
    const newOrder = await vendorService.createCrossLead(requestBody, session.user.email)

    // Send notification to the target vendor
    await notificationService.sendNotification({
      type: 'cross_lead_created',
      recipientId: requestBody.targetVendorId,
      data: {
        leadId: newOrder.id,
        sourceVendorId: newOrder.sourceVendorId,
        sourceVendorName: newOrder.sourceVendorName,
        customerDetails: newOrder.customerDetails
      }
    })

    return NextResponse.json({
      success: true,
      leadId: newOrder.id
    })
  } catch (error) {
    console.error('Error creating cross-lead:', error)
    
    let status = 500
    let errorMessage = 'Failed to create cross-lead'
    
    if (error.message === 'Vendor not found') {
      status = 404
      errorMessage = error.message
    } else if (error.message === 'Target vendor not found') {
      status = 404
      errorMessage = error.message
    } else if (error.message === 'Missing required fields') {
      status = 400
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

async function getCrossLeads(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get cross-leads using the vendor service
    const crossLeads = await vendorService.getVendorCrossLeads(session.user.email)

    return NextResponse.json(crossLeads)
  } catch (error) {
    console.error('Error fetching cross-leads:', error)
    
    let status = 500
    let errorMessage = 'Failed to fetch cross-leads'
    
    if (error.message === 'Vendor not found') {
      status = 404
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handlers
export const POST = withRateLimit(createCrossLead, 'vendor');
export const GET = withRateLimit(getCrossLeads, 'vendor'); 