import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { vendorService } from '../../../lib/services/vendorService'
import { v4 as uuidv4 } from 'uuid'
import { withRateLimit } from '../../../lib/middleware/rateLimitMiddleware'
import { authOptions } from '../../../lib/auth'

async function getVendors(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all vendors from the vendor service
    const vendors = await vendorService.getAllVendors()
    
    // Filter out sensitive information
    const filteredVendors = vendors.map(vendor => ({
      vendorId: vendor.vendorId,
      name: vendor.name,
      description: vendor.description,
      serviceAreas: vendor.serviceAreas || [],
      availability: vendor.availability || 'available',
      rating: vendor.rating || 0,
      reviewCount: vendor.reviewCount || 0,
      reviews: vendor.reviews || []
    }))

    return NextResponse.json(filteredVendors)
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

async function createVendor(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can create vendors directly
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can create vendors' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      email,
      phone,
      whatsapp,
      serviceAreas,
      basePrice,
      description
    } = body

    // Validate required fields
    if (!name || !email || !phone || !serviceAreas || !basePrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create vendor data
    const vendorData = {
      vendorId: uuidv4(),
      name,
      email,
      phone,
      whatsapp: whatsapp || phone,
      serviceAreas: Array.isArray(serviceAreas) ? serviceAreas : [serviceAreas],
      basePrice: parseFloat(basePrice),
      description: description || '',
      createdAt: new Date().toISOString(),
      createdBy: session.user.email
    }

    // Create vendor using the vendor service
    const vendor = await vendorService.createVendor(vendorData)

    return NextResponse.json({
      success: true,
      vendor: {
        vendorId: vendor.vendorId,
        name: vendor.name,
        email: vendor.email,
        serviceAreas: vendor.serviceAreas
      }
    })
  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create vendor' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getVendors, 'vendor');
export const POST = withRateLimit(createVendor, 'vendor'); 