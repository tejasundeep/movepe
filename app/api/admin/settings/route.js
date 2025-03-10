export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { settingsStorage as settingStorage } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { auditService } from '../../../../lib/services/auditService';

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
    let settings = {
      general: { ...defaultSettings.general },
      notification: { ...defaultSettings.notification },
      payment: { ...defaultSettings.payment },
      api: { ...defaultSettings.api }
    };

    try {
      // Get all settings
      const allSettings = await settingStorage.getAll();
      
      // Populate settings object with any existing settings
      for (const setting of allSettings) {
        try {
          const [category, key] = setting.key.split('.');
          if (settings[category] && key) {
            let value = setting.value;
            try {
              value = JSON.parse(setting.value);
            } catch (e) {
              // If parsing fails, use the value as is
            }
            settings[category][key] = value;
          }
        } catch (e) {
          console.warn('Error processing setting:', setting, e);
        }
      }
    } catch (error) {
      console.warn('Error fetching settings, using defaults:', error);
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
    
    // Log the action
    try {
      await auditService.logAction(
        session.user.email,
        'view_settings',
        'setting',
        'all',
        {}
      );
    } catch (error) {
      console.warn('Error logging audit:', error);
    }

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
    const updatedSettings = await request.json();
    
    // Validate settings
    if (!updatedSettings) {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 });
    }
    
    // Start with default settings
    let currentSettings = {
      general: { ...defaultSettings.general },
      notification: { ...defaultSettings.notification },
      payment: { ...defaultSettings.payment },
      api: { ...defaultSettings.api }
    };

    try {
      // Get all settings
      const allSettings = await settingStorage.getAll();
      
      // Populate settings object with any existing settings
      for (const setting of allSettings) {
        try {
          const [category, key] = setting.key.split('.');
          if (currentSettings[category] && key) {
            let value = setting.value;
            try {
              value = JSON.parse(setting.value);
            } catch (e) {
              // If parsing fails, use the value as is
            }
            currentSettings[category][key] = value;
          }
        } catch (e) {
          console.warn('Error processing setting:', setting, e);
        }
      }
    } catch (error) {
      console.warn('Error fetching current settings, using defaults:', error);
    }
    
    // Merge with current settings
    const mergedSettings = {
      ...currentSettings,
      ...updatedSettings
    };
    
    // Preserve sensitive information if not provided
    if (updatedSettings.payment && !updatedSettings.payment.razorpayKeySecret && currentSettings.payment.razorpayKeySecret) {
      mergedSettings.payment.razorpayKeySecret = currentSettings.payment.razorpayKeySecret;
    }
    
    if (updatedSettings.api) {
      if (!updatedSettings.api.googleMapsApiKey && currentSettings.api.googleMapsApiKey) {
        mergedSettings.api.googleMapsApiKey = currentSettings.api.googleMapsApiKey;
      }
      if (!updatedSettings.api.twilioAccountSid && currentSettings.api.twilioAccountSid) {
        mergedSettings.api.twilioAccountSid = currentSettings.api.twilioAccountSid;
      }
      if (!updatedSettings.api.twilioAuthToken && currentSettings.api.twilioAuthToken) {
        mergedSettings.api.twilioAuthToken = currentSettings.api.twilioAuthToken;
      }
      if (!updatedSettings.api.sendgridApiKey && currentSettings.api.sendgridApiKey) {
        mergedSettings.api.sendgridApiKey = currentSettings.api.sendgridApiKey;
      }
    }
    
    // Save settings to storage
    const savedSettings = { ...mergedSettings };
    let hasError = false;

    for (const category in mergedSettings) {
      for (const key in mergedSettings[category]) {
        try {
          const result = await settingStorage.set(`${category}.${key}`, mergedSettings[category][key]);
          if (!result) {
            console.warn(`Failed to save setting: ${category}.${key}`);
            hasError = true;
          }
        } catch (error) {
          console.error(`Error saving setting ${category}.${key}:`, error);
          hasError = true;
        }
      }
    }
    
    // Log the action
    try {
      await auditService.logAction(
        session.user.email,
        'update_settings',
        'setting',
        'all',
        { categories: Object.keys(updatedSettings) }
      );
    } catch (error) {
      console.warn('Error logging audit:', error);
    }
    
    // Mask sensitive information in response
    const maskedSettings = {
      ...savedSettings,
      payment: {
        ...savedSettings.payment,
        razorpayKeySecret: savedSettings.payment.razorpayKeySecret ? '••••••••••••••••' : ''
      },
      api: {
        ...savedSettings.api,
        googleMapsApiKey: savedSettings.api.googleMapsApiKey ? '••••••••••••••••' : '',
        twilioAccountSid: savedSettings.api.twilioAccountSid ? '••••••••••••••••' : '',
        twilioAuthToken: savedSettings.api.twilioAuthToken ? '••••••••••••••••' : '',
        sendgridApiKey: savedSettings.api.sendgridApiKey ? '••••••••••••••••' : ''
      }
    };

    if (hasError) {
      return NextResponse.json({ 
        warning: 'Some settings may not have been saved properly',
        settings: maskedSettings 
      });
    }

    return NextResponse.json(maskedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
} 