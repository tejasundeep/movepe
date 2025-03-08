import { NextResponse } from 'next/server';
import { storage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

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
    const vendors = await storage.readData('vendors.json') || [];
    
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

    // Get vendors and users from storage
    const vendors = await storage.readData('vendors.json') || [];
    const users = await storage.readData('users.json') || [];
    
    // Check if vendor with email already exists
    if (vendors.some(vendor => vendor.email === vendorData.email)) {
      return NextResponse.json({ error: 'Vendor with this email already exists' }, { status: 400 });
    }

    // Check if user with email already exists
    if (users.some(user => user.email === vendorData.email)) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Generate vendor ID
    const vendorId = uuidv4();
    
    // Create new vendor
    const newVendor = {
      vendorId,
      name: vendorData.name,
      email: vendorData.email,
      phone: vendorData.phone || null,
      whatsapp: vendorData.whatsapp || vendorData.phone || null,
      serviceAreas: vendorData.serviceAreas || [],
      pricingTier: vendorData.pricingTier || 'default',
      description: vendorData.description || '',
      rating: 0,
      reviewCount: 0,
      reviews: [],
      availability: 'available',
      createdAt: new Date().toISOString()
    };

    // Add vendor to storage
    vendors.push(newVendor);
    await storage.writeData('vendors.json', vendors);
    
    // Create user account for vendor
    const hashedPassword = await bcrypt.hash(vendorData.password, 10);
    const newUser = {
      id: uuidv4(),
      name: vendorData.name,
      email: vendorData.email,
      password: hashedPassword,
      role: 'vendor',
      vendorId, // Link to vendor account
      phone: vendorData.phone || null,
      whatsapp: vendorData.whatsapp || vendorData.phone || null,
      createdAt: new Date().toISOString()
    };
    
    // Add user to storage
    users.push(newUser);
    await storage.writeData('users.json', users);
    
    return NextResponse.json(newVendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
} 