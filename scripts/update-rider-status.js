/**
 * Script to update a rider's status
 * 
 * Usage: node scripts/update-rider-status.js [email] [status]
 * Example: node scripts/update-rider-status.js lucky@gmail.com approved
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const riderEmail = process.argv[2];
const newStatus = process.argv[3];

// Validate arguments
if (!riderEmail || !newStatus) {
  console.error('Usage: node scripts/update-rider-status.js [email] [status]');
  console.error('Example: node scripts/update-rider-status.js lucky@gmail.com approved');
  process.exit(1);
}

// Valid status values
const validStatuses = ['pending', 'approved', 'rejected', 'available', 'unavailable', 'delivering'];
if (!validStatuses.includes(newStatus)) {
  console.error(`Invalid status: ${newStatus}`);
  console.error(`Valid statuses: ${validStatuses.join(', ')}`);
  process.exit(1);
}

// Update rider status
function updateRiderStatus() {
  try {
    // Read riders data
    const ridersPath = path.join(process.cwd(), 'data', 'riders.json');
    const ridersData = JSON.parse(fs.readFileSync(ridersPath, 'utf8'));
    
    // Find the rider
    const riderIndex = ridersData.findIndex(r => r.email === riderEmail);
    if (riderIndex === -1) {
      console.error(`Rider with email ${riderEmail} not found!`);
      process.exit(1);
    }
    
    const rider = ridersData[riderIndex];
    console.log(`Found rider: ${rider.name} (Current status: ${rider.status})`);
    
    // Update status
    const oldStatus = rider.status;
    ridersData[riderIndex].status = newStatus;
    
    // Write updated data back to file
    fs.writeFileSync(ridersPath, JSON.stringify(ridersData, null, 2));
    
    console.log(`Successfully updated rider status from '${oldStatus}' to '${newStatus}'`);
    
  } catch (error) {
    console.error('Error updating rider status:', error);
    process.exit(1);
  }
}

updateRiderStatus(); 