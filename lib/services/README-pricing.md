# Advanced Moving Cost Estimator Service

## Overview

The Advanced Moving Cost Estimator is a sophisticated system for accurately estimating moving costs with:

- Comprehensive factor analysis including time-based pricing
- Real-world route calculations
- Dynamic market adjustments
- Vendor-specific calibration

## Features

- **Location-Based Pricing**: Different rates based on city tiers (Metro, Normal City, Town, Village)
- **Distance Calculation**: Real-world driving distance using mapping APIs with fallback to haversine formula
- **Time-Based Adjustments**: Pricing varies by month, day of week, and holidays
- **Vendor Tiers**: Support for economy, default, and premium vendor pricing
- **Special Item Handling**: Different rates for standard, fragile, valuable, and oversized items
- **Floor Level Costs**: Additional charges for higher floors with elevator discounts
- **Parking Distance Surcharges**: Extra costs based on parking distance from property
- **Regional Adjustments**: Region-specific pricing factors
- **Caching System**: Efficient caching of location, distance, and pricing data

## API Usage

### Calculate Detailed Moving Cost

```javascript
const { calculateMovingCost } = require('../lib/services/pricingService');

// Example usage
const estimate = await calculateMovingCost({
  fromZip: "110001",          // Delhi
  toZip: "400001",            // Mumbai
  moveSize: "2BHK",
  moveDate: "2023-08-15",     // Peak season, holiday
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
```

### Get Quick Estimate

```javascript
const { getQuickEstimate } = require('../lib/services/pricingService');

// Example usage
const quickEstimate = await getQuickEstimate("560001", "600001", "1BHK");
```

### Get Available Move Sizes

```javascript
const { getAvailableMoveSizes } = require('../lib/services/pricingService');

// Example usage
const moveSizes = getAvailableMoveSizes();
// Returns: ["1RK", "1BHK", "2BHK", "3BHK", "4BHK", "5BHK", "Villa"]
```

### Get Cost Factors

```javascript
const { getCostFactors } = require('../lib/services/pricingService');

// Example usage
const factors = getCostFactors();
```

## REST API Endpoints

### GET /api/pricing

Returns available move sizes, location tiers, and other pricing factors.

### POST /api/pricing

Calculates a detailed moving cost estimate.

**Request Body:**
```json
{
  "fromZip": "110001",
  "toZip": "400001",
  "moveSize": "2BHK",
  "moveDate": "2023-08-15",
  "floorLevelOrigin": 4,
  "floorLevelDestination": 2,
  "hasElevatorOrigin": true,
  "hasElevatorDestination": false,
  "parkingDistanceOrigin": 70,
  "parkingDistanceDestination": 30,
  "premiumPacking": true,
  "specialItems": [
    { "category": "fragile", "quantity": 2 },
    { "category": "oversized", "quantity": 1 }
  ],
  "storageMonths": 1,
  "insuranceValue": 500000,
  "vendorType": "premium",
  "additionalServices": [
    { "name": "Cleaning", "cost": 2000 },
    { "name": "Furniture assembly", "cost": 3000 }
  ]
}
```

### POST /api/pricing/quick-estimate

Generates a quick estimate with minimal information.

**Request Body:**
```json
{
  "fromZip": "560001",
  "toZip": "600001",
  "moveSize": "1BHK"
}
```

## Testing

Run the pricing service tests:

```bash
npm run test-pricing
```

## Configuration

The pricing service can be configured by modifying the CONFIG object in the pricingService.js file. Key configuration options include:

- API keys and settings
- Tax rates
- Cost adjustment factors
- Special item categories and rates
- Default values

## Dependencies

- node-fetch: For making HTTP requests to external APIs
- uuid: For generating unique quote IDs 