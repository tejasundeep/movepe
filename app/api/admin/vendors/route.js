export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { vendorStorage, userStorage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';
import { auditService } from '../../../../lib/services/auditService';

// GET all vendors
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

    // Get vendors from storage
    const vendors = await vendorStorage.getAll();
    
    // Log the action
    await auditService.logAction(
      session.user.email,
      'view_vendors_list',
      'vendor',
      'all',
      { count: vendors.length }
    );
    
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

// POST create a new vendor
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
    const vendorData = await request.json();
    
    // Validate required fields
    if (!vendorData.name || !vendorData.email || !vendorData.password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if vendor with email already exists
    const existingVendor = await vendorStorage.getByEmail(vendorData.email);
    if (existingVendor) {
      return NextResponse.json({ error: 'Vendor with this email already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(vendorData.password, 10);
    
    // Create user account first
    const newUser = await userStorage.create({
      name: vendorData.name,
      email: vendorData.email,
      password: hashedPassword,
      role: 'vendor',
      phone: vendorData.phone || null,
      whatsapp: vendorData.whatsapp || null
    });
    
    // Create vendor profile
    const newVendor = await vendorStorage.create({
      userId: newUser.id,
      name: vendorData.name,
      email: vendorData.email,
      phone: vendorData.phone || null,
      whatsapp: vendorData.whatsapp || null,
      address: vendorData.address || null,
      city: vendorData.city || null,
      state: vendorData.state || null,
      pincode: vendorData.pincode || null,
      description: vendorData.description || null,
      services: vendorData.services || [],
      serviceAreas: vendorData.serviceAreas || [],
      status: vendorData.status || 'Pending'
    });
    
    // Log the action
    await auditService.logAction(
      session.user.email,
      'create_vendor',
      'vendor',
      newVendor.id,
      { 
        name: newVendor.name,
        email: newVendor.email,
        status: newVendor.status
      }
    );
    
    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
} 