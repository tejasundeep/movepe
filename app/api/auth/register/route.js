import { NextResponse } from 'next/server'
import { userService } from '../../../../lib/services/userService'
import { vendorService } from '../../../../lib/services/vendorService'
import { v4 as uuidv4 } from 'uuid'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

async function registerUser(request) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      password,
      role,
      phone,
      whatsapp,
      // Vendor specific fields
      companyName,
      serviceAreas,
      basePrice,
      description
    } = body

    // Basic validation
    if (!name || !email || !password || !role || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Create user data
    const userData = {
      id: uuidv4(),
      name,
      email,
      password,
      role,
      phone,
      whatsapp: whatsapp || phone
    }

    // Check if user is registering as a vendor
    if (role === 'vendor') {
      // Additional validation for vendor fields
      if (!companyName || !serviceAreas || !basePrice) {
        return NextResponse.json(
          { error: 'Missing required vendor fields' },
          { status: 400 }
        )
      }

      // Create vendor data
      const vendorData = {
        vendorId: userData.id,
        name: companyName || name,
        email,
        serviceAreas: Array.isArray(serviceAreas) ? serviceAreas : [serviceAreas],
        basePrice: parseFloat(basePrice),
        description: description || '',
        phone,
        whatsapp: whatsapp || phone
      }

      try {
        // Create user
        await userService.createUser(userData)
        
        // Create vendor
        const vendor = await vendorService.createVendor(vendorData)
        
        return NextResponse.json({
          success: true,
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role
          },
          vendor: {
            vendorId: vendor.vendorId,
            name: vendor.name,
            serviceAreas: vendor.serviceAreas
          }
        })
      } catch (error) {
        return NextResponse.json(
          { error: error.message || 'Failed to register vendor' },
          { status: 400 }
        )
      }
    } else {
      // Regular user registration
      try {
        const user = await userService.createUser(userData)
        
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        })
      } catch (error) {
        return NextResponse.json(
          { error: error.message || 'Failed to register user' },
          { status: 400 }
        )
      }
    }
  } catch (error) {
    console.error('Error registering user:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(registerUser, 'auth'); 