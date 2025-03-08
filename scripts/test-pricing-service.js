/**
 * Test script for the pricing service
 * 
 * This script tests the pricing service with various scenarios
 * to ensure it's working correctly.
 */

const { calculateMovingCost, getQuickEstimate } = require('../lib/services/pricingService');

async function runTests() {
  console.log('Testing Pricing Service...\n');
  
  try {
    // Test 1: Simple move
    console.log('Test 1: Simple 2BHK move from Delhi to Mumbai');
    const estimate1 = await calculateMovingCost({
      fromZip: "110001", // Delhi
      toZip: "400001", // Mumbai
      moveSize: "2BHK"
    });
    console.log('Estimate:', JSON.stringify(estimate1, null, 2));
    console.log('\n-----------------------------------\n');
    
    // Test 2: Complex move with many factors
    console.log('Test 2: Complex move with many factors');
    const estimate2 = await calculateMovingCost({
      fromZip: "110001",          // Delhi
      toZip: "400001",            // Mumbai
      moveSize: "2BHK",
      moveDate: new Date("2023-08-15"),  // Peak season, holiday
      floorLevelOrigin: 4,
      floorLevelDestination: 2,
      hasElevatorOrigin: true,
      hasElevatorDestination: false,
      parkingDistanceOrigin: 70,
      parkingDistanceDestination: 30,
      premiumPacking: true,
      specialItems: [
        { category: 'fragile', quantity: 2 },
        { category: 'oversized', quantity: 1 }
      ],
      storageMonths: 1,
      insuranceValue: 500000,
      vendorType: 'premium',
      additionalServices: [
        { name: 'Cleaning', cost: 2000 },
        { name: 'Furniture assembly', cost: 3000 }
      ]
    });
    console.log('Estimate:', JSON.stringify(estimate2, null, 2));
    console.log('\n-----------------------------------\n');
    
    // Test 3: Quick estimate
    console.log('Test 3: Quick estimate for 1BHK move from Bangalore to Chennai');
    const quickEstimate = await getQuickEstimate("560001", "600001", "1BHK");
    console.log('Quick Estimate:', JSON.stringify(quickEstimate, null, 2));
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runTests(); 