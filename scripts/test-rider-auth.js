/**
 * Test script to verify rider authentication and authorization
 * 
 * Usage: node scripts/test-rider-auth.js [email] [password]
 * Example: node scripts/test-rider-auth.js lucky@gmail.com password123
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Default test credentials
const testEmail = process.argv[2] || 'lucky@gmail.com';
const testPassword = process.argv[3] || 'password123';

// JWT secret (should match the one in your auth.js)
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

async function testRiderAuth() {
  try {
    console.log(`Testing rider authentication for ${testEmail}...`);
    
    // Read users data
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    
    // Find the user
    const user = usersData.find(u => u.email === testEmail);
    if (!user) {
      console.error(`User with email ${testEmail} not found!`);
      process.exit(1);
    }
    
    console.log(`User found: ${user.name} (${user.role})`);
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);
    if (!isPasswordValid) {
      console.error('Invalid password!');
      process.exit(1);
    }
    
    console.log('Password verified successfully!');
    
    // Check if user is a rider
    if (user.role !== 'rider') {
      console.error(`User is not a rider! Current role: ${user.role}`);
      process.exit(1);
    }
    
    console.log('User has rider role ✓');
    
    // Create a session token (similar to what your auth system would do)
    const token = jwt.sign(
      {
        name: user.name,
        email: user.email,
        id: user.id,
        role: user.role,
        phone: user.phone,
        whatsapp: user.whatsapp,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      },
      JWT_SECRET
    );
    
    console.log('Session token created successfully!');
    console.log('Token payload:', jwt.decode(token));
    
    // Read riders data
    const ridersPath = path.join(process.cwd(), 'data', 'riders.json');
    const ridersData = JSON.parse(fs.readFileSync(ridersPath, 'utf8'));
    
    // Find the rider
    const rider = ridersData.find(r => r.email === testEmail);
    if (!rider) {
      console.error(`Rider with email ${testEmail} not found in riders.json!`);
      process.exit(1);
    }
    
    console.log(`Rider found: ${rider.name} (Status: ${rider.status})`);
    
    // Check rider status
    if (rider.status !== 'approved') {
      console.warn(`Warning: Rider status is ${rider.status}, not 'approved'`);
    } else {
      console.log('Rider status is approved ✓');
    }
    
    console.log('\nRider authentication test completed successfully! ✓');
    
  } catch (error) {
    console.error('Error during rider authentication test:', error);
    process.exit(1);
  }
}

testRiderAuth(); 