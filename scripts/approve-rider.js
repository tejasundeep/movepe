/**
 * Script to approve a rider by changing their status from "pending" to "available"
 * 
 * Usage: node scripts/approve-rider.js <rider-email>
 * Example: node scripts/approve-rider.js lucky@gmail.com
 */

const fs = require('fs');
const path = require('path');

// Get rider email from command line arguments
const riderEmail = process.argv[2];

if (!riderEmail) {
  console.error('Please provide a rider email');
  console.error('Usage: node scripts/approve-rider.js <rider-email>');
  process.exit(1);
}

// Read riders.json
const ridersPath = path.join(__dirname, '..', 'data', 'riders.json');
const riders = JSON.parse(fs.readFileSync(ridersPath, 'utf8'));

// Find rider by email
const riderIndex = riders.findIndex(rider => rider.email === riderEmail);

if (riderIndex === -1) {
  console.error(`Rider with email ${riderEmail} not found`);
  process.exit(1);
}

// Check if rider is pending
if (riders[riderIndex].status !== 'pending') {
  console.error(`Rider with email ${riderEmail} is not pending approval (current status: ${riders[riderIndex].status})`);
  process.exit(1);
}

// Update rider status to available
riders[riderIndex].status = 'available';

// Write updated riders.json
fs.writeFileSync(ridersPath, JSON.stringify(riders, null, 2));

console.log(`Rider ${riderEmail} has been approved`); 