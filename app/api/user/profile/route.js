import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { userService } from '../../../../lib/services/userService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

async function getUserProfile(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile using the user service
    const user = await userService.getUserByEmail(session.user.email)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Return user profile without sensitive information
    const { password, ...userProfile } = user
    return NextResponse.json(userProfile)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}

async function updateUserProfile(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse the request body
    const updates = await request.json()
    
    // Update user profile using the user service
    const updatedUser = await userService.updateUserProfile(session.user.email, updates)
    
    // Return updated user profile without sensitive information
    const { password, ...userProfile } = updatedUser
    return NextResponse.json({
      success: true,
      user: userProfile
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    
    let status = 500
    let errorMessage = 'Failed to update user profile'
    
    if (error.message === 'User not found') {
      status = 404
      errorMessage = error.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

// Apply rate limiting to the handlers
export const GET = withRateLimit(getUserProfile, 'user');
export const PUT = withRateLimit(updateUserProfile, 'user'); 