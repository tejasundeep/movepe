import { NextResponse } from 'next/server';
import { storage } from '../../../../../lib/storage';
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
    
    // Get users from storage
    const users = await storage.readData('users.json') || [];
    
    // Find user by ID
    const user = users.find(user => user.id === userId);
    
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
    
    // Get users from storage
    const users = await storage.readData('users.json') || [];
    
    // Find user index
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if email is being changed and if it already exists
    if (userData.email && userData.email !== users[userIndex].email) {
      const emailExists = users.some(user => user.email === userData.email && user.id !== userId);
      if (emailExists) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }
    
    // Update user
    const updatedUser = {
      ...users[userIndex],
      name: userData.name || users[userIndex].name,
      email: userData.email || users[userIndex].email,
      role: userData.role || users[userIndex].role,
      phone: userData.phone || users[userIndex].phone,
      whatsapp: userData.whatsapp || users[userIndex].whatsapp,
      updatedAt: new Date().toISOString()
    };
    
    // Update password if provided
    if (userData.password) {
      updatedUser.password = await bcrypt.hash(userData.password, 10);
    }
    
    // Update user in storage
    users[userIndex] = updatedUser;
    await storage.writeData('users.json', users);
    
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
    
    // Get users from storage
    const users = await storage.readData('users.json') || [];
    
    // Find user index
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Prevent deleting admin users
    if (users[userIndex].role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
    }
    
    // Remove user from storage
    users.splice(userIndex, 1);
    await storage.writeData('users.json', users);
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 