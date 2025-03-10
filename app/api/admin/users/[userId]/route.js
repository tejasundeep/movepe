export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { userStorage } from '../../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import bcrypt from 'bcryptjs';

// GET a specific user
export async function GET(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { userId } = params;
    
    // Get user from Prisma storage
    const user = await userStorage.getById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT update a user
export async function PUT(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { userId } = params;
    const userData = await request.json();
    
    // Get user from Prisma storage
    const user = await userStorage.getById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if email is being changed and if it already exists
    if (userData.email && userData.email !== user.email) {
      const existingUser = await userStorage.getByEmail(userData.email);
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }
    
    // Prepare update data
    const updateData = {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      phone: userData.phone,
    };
    
    // Update password if provided
    if (userData.password) {
      updateData.password = await bcrypt.hash(userData.password, 10);
    }
    
    // Update user in Prisma storage
    const updatedUser = await userStorage.update(userId, updateData);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE a user
export async function DELETE(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { userId } = params;
    
    // Get user from Prisma storage
    const user = await userStorage.getById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Prevent deleting admin users
    if (user.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
    }
    
    // Delete user from Prisma storage
    await userStorage.delete(userId);
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 