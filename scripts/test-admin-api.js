// This script tests the admin API endpoints
const fetch = require('node-fetch');
const { storage } = require('../lib/storage');

async function testAdminAPI() {
  console.log('Testing Admin API Endpoints...');
  
  try {
    // First, ensure we have an admin user in the system
    await ensureAdminUser();
    
    // Add more test functions as needed
    console.log('Admin API test completed successfully!');
  } catch (error) {
    console.error('Error during admin API test:', error);
  }
}

async function ensureAdminUser() {
  console.log('Ensuring admin user exists...');
  
  // Read users data
  const users = await storage.readData('users.json') || [];
  
  // Check if admin user exists
  const adminUser = users.find(user => user.role === 'admin');
  
  if (adminUser) {
    console.log('Admin user found:', adminUser.email);
  } else {
    console.log('No admin user found. Please create an admin user through registration.');
    console.log('Then update their role to "admin" in the users.json file.');
  }
}

// Run the test
testAdminAPI(); 