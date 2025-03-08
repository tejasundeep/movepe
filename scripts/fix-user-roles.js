/**
 * Script to fix user roles by ensuring all users have the correct role
 * 
 * This script:
 * 1. Reads users.json and riders.json
 * 2. Ensures that all riders have the 'rider' role in users.json
 * 3. Ensures that all vendors have the 'vendor' role in users.json
 * 4. Ensures that all admins have the 'admin' role in users.json
 * 5. Ensures that all other users have the 'user' role in users.json
 * 
 * Usage: node scripts/fix-user-roles.js
 */

const fs = require('fs');
const path = require('path');

console.log('Fixing user roles...');

// Read users.json
const usersPath = path.join(__dirname, '..', 'data', 'users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

// Read riders.json
const ridersPath = path.join(__dirname, '..', 'data', 'riders.json');
const riders = JSON.parse(fs.readFileSync(ridersPath, 'utf8'));

// Read vendors.json
const vendorsPath = path.join(__dirname, '..', 'data', 'vendors.json');
let vendors = [];
try {
  vendors = JSON.parse(fs.readFileSync(vendorsPath, 'utf8'));
} catch (error) {
  console.log('No vendors.json file found, skipping vendors');
}

// Create a map of rider emails
const riderEmails = new Set(riders.map(rider => rider.email.toLowerCase()));
console.log(`Found ${riderEmails.size} riders:`, Array.from(riderEmails));

// Create a map of vendor emails
const vendorEmails = new Set(vendors.map(vendor => vendor.email.toLowerCase()));
console.log(`Found ${vendorEmails.size} vendors:`, Array.from(vendorEmails));

// Define admin emails
const adminEmails = new Set(['admin@movepe.com']);
console.log(`Found ${adminEmails.size} admins:`, Array.from(adminEmails));

// Log all users
console.log('All users:');
users.forEach(user => {
  console.log(`- ${user.email} (role: ${user.role || 'none'})`);
});

// Update user roles
let updatedCount = 0;
users.forEach(user => {
  const email = user.email.toLowerCase();
  let role = 'user'; // Default role
  
  if (riderEmails.has(email)) {
    role = 'rider';
  } else if (vendorEmails.has(email)) {
    role = 'vendor';
  } else if (adminEmails.has(email)) {
    role = 'admin';
  }
  
  if (user.role !== role) {
    console.log(`Updating user ${user.email} from role '${user.role || 'none'}' to '${role}'`);
    user.role = role;
    updatedCount++;
  }
});

// Write updated users.json
fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));

console.log(`Updated ${updatedCount} user roles`);
console.log('User roles fixed successfully!'); 