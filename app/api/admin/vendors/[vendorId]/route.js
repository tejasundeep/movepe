export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { vendorStorage, userStorage } from '../../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import bcrypt from 'bcryptjs';

// GET a specific vendor
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

    const { vendorId } = params;
    
    // Get vendor from Prisma storage
    const vendor = await vendorStorage.getById(vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}

// PUT update a vendor
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

    const { vendorId } = params;
    const vendorData = await request.json();
    
    // Get vendor from Prisma storage
    const vendor = await vendorStorage.getById(vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    // Check if email is being changed and if it already exists
    if (vendorData.email && vendorData.email !== vendor.email) {
      // Check if email exists in users table
      const userWithEmail = await userStorage.getByEmail(vendorData.email);
      
      if (userWithEmail) {
        return NextResponse.json({ error: 'Email already in use by another user' }, { status: 400 });
      }
    }
    
    // Update vendor user information if provided
    if (vendorData.name || vendorData.email || vendorData.phone) {
      await userStorage.update(vendor.userId, {
        name: vendorData.name,
        email: vendorData.email,
        phone: vendorData.phone
      });
    }
    
    // Update vendor specific information
    const updatedVendorData = {
      businessName: vendorData.businessName || vendor.businessName,
      description: vendorData.description || vendor.description,
      serviceAreas: vendorData.serviceAreas || vendor.serviceAreas,
      specialties: vendorData.specialties || vendor.specialties,
      basePrice: vendorData.basePrice !== undefined ? vendorData.basePrice : vendor.basePrice,
      isVerified: vendorData.isVerified !== undefined ? vendorData.isVerified : vendor.isVerified,
    };
    
    const updatedVendor = await vendorStorage.update(vendorId, updatedVendorData);
    
    return NextResponse.json(updatedVendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

// DELETE a vendor
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

    const { vendorId } = params;
    
    // Get vendor to check if it exists
    const vendor = await vendorStorage.getById(vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    // Delete the vendor from Prisma
    await vendorStorage.delete(vendorId);
    
    // Delete associated user if needed (optional)
    // await userStorage.delete(vendor.userId);
    
    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
} 