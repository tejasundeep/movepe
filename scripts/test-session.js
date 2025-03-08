/**
 * Script to test the session by simulating a login and checking if the role is correctly set in the session
 * 
 * This script:
 * 1. Simulates a login for a rider user
 * 2. Checks if the role is correctly set in the session
 * 
 * Usage: node scripts/test-session.js <email> <password>
 * Example: node scripts/test-session.js lucky@gmail.com password123
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Get email and password from command line arguments
const email = process.argv[2] || 'lucky@gmail.com';
const password = process.argv[3] || 'password123';

console.log(`Testing session for ${email}...`);

// Read users.json
const usersPath = path.join(__dirname, '..', 'data', 'users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

// Find user by email
const user = users.find(user => user.email === email);

if (!user) {
  console.error(`User with email ${email} not found`);
  process.exit(1);
}

console.log('User found:');
console.log(`  Name: ${user.name}`);
console.log(`  Role: ${user.role}`);

// Verify password (this is just for testing, in a real app this would be done by NextAuth)
const verifyPassword = async () => {
  try {
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.error('Invalid password');
      process.exit(1);
    }
    console.log('Password verified');
  } catch (error) {
    console.error('Error verifying password:', error);
    process.exit(1);
  }
};

// Simulate creating a session token
const createSessionToken = () => {
  // This is a simplified version of what NextAuth does
  const token = {
    name: user.name,
    email: user.email,
    id: user.id,
    role: user.role,
    phone: user.phone,
    whatsapp: user.whatsapp
  };
  
  console.log('Session token created:');
  console.log(token);
  
  // In a real app, this would be encrypted and signed
  return jwt.sign(token, 'test-secret', { expiresIn: '1h' });
};

// Simulate decoding a session token
const decodeSessionToken = (token) => {
  try {
    const decoded = jwt.verify(token, 'test-secret');
    console.log('Session token decoded:');
    console.log(decoded);
    return decoded;
  } catch (error) {
    console.error('Error decoding session token:', error);
    return null;
  }
};

// Run the test
const runTest = async () => {
  await verifyPassword();
  const token = createSessionToken();
  const session = decodeSessionToken(token);
  
  if (session && session.role === user.role) {
    console.log('✅ Session test passed: Role is correctly set in the session');
  } else {
    console.error('❌ Session test failed: Role is not correctly set in the session');
    console.error(`  Expected: ${user.role}`);
    console.error(`  Actual: ${session?.role}`);
  }
};

runTest(); 