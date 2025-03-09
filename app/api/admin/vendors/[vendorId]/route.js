export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { storage } from '../../../../../lib/storage';
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
    
    // Get vendors from storage
    const vendors = await storage.readData('vendors.json') || [];
    
    // Find vendor by ID
    const vendor = vendors.find(vendor => vendor.vendorId === vendorId);
    
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
    
    // Get vendors and users from storage
    const vendors = await storage.readData('vendors.json') || [];
    const users = await storage.readData('users.json') || [];
    
    // Find vendor index
    const vendorIndex = vendors.findIndex(vendor => vendor.vendorId === vendorId);
    
    if (vendorIndex === -1) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    // Check if email is being changed and if it already exists
    if (vendorData.email && vendorData.email !== vendors[vendorIndex].email) {
      const emailExists = vendors.some(vendor => 
        vendor.email === vendorData.email && vendor.vendorId !== vendorId
      );
      
      if (emailExists) {
        return NextResponse.json({ error: 'Email already in use by another vendor' }, { status: 400 });
      }
      
      // Also check users table
      const userEmailExists = users.some(user => 
        user.email === vendorData.email && (!user.vendorId || user.vendorId !== vendorId)
      );
      
      if (userEmailExists) {
        return NextResponse.json({ error: 'Email already in use by another user' }, { status: 400 });
      }
    }
    
    // Update vendor
    const updatedVendor = {
      ...vendors[vendorIndex],
      name: vendorData.name || vendors[vendorIndex].name,
      email: vendorData.email || vendors[vendorIndex].email,
      phone: vendorData.phone || vendors[vendorIndex].phone,
      whatsapp: vendorData.whatsapp || vendors[vendorIndex].whatsapp,
      serviceAreas: vendorData.serviceAreas || vendors[vendorIndex].serviceAreas,
      pricingTier: vendorData.pricingTier || vendors[vendorIndex].pricingTier,
      description: vendorData.description || vendors[vendorIndex].description,
      updatedAt: new Date().toISOString()
    };
    
    // Update vendor in storage
    vendors[vendorIndex] = updatedVendor;
    await storage.writeData('vendors.json', vendors);
    
    // Update corresponding user if email or name changed
    if (vendorData.email || vendorData.name) {
      const userIndex = users.findIndex(user => user.vendorId === vendorId);
      
      if (userIndex !== -1) {
        users[userIndex] = {
          ...users[userIndex],
          name: vendorData.name || users[userIndex].name,
          email: vendorData.email || users[userIndex].email,
          phone: vendorData.phone || users[userIndex].phone,
          whatsapp: vendorData.whatsapp || users[userIndex].whatsapp,
          updatedAt: new Date().toISOString()
        };
        
        // Update password if provided
        if (vendorData.password) {
          users[userIndex].password = await bcrypt.hash(vendorData.password, 10);
        }
        
        await storage.writeData('users.json', users);
      }
    }
    
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
    
    // Get vendors and users from storage
    const vendors = await storage.readData('vendors.json') || [];
    const users = await storage.readData('users.json') || [];
    
    // Find vendor index
    const vendorIndex = vendors.findIndex(vendor => vendor.vendorId === vendorId);
    
    if (vendorIndex === -1) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    // Remove vendor from storage
    vendors.splice(vendorIndex, 1);
    await storage.writeData('vendors.json', vendors);
    
    // Remove corresponding user
    const userIndex = users.findIndex(user => user.vendorId === vendorId);
    
    if (userIndex !== -1) {
      users.splice(userIndex, 1);
      await storage.writeData('users.json', users);
    }
    
    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
} 