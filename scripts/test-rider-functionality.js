/**
 * Test script for rider functionality
 * 
 * This script tests the following rider functionality:
 * 1. Rider registration
 * 2. Rider login
 * 3. Rider profile retrieval
 * 4. Available orders retrieval
 * 5. Order acceptance
 * 6. Order status updates
 * 7. Location updates
 * 
 * To run this script:
 * node scripts/test-rider-functionality.js
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Base URL for API calls
const BASE_URL = 'http://localhost:3000/api';

// Test rider data
const testRider = {
  name: 'Test Rider',
  email: 'test.rider@example.com',
  password: 'password123',
  phone: '9876543210',
  whatsapp: '9876543210',
  vehicleType: 'motorcycle',
  vehicleModel: 'Honda CB Shine',
  vehicleYear: '2020',
  licensePlate: 'KA-01-AB-1234',
  drivingLicense: 'KA0120201234567',
  serviceAreas: '560001,560002,560003'
};

// Test order data
const testOrder = {
  orderId: 'test-order-id',
  status: 'pending',
  pickupAddress: '123 Main St, Bangalore 560001',
  destinationAddress: '456 Park Ave, Bangalore 560002',
  packageDetails: 'Small package, 2kg',
  amount: 150,
  customerName: 'Test Customer',
  customerPhone: '9876543210',
  requestedTime: new Date().toISOString()
};

// Test location data
const testLocation = {
  lat: 12.9716,
  lon: 77.5946
};

// Function to register a rider
async function registerRider() {
  console.log('Testing rider registration...');
  
  try {
    const response = await fetch(`${BASE_URL}/auth/register/rider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRider)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Rider registration successful');
      console.log('Rider ID:', data.rider.riderId);
      return data;
    } else {
      console.error('❌ Rider registration failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during rider registration:', error);
    return null;
  }
}

// Function to login as a rider
async function loginRider() {
  console.log('Testing rider login...');
  
  try {
    const response = await fetch(`${BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testRider.email,
        password: testRider.password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Rider login successful');
      return data.token;
    } else {
      console.error('❌ Rider login failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during rider login:', error);
    return null;
  }
}

// Function to get rider profile
async function getRiderProfile(token) {
  console.log('Testing rider profile retrieval...');
  
  try {
    const response = await fetch(`${BASE_URL}/rider/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Rider profile retrieval successful');
      console.log('Rider name:', data.rider.name);
      return data.rider;
    } else {
      console.error('❌ Rider profile retrieval failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during rider profile retrieval:', error);
    return null;
  }
}

// Function to get available orders
async function getAvailableOrders(token) {
  console.log('Testing available orders retrieval...');
  
  try {
    const response = await fetch(`${BASE_URL}/rider/available-orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Available orders retrieval successful');
      console.log('Number of available orders:', data.orders.length);
      return data.orders;
    } else {
      console.error('❌ Available orders retrieval failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during available orders retrieval:', error);
    return null;
  }
}

// Function to accept an order
async function acceptOrder(token, orderId) {
  console.log('Testing order acceptance...');
  
  try {
    const response = await fetch(`${BASE_URL}/rider/accept-order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Order acceptance successful');
      return data.order;
    } else {
      console.error('❌ Order acceptance failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during order acceptance:', error);
    return null;
  }
}

// Function to update order status
async function updateOrderStatus(token, orderId, status, notes) {
  console.log(`Testing order status update to ${status}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/rider/update-status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId, status, notes })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Order status update successful');
      return data.order;
    } else {
      console.error('❌ Order status update failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during order status update:', error);
    return null;
  }
}

// Function to update rider location
async function updateRiderLocation(token, location) {
  console.log('Testing rider location update...');
  
  try {
    const response = await fetch(`${BASE_URL}/rider/update-location`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ location })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Rider location update successful');
      return true;
    } else {
      console.error('❌ Rider location update failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error during rider location update:', error);
    return false;
  }
}

// Main function to run all tests
async function runTests() {
  console.log('Starting rider functionality tests...');
  
  // Register rider
  const registrationResult = await registerRider();
  if (!registrationResult) {
    console.error('❌ Tests failed at rider registration');
    return;
  }
  
  // Login as rider
  const token = await loginRider();
  if (!token) {
    console.error('❌ Tests failed at rider login');
    return;
  }
  
  // Get rider profile
  const rider = await getRiderProfile(token);
  if (!rider) {
    console.error('❌ Tests failed at rider profile retrieval');
    return;
  }
  
  // Get available orders
  const orders = await getAvailableOrders(token);
  if (!orders) {
    console.error('❌ Tests failed at available orders retrieval');
    return;
  }
  
  // If there are available orders, accept one
  if (orders.length > 0) {
    const order = orders[0];
    
    // Accept order
    const acceptedOrder = await acceptOrder(token, order.orderId);
    if (!acceptedOrder) {
      console.error('❌ Tests failed at order acceptance');
      return;
    }
    
    // Update order status to picked up
    const pickedUpOrder = await updateOrderStatus(token, order.orderId, 'picked_up', 'Package picked up');
    if (!pickedUpOrder) {
      console.error('❌ Tests failed at order status update (picked up)');
      return;
    }
    
    // Update order status to in transit
    const inTransitOrder = await updateOrderStatus(token, order.orderId, 'in_transit', 'Package in transit');
    if (!inTransitOrder) {
      console.error('❌ Tests failed at order status update (in transit)');
      return;
    }
    
    // Update order status to delivered
    const deliveredOrder = await updateOrderStatus(token, order.orderId, 'delivered', 'Package delivered');
    if (!deliveredOrder) {
      console.error('❌ Tests failed at order status update (delivered)');
      return;
    }
  } else {
    console.log('ℹ️ No available orders to test order acceptance and status updates');
  }
  
  // Update rider location
  const locationUpdateResult = await updateRiderLocation(token, testLocation);
  if (!locationUpdateResult) {
    console.error('❌ Tests failed at rider location update');
    return;
  }
  
  console.log('✅ All rider functionality tests passed!');
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Unhandled error during tests:', error);
}); 