# Testing Documentation for MovePE Rider System

This document provides information about the testing tools and utilities available for testing the MovePE rider system.

## Test Scripts

### 1. Session Testing

- **File**: `scripts/test-session.js`
- **Purpose**: Verifies that user sessions are working correctly, including role assignment.
- **Usage**: `node scripts/test-session.js`
- **What it tests**: 
  - User authentication
  - Password verification
  - Session token creation
  - Role assignment in the session

### 2. Rider Authentication Testing

- **File**: `scripts/test-rider-auth.js`
- **Purpose**: Verifies rider authentication and authorization.
- **Usage**: `node scripts/test-rider-auth.js [email] [password]`
- **Example**: `node scripts/test-rider-auth.js lucky@gmail.com password123`
- **What it tests**:
  - User authentication
  - Password verification
  - Role verification (must be 'rider')
  - Session token creation
  - Rider record existence
  - Rider status verification

### 3. Rider API Testing

- **File**: `scripts/test-rider-api.js`
- **Purpose**: Tests all rider API endpoints.
- **Usage**: `node scripts/test-rider-api.js`
- **What it tests**: All rider API endpoints, including:
  - GET /rider/available-orders
  - GET /rider/active-deliveries
  - GET /rider/completed-deliveries
  - GET /rider/profile
  - POST /rider/update-location
  - POST /rider/update-status
  - POST /rider/accept-order
  - POST /rider/decline-order

## Utility Scripts

### 1. Update User Password

- **File**: `scripts/update-user-password.js`
- **Purpose**: Updates a user's password.
- **Usage**: `node scripts/update-user-password.js [email] [new_password]`
- **Example**: `node scripts/update-user-password.js lucky@gmail.com password123`

### 2. Update Rider Status

- **File**: `scripts/update-rider-status.js`
- **Purpose**: Updates a rider's status.
- **Usage**: `node scripts/update-rider-status.js [email] [status]`
- **Example**: `node scripts/update-rider-status.js lucky@gmail.com approved`
- **Valid statuses**: 'pending', 'approved', 'rejected', 'available', 'unavailable', 'delivering'

## Test Pages

> **Note**: Test pages have been removed from the main navigation to reduce clutter. You can access them directly by entering the URLs in your browser.

### 1. Session Test Page

- **URL**: `/test-session`
- **Purpose**: Displays session information from both client-side and server-side.
- **Features**:
  - Shows user details from the session
  - Displays authentication status
  - Provides sign-in/sign-out functionality
  - Shows session expiration time

### 2. Rider Authentication Test Page

- **URL**: `/test-rider-auth`
- **Purpose**: Tests rider authentication and authorization.
- **Features**:
  - Shows session information
  - Displays rider authentication status
  - Shows rider details including status
  - Provides sign-in/sign-out functionality

### 3. Test Rider Page

- **URL**: `/test-rider`
- **Purpose**: Provides a test interface for rider functionality.

## API Test Endpoints

### 1. Session Test API

- **Endpoint**: `/api/test/session`
- **Method**: GET
- **Purpose**: Returns session information from the server.
- **Response**: JSON object containing session details or error message.

### 2. Rider Authentication Test API

- **Endpoint**: `/api/test/rider-auth`
- **Method**: GET
- **Purpose**: Tests rider authentication and authorization.
- **Response**: JSON object containing:
  - Authentication status
  - Authorization status
  - Rider role verification
  - Rider approval status
  - Session details
  - Rider details

## How to Use These Tools

1. **Basic Session Testing**:
   ```
   node scripts/test-session.js
   ```

2. **Update a User's Password**:
   ```
   node scripts/update-user-password.js lucky@gmail.com new_password
   ```

3. **Update a Rider's Status**:
   ```
   node scripts/update-rider-status.js lucky@gmail.com approved
   ```

4. **Test Rider Authentication**:
   ```
   node scripts/test-rider-auth.js
   ```

5. **Test All Rider API Endpoints**:
   ```
   node scripts/test-rider-api.js
   ```

6. **Web-based Testing**:
   - Navigate to `/test-session` to test session functionality
   - Navigate to `/test-rider-auth` to test rider authentication
   - Navigate to `/test-rider` to test rider functionality

## Troubleshooting

If you encounter issues with authentication or authorization:

1. Verify that the user exists in `data/users.json`
2. Ensure the user has the correct role (should be 'rider' for rider tests)
3. Check that the rider record exists in `data/riders.json`
4. Verify the rider status (should be 'approved' for most operations)
5. Check that the password is correct using the test-session script
6. Ensure the JWT secret matches between the auth system and test scripts 