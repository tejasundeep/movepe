import { NextResponse } from 'next/server';
import { userService } from '../../../../lib/services/userService';

export async function GET(request) {
  try {
    // Get email from query params
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Get user by email
    const user = await userService.getUserByEmail(email);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: `User with email ${email} not found` 
      });
    }
    
    // Check if user has rider role
    if (user.role !== 'rider') {
      return NextResponse.json({ 
        success: false, 
        error: `User with email ${email} does not have rider role (current role: ${user.role})`,
        name: user.name,
        email: user.email,
        role: user.role
      });
    }
    
    return NextResponse.json({
      success: true,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('Error checking rider user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check rider user' },
      { status: 500 }
    );
  }
} 