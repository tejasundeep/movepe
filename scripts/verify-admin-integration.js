/**
 * This script verifies the admin API endpoints and integration
 * Run with: node scripts/verify-admin-integration.js
 */

const fs = require('fs');
const path = require('path');

async function verifyAdminIntegration() {
  console.log('Verifying Admin API Integration...');
  
  try {
    // 1. Check if auth.js exists in the correct location
    const authPath = path.join(__dirname, '..', 'lib', 'auth.js');
    if (!fs.existsSync(authPath)) {
      console.error('❌ auth.js not found in lib directory');
      return;
    }
    console.log('✅ auth.js exists in the correct location');
    
    // 2. Check if admin API routes are using the correct auth import
    await verifyAdminApiRoutes();
    
    // 3. Check if admin pages are using the AdminLayout component
    await verifyAdminPages();
    
    console.log('\n✅ Admin integration verification completed successfully!');
  } catch (error) {
    console.error('Error during admin integration verification:', error);
  }
}

async function verifyAdminApiRoutes() {
  console.log('\nVerifying admin API routes...');
  
  const adminApiDir = path.join(__dirname, '..', 'app', 'api', 'admin');
  
  if (!fs.existsSync(adminApiDir)) {
    console.error('❌ Admin API directory not found');
    return;
  }
  
  // Check a few key admin API routes
  const routesToCheck = [
    'dashboard/route.js',
    'users/route.js',
    'vendors/route.js',
    'orders/route.js',
    'settings/route.js'
  ];
  
  for (const route of routesToCheck) {
    const routePath = path.join(adminApiDir, route);
    if (!fs.existsSync(routePath)) {
      console.log(`⚠️ Route not found: ${route}`);
      continue;
    }
    
    const content = fs.readFileSync(routePath, 'utf8');
    if (content.includes("import { authOptions } from '../../../../lib/auth'")) {
      console.log(`✅ ${route} has correct auth import`);
    } else {
      console.log(`❌ ${route} has incorrect auth import`);
    }
  }
}

async function verifyAdminPages() {
  console.log('\nVerifying admin pages...');
  
  const adminPagesDir = path.join(__dirname, '..', 'app', 'admin');
  
  if (!fs.existsSync(adminPagesDir)) {
    console.error('❌ Admin pages directory not found');
    return;
  }
  
  // Check a few key admin pages
  const pagesToCheck = [
    'dashboard/page.js',
    'users/page.js',
    'vendors/page.js',
    'orders/page.js',
    'settings/page.js',
    'cache/page.js'
  ];
  
  for (const page of pagesToCheck) {
    const pagePath = path.join(adminPagesDir, page);
    if (!fs.existsSync(pagePath)) {
      console.log(`⚠️ Page not found: ${page}`);
      continue;
    }
    
    const content = fs.readFileSync(pagePath, 'utf8');
    if (content.includes("import AdminLayout from '../../components/AdminLayout'")) {
      console.log(`✅ ${page} uses AdminLayout component`);
    } else {
      console.log(`❌ ${page} does not use AdminLayout component`);
    }
  }
}

// Run the verification
verifyAdminIntegration(); 