export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { storage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { auditService } from '../../../../lib/services/auditService';

// GET all users
export async function GET(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get users from storage
    const users = await storage.readData('users.json') || [];
    
    // Log the action
    await auditService.logAction(
      session.user.email,
      'view_users_list',
      'user',
      'all',
      { count: users.length }
    );
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST create a new user
export async function POST(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get request body
    const userData = await request.json();
    
    // Validate required fields
    if (!userData.name || !userData.email || !userData.password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get users from storage
    const users = await storage.readData('users.json') || [];
    
    // Check if user with email already exists
    if (users.some(user => user.email === userData.email)) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create new user
    const newUser = {
      id: uuidv4(),
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'user',
      phone: userData.phone || null,
      whatsapp: userData.whatsapp || null,
      createdAt: new Date().toISOString()
    };

    // Add user to storage
    users.push(newUser);
    await storage.writeData('users.json', users);
    
    // Log the action
    await auditService.logAction(
      session.user.email,
      'create_user',
      'user',
      newUser.id,
      { 
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    );
    
    // Remove password from response
    const { password, ...userWithoutPassword } = newUser;
    
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
} 