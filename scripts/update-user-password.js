/**
 * Script to update a user's password
 * 
 * Usage: node scripts/update-user-password.js <email> <new-password>
 * Example: node scripts/update-user-password.js lucky@gmail.com password123
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Get email and password from command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: node scripts/update-user-password.js <email> <new-password>');
  process.exit(1);
}

console.log(`Updating password for ${email}...`);

// Read users.json
const usersPath = path.join(__dirname, '..', 'data', 'users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

// Find user by email
const userIndex = users.findIndex(user => user.email === email);

if (userIndex === -1) {
  console.error(`User with email ${email} not found`);
  process.exit(1);
}

// Hash the new password
const updatePassword = async () => {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    users[userIndex].password = hashedPassword;
    
    // Write updated users.json
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    
    console.log(`Password updated for ${email}`);
  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }
};

updatePassword(); 