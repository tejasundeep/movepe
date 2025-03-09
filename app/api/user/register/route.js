export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { userService } from '../../../../lib/services/userService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

async function registerUser(request) {
  try {
    // Parse the request body
    const userData = await request.json()
    
    // Validate required fields
    if (!userData.name || !userData.email || !userData.password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }
    
    // Validate password length
    if (userData.password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userData.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    // Create user using the user service
    const newUser = await userService.createUser(userData)
    
    return NextResponse.json({
      success: true,
      user: newUser
    })
  } catch (error) {
    console.error('Error registering user:', error)
    
    let status = 500
    let errorMessage = 'Failed to register user'
    
    if (error.message === 'User already exists') {
      status = 400
      errorMessage = error.message
    } else if (error.message === 'Missing required fields') {
      status = 400
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(registerUser, 'auth') 