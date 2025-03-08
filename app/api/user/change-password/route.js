import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { userService } from '../../../../lib/services/userService'
import { withRateLimit } from '../../../../lib/middleware/rateLimitMiddleware'

async function changePassword(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse the request body
    const { currentPassword, newPassword } = await request.json()
    
    // Validate required fields
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }
    
    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }
    
    // Validate new password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        { error: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' },
        { status: 400 }
      )
    }
    
    try {
      // Change password using the user service
      await userService.changePassword(session.user.email, currentPassword, newPassword)
      
      return NextResponse.json({
        success: true,
        message: 'Password changed successfully'
      })
    } catch (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to change password' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to the handler
export const POST = withRateLimit(changePassword, 'user'); 