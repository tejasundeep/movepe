# MovePe Platform Flow

This document outlines the architecture and user flows of the MovePe platform, a comprehensive moving and delivery management system that connects users (customers), vendors (moving companies), and riders (delivery personnel).

## System Overview

MovePe is a platform designed to streamline the process of organizing moves and deliveries. The system facilitates the entire workflow from user request submission to delivery completion, with three main user roles:

1. **Users** - Customers who need moving or delivery services
2. **Vendors** - Moving companies that provide quotes and services
3. **Riders** - Delivery personnel who execute the actual deliveries

## User Flow

### 1. User Registration and Authentication

- Users register through `/register`
- Authentication is handled via NextAuth.js
- Users can sign in through `/login`

### 2. Move Request Submission

- Users start on the homepage where they can:
  - Get price estimates using the PriceEstimator component
  - Book a move using the MoveForm component
  - Request parcel delivery using the ParcelDeliveryForm component
- The system collects essential information:
  - Pickup location (with pincode autocomplete)
  - Destination location
  - Move size/type
  - Preferred date and time
  - Additional requirements

### 3. User Dashboard

- After submitting a request, users can track their orders from `user/dashboard`
- The dashboard displays:
  - List of all orders with status indicators
  - Order details including pickup/destination locations
  - Move date and size
  - Links to view detailed order information

### 4. Order Details

- Users can view detailed information about their orders at `order/[orderId]`
- This includes:
  - Current status
  - Vendor information (once assigned)
  - Quote details
  - Payment options
  - Tracking information

## Vendor Flow

### 1. Vendor Registration and Onboarding

- Vendors register and go through an onboarding process at `vendor/onboarding`
- They provide business details, service areas, and verification documents

### 2. Vendor Dashboard

- Vendors manage their business through `vendor/dashboard`
- The dashboard includes:
  - New move requests in their service area
  - Active orders they're handling
  - Completed orders history
  - Earnings information
  - Availability toggle

### 3. Quote Submission

- Vendors receive move requests and can submit quotes
- They can:
  - View request details
  - Calculate pricing
  - Submit competitive quotes
  - Set terms and conditions

### 4. Order Management

- Once a user accepts a quote, vendors can:
  - Confirm the order
  - Assign riders
  - Track progress
  - Communicate with users
  - Handle any issues

### 5. Vendor Settings

- Vendors can manage their profile, service areas, and business settings
- They can also access help resources at `vendor/help`

### 6. Affiliate Program

- Vendors can participate in an affiliate program at `vendor/affiliate`
- This allows them to earn additional revenue by referring other vendors or customers

## Rider Flow

### 1. Rider Dashboard

- Riders access their work interface through `rider/dashboard`
- The dashboard shows:
  - Available orders they can accept
  - Active deliveries they're currently handling
  - Completed deliveries history
  - Online/offline status toggle

### 2. Order Acceptance

- Riders can view available orders and choose to accept or decline them
- The system considers rider location and availability when matching orders

### 3. Delivery Execution

- During delivery, riders:
  - Update order status in real-time
  - Share location data for tracking
  - Communicate with customers and vendors
  - Document delivery completion

### 4. Location Tracking

- The system tracks rider location to:
  - Provide real-time updates to users
  - Optimize delivery routes
  - Calculate accurate delivery times

## Order Lifecycle

1. **Creation**: User submits a move request
2. **Quote Collection**: System sends request to relevant vendors
3. **Vendor Selection**: User reviews quotes and selects a vendor
4. **Payment**: User makes payment (full or partial)
5. **Scheduling**: Vendor assigns riders and confirms schedule
6. **Execution**: Riders perform the pickup and delivery
7. **Completion**: Order is marked as complete
8. **Review**: User rates the service

## Technical Components

### API Endpoints

- `/api/orders` - Manage order creation and retrieval
- `/api/vendor/requests` - Handle vendor quote requests
- `/api/riders/location` - Update and track rider locations
- `/api/rider/update-status` - Update delivery status

### Data Storage

- The system uses JSON files for data storage:
  - `orders.json` - Stores order information
  - `vendors.json` - Stores vendor details
  - `pincodes.json` - Stores pincode data

### Key Features

- **Real-time Tracking**: Users can track their move in real-time
- **Quote Comparison**: Users can compare quotes from multiple vendors
- **Rating System**: Quality control through user ratings
- **Notification System**: Email and WhatsApp notifications via SendGrid and Twilio
- **Payment Integration**: Secure payments through Razorpay

## Integration Points

- **Razorpay**: For payment processing
- **SendGrid**: For email notifications
- **Twilio**: For WhatsApp notifications
- **Maps API**: For location tracking and route optimization

## User Experience Flow

1. User visits homepage
2. User submits move request
3. Vendors receive notification and submit quotes
4. User reviews quotes and selects vendor
5. User makes payment
6. Vendor assigns riders
7. Riders execute the move
8. User receives delivery confirmation
9. User rates the service

## Admin Flow

### 1. Admin Dashboard
- Administrators access a dedicated dashboard at `admin`
- They can monitor all platform activities
- Manage users, vendors, and riders
- Handle disputes and issues

### 2. System Management
- Configure system parameters
- Monitor performance metrics
- Manage service areas and pricing rules

## Enhanced Payment Flow

### 1. Payment Creation
- When a user accepts a quote, the system creates a payment order via `/api/payment/create-order`
- Payment details are securely stored and linked to the order

### 2. Payment Verification
- After payment attempt, the system verifies the transaction via `/api/payment/verify`
- Successful payments trigger order confirmation
- Failed payments prompt retry options

### 3. Refund Processing
- Users can request refunds under certain conditions
- Refund requests are processed via `/api/payment/refund`
- Vendors and admins can approve or reject refund requests

## Analytics and Reporting

### 1. Business Intelligence
- The platform collects and analyzes data on orders, vendors, and riders
- Performance metrics are available to administrators
- Vendors can access their own performance data

### 2. Market Analysis
- The system provides insights on popular routes, pricing trends, and service demand
- This helps vendors optimize their offerings

## Inventory Management

### 1. Vendor Inventory
- Vendors can manage their moving equipment inventory
- Track availability of trucks, packing materials, etc.
- Schedule resources efficiently

### 2. Resource Allocation
- The system helps vendors allocate appropriate resources to each move
- Prevents overbooking and resource conflicts

## Enhanced Review System

### 1. Multi-faceted Reviews
- Users can rate vendors on multiple criteria:
  - Timeliness
  - Care of belongings
  - Communication
  - Value for money

### 2. Vendor Reputation Management
- Vendors can respond to reviews
- System calculates and displays aggregate ratings
- High-performing vendors receive visibility benefits

## Quote Management System

### 1. Quote Request Distribution
- System intelligently distributes quote requests to relevant vendors
- Considers vendor capacity, service area, and specialization

### 2. Quote Comparison Tools
- Users can compare quotes side-by-side
- System highlights differences in pricing, services, and terms

### 3. Quote Negotiation
- Users can request modifications to quotes
- Vendors can adjust quotes based on user feedback

## Quality Assurance

### 1. Testing Framework
- The platform includes comprehensive testing infrastructure
- Ensures reliability of critical functions

### 2. Monitoring and Alerts
- System monitors for unusual patterns or service disruptions
- Alerts administrators to potential issues