import { NextResponse } from 'next/server';
import { storage } from '../../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import fs from 'fs/promises';
import path from 'path';

// Ensure data directory exists
const ensureDataDirectory = async () => {
  const dataPath = process.env.DATA_PATH || path.join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataPath, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
};

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

    // Ensure data directory exists
    await ensureDataDirectory();

    // Get request body
    const { format, dateRange, statusFilter } = await request.json();
    
    if (!format || !dateRange) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get orders from storage
    let orders;
    try {
      orders = await storage.readData('orders.json');
    } catch (error) {
      console.warn('Orders file not found, using empty array');
      orders = [];
    }
    
    // If orders don't exist, use empty array
    if (!orders) {
      orders = [];
    }
    
    // Filter orders based on date range and status
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      
      const dateInRange = orderDate >= startDate && orderDate <= endDate;
      const statusMatches = statusFilter === 'all' || order.status === statusFilter;
      
      return dateInRange && statusMatches;
    });

    // Prepare data for export
    const exportData = filteredOrders.map(order => {
      // Create a simplified version of the order for export
      return {
        orderId: order.orderId,
        userEmail: order.userEmail,
        status: order.status,
        pickupPincode: order.pickupPincode,
        destinationPincode: order.destinationPincode,
        moveSize: order.moveSize,
        moveDate: order.moveDate,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt || order.createdAt,
        selectedVendorId: order.selectedVendorId || '',
        selectedVendorName: order.selectedVendorName || '',
        quoteCount: order.quotes ? order.quotes.length : 0,
        acceptedQuoteAmount: order.quotes && order.selectedVendorId 
          ? order.quotes.find(q => q.vendorId === order.selectedVendorId)?.amount || 0 
          : 0,
        paymentStatus: order.status === 'Paid' ? 'Paid' : 'Pending',
        paymentAmount: order.paymentAmount || 0,
        paymentDate: order.paidAt || ''
      };
    });

    // Generate export based on format
    if (format === 'json') {
      // For JSON, just return the data
      return NextResponse.json(exportData);
    } else if (format === 'csv') {
      // For CSV, generate CSV content
      if (exportData.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 400 });
      }

      // Get headers from first object
      const headers = Object.keys(exportData[0]);
      
      // Create CSV content
      let csvContent = headers.join(',') + '\n';
      
      // Add data rows
      exportData.forEach(item => {
        const row = headers.map(header => {
          const value = item[header];
          // Handle values that might contain commas or quotes
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          } else {
            return value;
          }
        }).join(',');
        
        csvContent += row + '\n';
      });
      
      // Return CSV content
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === 'excel') {
      // For Excel, we'll return a CSV that Excel can open
      // In a real app, you might use a library like exceljs to create a proper Excel file
      if (exportData.length === 0) {
        return NextResponse.json({ error: 'No data to export' }, { status: 400 });
      }

      // Get headers from first object
      const headers = Object.keys(exportData[0]);
      
      // Create CSV content
      let csvContent = headers.join(',') + '\n';
      
      // Add data rows
      exportData.forEach(item => {
        const row = headers.map(header => {
          const value = item[header];
          // Handle values that might contain commas or quotes
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          } else {
            return value;
          }
        }).join(',');
        
        csvContent += row + '\n';
      });
      
      // Return CSV content with Excel extension
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="orders-export-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    } else {
      return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error exporting orders:', error);
    return NextResponse.json({ error: 'Failed to export orders' }, { status: 500 });
  }
} 