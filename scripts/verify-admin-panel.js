/**
 * Comprehensive verification script for the admin panel
 * This script checks all aspects of the admin panel to ensure it's working correctly
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ADMIN_ROUTES = [
  'dashboard',
  'users',
  'vendors',
  'orders',
  'notifications',
  'analytics',
  'audit-logs',
  'system-health',
  'settings'
];

const API_ROUTES = [
  'admin/dashboard',
  'admin/users',
  'admin/vendors',
  'admin/orders',
  'admin/notifications',
  'admin/analytics',
  'admin/audit-logs',
  'admin/system-health',
  'admin/settings'
];

// Main verification function
async function verifyAdminPanel() {
  console.log('🔍 Starting Admin Panel Verification');
  console.log('==================================');
  
  let allPassed = true;
  
  // Check 1: Verify admin page routes exist
  console.log('\n📂 Checking Admin Page Routes:');
  const pageRoutesResult = checkAdminPageRoutes();
  allPassed = allPassed && pageRoutesResult.success;
  
  // Check 2: Verify API routes exist
  console.log('\n📡 Checking Admin API Routes:');
  const apiRoutesResult = checkAdminApiRoutes();
  allPassed = allPassed && apiRoutesResult.success;
  
  // Check 3: Verify auth configuration
  console.log('\n🔐 Checking Authentication Configuration:');
  const authResult = checkAuthConfiguration();
  allPassed = allPassed && authResult.success;
  
  // Check 4: Verify middleware configuration
  console.log('\n🔄 Checking Middleware Configuration:');
  const middlewareResult = checkMiddlewareConfiguration();
  allPassed = allPassed && middlewareResult.success;
  
  // Check 5: Verify service implementations
  console.log('\n⚙️ Checking Service Implementations:');
  const servicesResult = checkServiceImplementations();
  allPassed = allPassed && servicesResult.success;
  
  // Check 6: Verify component structure
  console.log('\n🧩 Checking Component Structure:');
  const componentsResult = checkComponentStructure();
  allPassed = allPassed && componentsResult.success;
  
  // Check 7: Verify error handling
  console.log('\n🛡️ Checking Error Handling:');
  const errorHandlingResult = checkErrorHandling();
  allPassed = allPassed && errorHandlingResult.success;
  
  // Check 8: Verify accessibility
  console.log('\n♿ Checking Accessibility:');
  const accessibilityResult = checkAccessibility();
  allPassed = allPassed && accessibilityResult.success;
  
  // Check 9: Verify caching and performance
  console.log('\n⚡ Checking Caching and Performance:');
  const cachingResult = checkCachingAndPerformance();
  allPassed = allPassed && cachingResult.success;
  
  // Check 10: Verify session handling
  console.log('\n🔑 Checking Session Handling:');
  const sessionResult = checkSessionHandling();
  allPassed = allPassed && sessionResult.success;
  
  // Final summary
  console.log('\n==================================');
  if (allPassed) {
    console.log('✅ All checks passed! The admin panel is configured correctly.');
  } else {
    console.log('❌ Some checks failed. Please review the issues above.');
  }
}

// Check admin page routes
function checkAdminPageRoutes() {
  let success = true;
  const missingRoutes = [];
  
  for (const route of ADMIN_ROUTES) {
    const routePath = path.join(__dirname, '..', 'app', 'admin', route, 'page.js');
    if (!fs.existsSync(routePath)) {
      success = false;
      missingRoutes.push(route);
      console.log(`  ❌ Missing page route: ${route}`);
    } else {
      console.log(`  ✅ Found page route: ${route}`);
    }
  }
  
  return { success, missingRoutes };
}

// Check admin API routes
function checkAdminApiRoutes() {
  let success = true;
  const missingRoutes = [];
  
  for (const route of API_ROUTES) {
    const routePath = path.join(__dirname, '..', 'app', 'api', route, 'route.js');
    if (!fs.existsSync(routePath)) {
      success = false;
      missingRoutes.push(route);
      console.log(`  ❌ Missing API route: ${route}`);
    } else {
      console.log(`  ✅ Found API route: ${route}`);
      
      // Check if the route uses the admin middleware
      const routeContent = fs.readFileSync(routePath, 'utf8');
      if (!routeContent.includes('withAdminApiMiddleware') && 
          route.startsWith('admin/') && 
          !route.includes('auth')) {
        console.log(`    ⚠️ Warning: API route ${route} may not be using the admin middleware`);
      }
    }
  }
  
  return { success, missingRoutes };
}

// Check auth configuration
function checkAuthConfiguration() {
  let success = true;
  
  // Check if auth.js exists
  const authPath = path.join(__dirname, '..', 'lib', 'auth.js');
  if (!fs.existsSync(authPath)) {
    success = false;
    console.log('  ❌ Missing auth.js file');
  } else {
    console.log('  ✅ Found auth.js file');
    
    // Check if authOptions is exported
    const authContent = fs.readFileSync(authPath, 'utf8');
    if (!authContent.includes('export const authOptions')) {
      success = false;
      console.log('  ❌ authOptions is not exported from auth.js');
    } else {
      console.log('  ✅ authOptions is properly exported');
    }
  }
  
  // Check if NextAuth route exists
  const nextAuthPath = path.join(__dirname, '..', 'app', 'api', 'auth', '[...nextauth]', 'route.js');
  if (!fs.existsSync(nextAuthPath)) {
    success = false;
    console.log('  ❌ Missing NextAuth route');
  } else {
    console.log('  ✅ Found NextAuth route');
    
    // Check if it imports authOptions correctly
    const nextAuthContent = fs.readFileSync(nextAuthPath, 'utf8');
    if (!nextAuthContent.includes('import { authOptions }')) {
      success = false;
      console.log('  ❌ NextAuth route does not import authOptions');
    } else {
      console.log('  ✅ NextAuth route imports authOptions correctly');
    }
  }
  
  return { success };
}

// Check middleware configuration
function checkMiddlewareConfiguration() {
  let success = true;
  
  // Check if adminApiMiddleware exists
  const middlewarePath = path.join(__dirname, '..', 'lib', 'middleware', 'adminApiMiddleware.js');
  if (!fs.existsSync(middlewarePath)) {
    success = false;
    console.log('  ❌ Missing adminApiMiddleware.js file');
  } else {
    console.log('  ✅ Found adminApiMiddleware.js file');
    
    // Check if withAdminApiMiddleware is exported
    const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
    if (!middlewareContent.includes('export function withAdminApiMiddleware')) {
      success = false;
      console.log('  ❌ withAdminApiMiddleware is not exported');
    } else {
      console.log('  ✅ withAdminApiMiddleware is properly exported');
    }
    
    // Check for request deduplication
    if (!middlewareContent.includes('inflightRequests')) {
      console.log('  ⚠️ Warning: Request deduplication may not be implemented');
    } else {
      console.log('  ✅ Request deduplication is implemented');
    }
    
    // Check for concurrency control
    if (!middlewareContent.includes('maxConcurrentRequests')) {
      console.log('  ⚠️ Warning: Concurrency control may not be implemented');
    } else {
      console.log('  ✅ Concurrency control is implemented');
    }
  }
  
  return { success };
}

// Check service implementations
function checkServiceImplementations() {
  let success = true;
  const requiredServices = [
    { name: 'auditService', path: 'lib/services/auditService.js' },
    { name: 'systemHealthService', path: 'lib/services/systemHealthService.js' }
  ];
  
  for (const service of requiredServices) {
    const servicePath = path.join(__dirname, '..', service.path);
    if (!fs.existsSync(servicePath)) {
      success = false;
      console.log(`  ❌ Missing ${service.name} implementation`);
    } else {
      console.log(`  ✅ Found ${service.name} implementation`);
      
      // Check if service is exported
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      if (!serviceContent.includes(`export const ${service.name}`)) {
        success = false;
        console.log(`  ❌ ${service.name} is not exported`);
      } else {
        console.log(`  ✅ ${service.name} is properly exported`);
      }
      
      // Check for retry mechanisms
      if (!serviceContent.includes('retries')) {
        console.log(`  ⚠️ Warning: ${service.name} may not have retry mechanisms`);
      } else {
        console.log(`  ✅ ${service.name} has retry mechanisms`);
      }
    }
  }
  
  return { success };
}

// Check component structure
function checkComponentStructure() {
  let success = true;
  
  // Check if AdminLayout component exists
  const adminLayoutPath = path.join(__dirname, '..', 'app', 'components', 'AdminLayout.js');
  if (!fs.existsSync(adminLayoutPath)) {
    success = false;
    console.log('  ❌ Missing AdminLayout component');
  } else {
    console.log('  ✅ Found AdminLayout component');
    
    // Check if it includes all navigation items
    const adminLayoutContent = fs.readFileSync(adminLayoutPath, 'utf8');
    for (const route of ADMIN_ROUTES) {
      const routePath = `/admin/${route}`;
      if (!adminLayoutContent.includes(routePath)) {
        console.log(`  ⚠️ Warning: AdminLayout may not include navigation for ${route}`);
      }
    }
    
    // Check for localStorage persistence
    if (!adminLayoutContent.includes('localStorage')) {
      console.log('  ⚠️ Warning: AdminLayout may not persist navigation state');
    } else {
      console.log('  ✅ AdminLayout persists navigation state');
    }
  }
  
  // Check if admin root layout exists
  const adminRootLayoutPath = path.join(__dirname, '..', 'app', 'admin', 'layout.js');
  if (!fs.existsSync(adminRootLayoutPath)) {
    success = false;
    console.log('  ❌ Missing admin root layout');
  } else {
    console.log('  ✅ Found admin root layout');
    
    // Check if it handles authentication
    const adminRootLayoutContent = fs.readFileSync(adminRootLayoutPath, 'utf8');
    if (!adminRootLayoutContent.includes('useSession')) {
      success = false;
      console.log('  ❌ Admin root layout does not use session authentication');
    } else {
      console.log('  ✅ Admin root layout uses session authentication');
    }
    
    // Check for session timeout handling
    if (!adminRootLayoutContent.includes('SESSION_TIMEOUT')) {
      console.log('  ⚠️ Warning: Admin root layout may not handle session timeouts');
    } else {
      console.log('  ✅ Admin root layout handles session timeouts');
    }
    
    // Check for browser detection
    if (!adminRootLayoutContent.includes('getBrowser')) {
      console.log('  ⚠️ Warning: Admin root layout may not handle cross-browser compatibility');
    } else {
      console.log('  ✅ Admin root layout handles cross-browser compatibility');
    }
  }
  
  return { success };
}

// Check error handling
function checkErrorHandling() {
  let success = true;
  
  // Check audit logs page
  const auditLogsPath = path.join(__dirname, '..', 'app', 'admin', 'audit-logs', 'page.js');
  if (fs.existsSync(auditLogsPath)) {
    const auditLogsContent = fs.readFileSync(auditLogsPath, 'utf8');
    
    // Check for offline handling
    if (!auditLogsContent.includes('isOffline')) {
      console.log('  ⚠️ Warning: Audit logs page may not handle offline state');
    } else {
      console.log('  ✅ Audit logs page handles offline state');
    }
    
    // Check for error recovery
    if (!auditLogsContent.includes('pendingRequests')) {
      console.log('  ⚠️ Warning: Audit logs page may not have error recovery');
    } else {
      console.log('  ✅ Audit logs page has error recovery');
    }
  }
  
  // Check system health page
  const systemHealthPath = path.join(__dirname, '..', 'app', 'admin', 'system-health', 'page.js');
  if (fs.existsSync(systemHealthPath)) {
    const systemHealthContent = fs.readFileSync(systemHealthPath, 'utf8');
    
    // Check for retry logic
    if (!systemHealthContent.includes('retryCount')) {
      console.log('  ⚠️ Warning: System health page may not have retry logic');
    } else {
      console.log('  ✅ System health page has retry logic');
    }
    
    // Check for timeout handling
    if (!systemHealthContent.includes('AbortController')) {
      console.log('  ⚠️ Warning: System health page may not have timeout handling');
    } else {
      console.log('  ✅ System health page has timeout handling');
    }
  }
  
  success = true; // Set to true as these are warnings, not failures
  return { success };
}

// Check accessibility
function checkAccessibility() {
  let success = true;
  
  // Check AdminLayout component
  const adminLayoutPath = path.join(__dirname, '..', 'app', 'components', 'AdminLayout.js');
  if (fs.existsSync(adminLayoutPath)) {
    const adminLayoutContent = fs.readFileSync(adminLayoutPath, 'utf8');
    
    // Check for ARIA attributes
    if (!adminLayoutContent.includes('aria-')) {
      success = false;
      console.log('  ❌ AdminLayout may not have ARIA attributes');
    } else {
      console.log('  ✅ AdminLayout has ARIA attributes');
    }
    
    // Check for role attributes
    if (!adminLayoutContent.includes('role=')) {
      success = false;
      console.log('  ❌ AdminLayout may not have role attributes');
    } else {
      console.log('  ✅ AdminLayout has role attributes');
    }
  }
  
  return { success };
}

// Check caching and performance
function checkCachingAndPerformance() {
  let success = true;
  
  // Check system health page
  const systemHealthPath = path.join(__dirname, '..', 'app', 'admin', 'system-health', 'page.js');
  if (fs.existsSync(systemHealthPath)) {
    const systemHealthContent = fs.readFileSync(systemHealthPath, 'utf8');
    
    // Check for caching
    if (!systemHealthContent.includes('localStorage')) {
      console.log('  ⚠️ Warning: System health page may not implement caching');
    } else {
      console.log('  ✅ System health page implements caching');
    }
    
    // Check for cache TTL
    if (!systemHealthContent.includes('CACHE_TTL')) {
      console.log('  ⚠️ Warning: System health page may not have cache TTL');
    } else {
      console.log('  ✅ System health page has cache TTL');
    }
  }
  
  success = true; // Set to true as these are warnings, not failures
  return { success };
}

// Check session handling
function checkSessionHandling() {
  let success = true;
  
  // Check admin root layout
  const adminRootLayoutPath = path.join(__dirname, '..', 'app', 'admin', 'layout.js');
  if (fs.existsSync(adminRootLayoutPath)) {
    const adminRootLayoutContent = fs.readFileSync(adminRootLayoutPath, 'utf8');
    
    // Check for session timeout
    if (!adminRootLayoutContent.includes('SESSION_TIMEOUT')) {
      success = false;
      console.log('  ❌ Admin root layout may not handle session timeouts');
    } else {
      console.log('  ✅ Admin root layout handles session timeouts');
    }
    
    // Check for activity tracking
    if (!adminRootLayoutContent.includes('lastActivity')) {
      success = false;
      console.log('  ❌ Admin root layout may not track user activity');
    } else {
      console.log('  ✅ Admin root layout tracks user activity');
    }
    
    // Check for timeout warning
    if (!adminRootLayoutContent.includes('showTimeoutWarning')) {
      console.log('  ⚠️ Warning: Admin root layout may not show timeout warnings');
    } else {
      console.log('  ✅ Admin root layout shows timeout warnings');
    }
  }
  
  return { success };
}

// Run the verification
verifyAdminPanel().catch(error => {
  console.error('Error during verification:', error);
  process.exit(1);
}); 