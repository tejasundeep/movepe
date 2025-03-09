export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { storage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

// Default settings
const defaultSettings = {
  general: {
    siteName: 'Move Management System',
    contactEmail: 'support@movepe.com',
    supportPhone: '+91 9999999999',
    defaultCurrency: 'INR'
  },
  notification: {
    enableEmailNotifications: true,
    enableSmsNotifications: true,
    enableWhatsAppNotifications: true,
    adminNotificationEmail: 'admin@movepe.com'
  },
  payment: {
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    enableTestMode: true,
    defaultCommissionRate: 10
  },
  api: {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    sendgridApiKey: process.env.SENDGRID_API_KEY || ''
  }
};

// GET settings
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

    // Try to get settings from storage
    let settings;
    try {
      settings = await storage.readData('settings.json');
    } catch (error) {
      console.warn('Settings file not found, using defaults');
      settings = null;
    }

    // If settings don't exist, use defaults
    if (!settings) {
      settings = defaultSettings;
      
      // Save default settings to storage
      await storage.writeData('settings.json', settings);
    }

    // Mask sensitive information
    const maskedSettings = {
      ...settings,
      payment: {
        ...settings.payment,
        razorpayKeySecret: settings.payment.razorpayKeySecret ? '••••••••••••••••' : ''
      },
      api: {
        ...settings.api,
        googleMapsApiKey: settings.api.googleMapsApiKey ? '••••••••••••••••' : '',
        twilioAccountSid: settings.api.twilioAccountSid ? '••••••••••••••••' : '',
        twilioAuthToken: settings.api.twilioAuthToken ? '••••••••••••••••' : '',
        sendgridApiKey: settings.api.sendgridApiKey ? '••••••••••••••••' : ''
      }
    };

    return NextResponse.json(maskedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT update settings
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
    const { section, settings: sectionSettings } = await request.json();
    
    if (!section || !sectionSettings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate section
    if (!['general', 'notification', 'payment', 'api'].includes(section)) {
      return NextResponse.json({ error: 'Invalid settings section' }, { status: 400 });
    }

    // Get current settings
    let currentSettings;
    try {
      currentSettings = await storage.readData('settings.json');
    } catch (error) {
      console.warn('Settings file not found, using defaults');
      currentSettings = defaultSettings;
    }

    // If settings don't exist, use defaults
    if (!currentSettings) {
      currentSettings = defaultSettings;
    }

    // Update settings for the specified section
    const updatedSettings = {
      ...currentSettings,
      [section]: sectionSettings
    };

    // Save updated settings
    await storage.writeData('settings.json', updatedSettings);

    // If updating API keys or payment settings, update environment variables
    if (section === 'api') {
      // In a real app, you might update environment variables or a .env file here
      // For this example, we'll just log it
      console.log('API settings updated');
    }

    if (section === 'payment') {
      // In a real app, you might update environment variables or a .env file here
      // For this example, we'll just log it
      console.log('Payment settings updated');
    }

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
} 