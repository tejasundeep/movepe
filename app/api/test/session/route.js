import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

export async function GET(request) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    
    // Return the session data
    return NextResponse.json({
      authenticated: !!session,
      session: session ? {
        user: {
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          id: session.user.id,
          phone: session.user.phone,
          whatsapp: session.user.whatsapp
        },
        expires: session.expires
      } : null
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get session' },
      { status: 500 }
    );
  }
} 