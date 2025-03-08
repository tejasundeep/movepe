import { NextResponse } from 'next/server'
import { userService } from '../../../../../lib/services/userService'
import { riderService } from '../../../../../lib/services/riderService'
import { notificationService } from '../../../../../lib/services/notificationService'
import { v4 as uuidv4 } from 'uuid'
import { withRateLimit } from '../../../../../lib/middleware/rateLimitMiddleware'

async function registerRider(request) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      password,
      phone,
      whatsapp,
      vehicleType,
      vehicleModel,
      vehicleYear,
      licensePlate,
      drivingLicense,
      serviceAreas
    } = body

    // Basic validation
    if (!name || !email || !password || !phone || !vehicleType || !vehicleModel || !licensePlate || !drivingLicense) {
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

    // Create user data with explicit rider role
    const userId = uuidv4()
    const userData = {
      id: userId,
      name,
      email,
      password,
      role: 'rider', // Explicitly set role to rider
      phone,
      whatsapp: whatsapp || phone,
      createdAt: new Date().toISOString()
    }

    // Create rider data
    const riderData = {
      riderId: userId,
      name,
      email,
      phone,
      whatsapp: whatsapp || phone,
      vehicleDetails: {
        type: vehicleType,
        model: vehicleModel,
        year: vehicleYear || new Date().getFullYear().toString(),
        licensePlate,
        drivingLicense
      },
      serviceAreas: serviceAreas ? (Array.isArray(serviceAreas) ? serviceAreas : serviceAreas.split(',').map(area => area.trim())) : [],
      status: 'pending', // Explicitly set status to pending for approval
      createdAt: new Date().toISOString()
    }

    try {
      // Create user with rider role
      const user = await userService.createUser(userData)
      
      // Create rider
      const rider = await riderService.createRider(riderData)
      
      // Send notification to admin about new rider registration
      try {
        await notificationService.sendUserNotification(
          'admin@movepe.com', // Admin email
          'New Rider Registration',
          `${name} has registered as a rider and is awaiting approval.`,
          'info', // Use 'info' type instead of 'ADMIN_ALERT'
          {
            riderId: rider.riderId,
            name: rider.name,
            email: rider.email,
            type: 'rider_registration'
          }
        );
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Continue execution even if notification fails
      }
      
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'rider' // Ensure role is returned as rider
        },
        rider: {
          riderId: rider.riderId,
          name: rider.name,
          status: rider.status
        }
      })
    } catch (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to register rider' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error registering rider:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(registerRider, 'auth'); 