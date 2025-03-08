/**
 * Test script for rider dashboard functionality
 * 
 * This script tests the following:
 * 1. Verifies that the rider has the correct role in users.json
 * 2. Verifies that the rider has the correct status in riders.json
 * 3. Verifies that there are available orders for the rider
 * 
 * Usage: node scripts/test-rider-dashboard.js <rider-email>
 * Example: node scripts/test-rider-dashboard.js lucky@gmail.com
 */

const fs = require('fs');
const path = require('path');

// Get rider email from command line arguments
const riderEmail = process.argv[2] || 'lucky@gmail.com';

console.log(`Testing rider dashboard for ${riderEmail}...`);

// Read users.json
const usersPath = path.join(__dirname, '..', 'data', 'users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

// Find user by email
const user = users.find(user => user.email === riderEmail);

if (!user) {
  console.error(`User with email ${riderEmail} not found`);
  process.exit(1);
}

console.log('User found:');
console.log(`  Name: ${user.name}`);
console.log(`  Role: ${user.role}`);

// Check if user has rider role
if (user.role !== 'rider') {
  console.error(`User with email ${riderEmail} does not have rider role (current role: ${user.role})`);
  console.log('Updating user role to rider...');
  
  // Update user role
  const userIndex = users.findIndex(u => u.email === riderEmail);
  users[userIndex].role = 'rider';
  
  // Write updated users.json
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  
  console.log('User role updated to rider');
} else {
  console.log('User has correct rider role');
}

// Read riders.json
const ridersPath = path.join(__dirname, '..', 'data', 'riders.json');
const riders = JSON.parse(fs.readFileSync(ridersPath, 'utf8'));

// Find rider by email
const rider = riders.find(rider => rider.email === riderEmail);

if (!rider) {
  console.error(`Rider with email ${riderEmail} not found`);
  process.exit(1);
}

console.log('Rider found:');
console.log(`  Name: ${rider.name}`);
console.log(`  Status: ${rider.status}`);
console.log(`  Service Areas: ${rider.serviceAreas.join(', ')}`);

// Check if rider has available status
if (rider.status !== 'available') {
  console.error(`Rider with email ${riderEmail} does not have available status (current status: ${rider.status})`);
  console.log('Updating rider status to available...');
  
  // Update rider status
  const riderIndex = riders.findIndex(r => r.email === riderEmail);
  riders[riderIndex].status = 'available';
  
  // Write updated riders.json
  fs.writeFileSync(ridersPath, JSON.stringify(riders, null, 2));
  
  console.log('Rider status updated to available');
} else {
  console.log('Rider has correct available status');
}

// Read orders.json
const ordersPath = path.join(__dirname, '..', 'data', 'orders.json');
const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));

// Find orders that match rider's service areas
const availableOrders = orders.filter(order => {
  // Check if order is in a status that can be assigned to a rider
  const isAssignable = ['pending', 'rider_requested'].includes(order.status);
  
  // Check if order is in the rider's service area
  const inServiceArea = rider.serviceAreas.some(area => {
    return order.pickupPincode.startsWith(area) || order.destinationPincode.startsWith(area);
  });
  
  return isAssignable && inServiceArea;
});

console.log(`Found ${availableOrders.length} available orders for rider:`);
availableOrders.forEach(order => {
  console.log(`  Order ID: ${order.orderId}`);
  console.log(`    Status: ${order.status}`);
  console.log(`    Pickup: ${order.pickupAddress} (${order.pickupPincode})`);
  console.log(`    Destination: ${order.destinationAddress} (${order.destinationPincode})`);
  console.log('');
});

if (availableOrders.length === 0) {
  console.log('No available orders found for rider');
  console.log('Creating a test order...');
  
  // Create a test order
  const testOrder = {
    "orderId": `test-order-for-${riderEmail.split('@')[0]}-${Date.now()}`,
    "userEmail": "customer-test@example.com",
    "customerName": "Test Customer",
    "customerPhone": "9876543210",
    "pickupPincode": rider.serviceAreas[0],
    "pickupAddress": `123 Test St, Test City ${rider.serviceAreas[0]}`,
    "destinationPincode": rider.serviceAreas[0],
    "destinationAddress": `456 Test Ave, Test City ${rider.serviceAreas[0]}`,
    "packageDetails": "Small package, 1kg",
    "amount": 120,
    "status": "pending",
    "createdAt": new Date().toISOString(),
    "updatedAt": new Date().toISOString(),
    "statusHistory": [
      {
        "status": "pending",
        "timestamp": new Date().toISOString(),
        "comment": "Order created"
      }
    ]
  };
  
  // Add test order to orders.json
  orders.push(testOrder);
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
  
  console.log('Test order created:');
  console.log(`  Order ID: ${testOrder.orderId}`);
  console.log(`  Pickup: ${testOrder.pickupAddress} (${testOrder.pickupPincode})`);
  console.log(`  Destination: ${testOrder.destinationAddress} (${testOrder.destinationPincode})`);
}

console.log('Rider dashboard test completed successfully!'); 