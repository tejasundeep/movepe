export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { vendorStorage, userStorage } from '../../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { auditService } from '../../../../../lib/services/auditService';

// GET pending vendors (not verified)
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

    // Get all vendors from storage
    const allVendors = await vendorStorage.getAll();
    
    // Filter for pending (not verified) vendors
    const pendingVendors = allVendors.filter(vendor => !vendor.isVerified);
    
    // Log the action
    await auditService.logAction(
      session.user.email,
      'view_pending_vendors',
      'vendor',
      'pending',
      { count: pendingVendors.length }
    );
    
    return NextResponse.json(pendingVendors);
  } catch (error) {
    console.error('Error fetching pending vendors:', error);
    return NextResponse.json({ error: 'Failed to fetch pending vendors' }, { status: 500 });
  }
}

// PUT approve a pending vendor
export async function PUT(request) {
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
    const { vendorId, action } = await request.json();
    
    if (!vendorId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get vendor from storage
    const vendor = await vendorStorage.getById(vendorId);
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    if (action === 'approve') {
      // Update vendor verification status
      const updatedVendor = await vendorStorage.update(vendorId, {
        isVerified: true
      });
      
      // Log the action
      await auditService.logAction(
        session.user.email,
        'approve_vendor',
        'vendor',
        vendorId,
        { vendorId, vendorName: vendor.businessName }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Vendor approved successfully',
        vendor: updatedVendor
      });
    } else if (action === 'reject') {
      // Could implement vendor rejection logic here
      // For now, just log the action
      await auditService.logAction(
        session.user.email,
        'reject_vendor',
        'vendor',
        vendorId,
        { vendorId, vendorName: vendor.businessName }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Vendor rejected',
        vendor
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing vendor approval:', error);
    return NextResponse.json({ error: 'Failed to process vendor approval' }, { status: 500 });
  }
} 