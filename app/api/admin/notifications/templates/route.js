import { NextResponse } from 'next/server';
import { storage } from '../../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import fs from 'fs/promises';
import path from 'path';

// Default templates
const defaultTemplates = [
  {
    id: 'template_order_created_email',
    name: 'Order Created Email',
    type: 'email',
    subject: 'Your Move Order #{orderId} has been created',
    content: `Dear {userName},

Thank you for creating a move order with us. Your order has been successfully created and is being processed.

Order Details:
- Order ID: {orderId}
- From: {pickupLocation}
- To: {destinationLocation}
- Move Size: {moveSize}
- Preferred Date: {moveDate}

You will receive quotes from our verified vendors soon. You can track your order status by logging into your account.

Best regards,
The Move Management Team`,
    description: 'Email sent to users when they create a new move order',
    variables: ['userName', 'orderId', 'pickupLocation', 'destinationLocation', 'moveSize', 'moveDate'],
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 'template_quote_requested_vendor_email',
    name: 'Quote Requested Vendor Email',
    type: 'email',
    subject: 'New Quote Request for Order #{orderId}',
    content: `Dear {vendorName},

You have received a new quote request for a move order.

Order Details:
- Order ID: {orderId}
- From: {pickupLocation}
- To: {destinationLocation}
- Move Size: {moveSize}
- Preferred Date: {moveDate}

Please log in to your vendor dashboard to submit your quote.

Best regards,
The Move Management Team`,
    description: 'Email sent to vendors when a new quote is requested',
    variables: ['vendorName', 'orderId', 'pickupLocation', 'destinationLocation', 'moveSize', 'moveDate'],
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 'template_quote_accepted_vendor_whatsapp',
    name: 'Quote Accepted Vendor WhatsApp',
    type: 'whatsapp',
    content: `Hello {vendorName}, your quote for Order #{orderId} has been accepted by the customer. Please log in to your vendor dashboard for more details and to coordinate the move.`,
    description: 'WhatsApp message sent to vendors when their quote is accepted',
    variables: ['vendorName', 'orderId'],
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 'template_payment_received_user_sms',
    name: 'Payment Received User SMS',
    type: 'sms',
    content: `Thank you for your payment of Rs.{amount} for Order #{orderId}. Your move is now confirmed for {moveDate}.`,
    description: 'SMS sent to users when their payment is received',
    variables: ['amount', 'orderId', 'moveDate'],
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 'template_order_completed_user_email',
    name: 'Order Completed User Email',
    type: 'email',
    subject: 'Your Move Order #{orderId} has been completed',
    content: `Dear {userName},

Your move order #{orderId} has been successfully completed. Thank you for choosing our service.

We would appreciate if you could take a moment to rate your experience and provide feedback about the vendor.

Best regards,
The Move Management Team`,
    description: 'Email sent to users when their order is marked as completed',
    variables: ['userName', 'orderId'],
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z'
  }
];

// Ensure data directory exists
const ensureDataDirectory = async () => {
  const dataPath = process.env.DATA_PATH || path.join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataPath, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
};

// GET all notification templates
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

    // Ensure data directory exists
    await ensureDataDirectory();

    // Try to get templates from storage
    let templates;
    try {
      templates = await storage.readData('notification_templates.json');
    } catch (error) {
      console.warn('Templates file not found, using defaults');
      templates = null;
    }

    // If templates don't exist, use defaults
    if (!templates) {
      templates = defaultTemplates;
      
      // Save default templates to storage
      try {
        await storage.writeData('notification_templates.json', templates);
      } catch (error) {
        console.error('Error saving default templates:', error);
        // Continue with default templates even if saving fails
      }
    }

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    // Return default templates if there's an error
    return NextResponse.json(defaultTemplates);
  }
}

// POST create a new template
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
    const templateData = await request.json();
    
    // Validate required fields
    if (!templateData.name || !templateData.type || !templateData.content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get templates from storage
    let templates;
    try {
      templates = await storage.readData('notification_templates.json');
    } catch (error) {
      console.warn('Templates file not found, using defaults');
      templates = defaultTemplates;
    }

    // If templates don't exist, use defaults
    if (!templates) {
      templates = defaultTemplates;
    }

    // Check if template with same name already exists
    if (templates.some(t => t.name === templateData.name)) {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 400 });
    }

    // Create new template
    const newTemplate = {
      id: `template_${Date.now()}`,
      name: templateData.name,
      type: templateData.type,
      subject: templateData.subject || '',
      content: templateData.content,
      description: templateData.description || '',
      variables: templateData.variables || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add template to storage
    templates.push(newTemplate);
    try {
      await storage.writeData('notification_templates.json', templates);
    } catch (error) {
      console.error('Error saving template:', error);
      return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
    }
    
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('Error creating notification template:', error);
    return NextResponse.json({ error: 'Failed to create notification template' }, { status: 500 });
  }
} 