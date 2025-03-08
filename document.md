# Move Management System – Complete Development Documentation

## Table of Contents
1. [Overview](#overview)
2. [Features and User Roles](#features-and-user-roles)
3. [Technology Stack](#technology-stack)
4. [Architecture and Project Structure](#architecture-and-project-structure)
5. [Process Flow and Use Cases](#process-flow-and-use-cases)
   - [Step 1: Order Initiation and Vendor Selection](#step-1-order-initiation-and-vendor-selection)
   - [Step 2: Vendor Interaction and Quote Submission](#step-2-vendor-interaction-and-quote-submission)
   - [Step 3: Order Acceptance, Payment, and Move Scheduling](#step-3-order-acceptance-payment-and-move-scheduling)
   - [Step 4: Move Completion and Vendor Payment Finalization](#step-4-move-completion-and-vendor-payment-finalization)
6. [User Journey Map](#user-journey-map)
7. [Vendor Journey Map](#vendor-journey-map)
8. [Edge Cases and Solutions](#edge-cases-and-solutions)
9. [API Endpoints](#api-endpoints)
10. [Data Models (JSON Database)](#data-models-json-database)
11. [Authentication and Authorization](#authentication-and-authorization)
12. [Error Handling, Logging, and Notifications](#error-handling-logging-and-notifications)
13. [Integration with Third-Party Services](#integration-with-third-party-services)
14. [Environment Setup and Running in Development](#environment-setup-and-running-in-development)
15. [Future Improvements and Scalability](#future-improvements-and-scalability)

---

## 1. Overview
The Move Management System is a robust platform designed to streamline the process of organizing moves for both users and vendors. Users can submit move details, select vendors based on ratings and reviews, request quotes, schedule moves collaboratively, and complete payments—all within a single interface. Vendors can manage move requests, submit quotes, coordinate schedules, track payments, and monitor performance metrics. The system uses JSON files (`orders.json`, `vendors.json`, `pincodes.json`) as its database to store and manage data, ensuring simplicity during development while keeping scalability in mind. No typescript, tailwind css should be used in this project.

Payments are processed via Razorpay (default currency INR), and notifications are delivered through SendGrid (email) and Twilio (WhatsApp). The documentation ensures clarity, completeness, and coverage of all critical aspects of the system.

---

## 2. Features and User Roles

### User Features
- **Move Details Form:**  
  - Users input pickup and destination pincodes, move size, and preferred move date.
  - **Autocomplete:** Typing a pincode triggers suggestions from `pincodes.json` (e.g., "New Delhi, Delhi (110001)").
- **Order Management:**  
  - Submitting the form generates an order with a unique ID, an "Initiated" status, and a URL containing the order ID. Users are then redirected to an order details page, which displays vendors along with their base pricing, ratings, and reviews.
  - **Account Management and Order History:** Users can view past orders by clicking the Orders tab in the dashboard. Selecting an order redirects them to its details page which was created during the order initiation using the assigned order ID.
  - Once payment is made to a vendor, the order status updates to "Paid," displaying only move tracking details on the order page removing other vendor estimates and related information.
- **Vendor Request and Authentication:**  
  - To request vendor for estimate user need to Login (via Next-Auth).
  - Users send requests to multiple vendors, updating the order status to "Requests Sent" and saving vendor details for persistence after a page refresh.
- **Quote Review:**  
  - Users compare vendor quotes in the same order page that was created during the order initiation.
  - Quotes include fixed pricing based on move details.
- **Payment and Post-Payment Features:**  
  - If use is okay with one of the vendor estimate, users pay via Razorpay (INR).
  - **Scheduling:** Move will be scheduled as user request.
  - **Rescheduling:** Users can request changes, subject to vendor approval.
  - **Notifications:** 24-hour pre-move reminders are sent via email and WhatsApp.
- **Move Completion:**  
  - Post-move, the driver marks the job complete, and users confirm via an OTP (sent via email/WhatsApp), updating the status to "completed."
- **Post-Move Feedback & Support:**  
  - Users rate vendors and provide feedback.
  - Options for customer support or dispute initiation are available in the dashboard.

### Vendor Features
- **Dashboard Access:**  
  - Vendors log in to manage requests, quotes, schedules, and payments.
- **Quote Management:**  
  - Vendors submit fixed quotes within 24 hours based on move details.
  - **Quote Templates:** Vendors can save and reuse quote templates for common move types.
- **Post-Payment Features:**
  - **Scheduling Coordination:** Calendar view for proposing and confirming time slots.
  - **Vendor Availability Management:** Set availability status (e.g., "available," "busy").
- **Payment Handling:**  
  - Vendors track payment statuses and confirm fund receipt post-move.
- **Notification Integration:**  
  - Email and optional WhatsApp notifications alert vendors to new requests, scheduling updates, and payments.
- **Vendor Profile & Performance:**  
  - Registration includes detailed profile setup.
  - Metrics like ratings, completed moves, and feedback are viewable.
  - **Performance Analytics:** Vendors can view acceptance rates, response times, and satisfaction scores.
- **Dispute Resolution & Support:**  
  - A support module facilitates issue resolution and user communication.

---

## 3. Technology Stack
- **Framework:** Next.js (frontend and backend) – [Next.js Documentation](https://nextjs.org/docs)
- **UI Framework:** React-Bootstrap
- **Icons:** React-Icons (Bootstrap icons)
- **Authentication:** Next-Auth
- **Database:** JSON files (`orders.json`, `vendors.json`, `pincodes.json`)
- **Payment Gateway:** Razorpay (INR) – [Razorpay Integration](https://docs.razorpay.com/)
- **Notifications:** SendGrid (email), Twilio (WhatsApp)
- **Environment Management:** `.env.local` for API keys and configuration
- **Additional Tools:**  
  - **WebSockets:** For real-time notifications (planned for future improvements)

---

## 4. Architecture and Project Structure

### Project Structure
```
/project-root
  /pages
    /api
       - orders.js          // Order-related API routes
       - vendors.js         // Vendor-related API routes
       - auth.js            // Next-Auth setup
    - index.js             // Homepage with MoveForm
    - order.js             // Order details page (vendor list, ratings, pricing)
    - dashboard.js         // User and vendor dashboard
  /components
    - MoveForm.js          // Move details form with autocomplete
    - VendorList.js        // Vendor display with ratings and pricing
    - QuoteForm.js         // Quote submission/update form
    - ScheduleForm.js      // Collaborative scheduling form
    - Notification.js      // In-app notification display
    - Profile.js           // User and vendor profile management
  /data
    - pincodes.json        // Pincode data
    - orders.json          // Order data
    - vendors.json         // Vendor data
  /styles
    - globals.css          // Global styles
  next.config.js
  package.json
  .env.local             // Environment variables (e.g., Razorpay keys)
```
- **Pages:** Route-based components and API endpoints.
- **Components:** Reusable UI elements, including profile management.
- **Data:** JSON files serve as the database for storing orders, vendors, and pincodes.
- **API Routes:** Serverless backend logic via Next.js.

---

## 5. Process Flow and Use Cases

### Step 1: Order Initiation and Vendor Selection
- **User Flow:**
  1. Users complete the MoveForm on `index.js` with pickup/destination pincodes, move size, and date.
  2. **Autocomplete:** Suggestions from `pincodes.json` enhance pincode entry.
  3. Submission creates an order ("Initiated") in `orders.json`, redirecting to `order.js` with a vendor list (base pricing, ratings, reviews).
  4. **Edge Case:** If the user closes the website mid-process, their progress is saved, and they can resume later via the dashboard.

### Step 2: Vendor Interaction and Quote Submission
- **User Authentication:** Login via Next-Auth is required.
- **Vendor Requests:**
  1. Users select vendors and send requests, updating the status to "requests sent" in `orders.json`.
- **Vendor Actions:**
  - Vendors view requests on `dashboard.js` and submit quotes via QuoteForm, updating `vendors.json`.
  - **Edge Case:** If no quotes are received within 24 hours, users are notified to adjust details or request more vendors.
- **Vendor Availability:** Vendors can set their availability status in `vendors.json` to control request inflow.

### Step 3: Order Acceptance, Payment, and Move Scheduling
- **Order Acceptance and Payment:**
  1. Users review and accept a quote based on the provided price and vendor ratings, updating the status to "accepted" in `orders.json`.
  2. Payment via Razorpay (INR) changes the status to "paid."
  3. **Edge Case:** If payment fails, users are notified to retry within 24 hours.
- **Collaborative Scheduling:**
  1. Users and vendors use ScheduleForm to propose and confirm scheduling, saved in `orders.json`.
  2. Details are finalized, and confirmation notifications are sent.
  3. **Edge Case:** Scheduling conflicts are detected, and alternative slots are proposed.

### Step 4: Move Completion and Vendor Payment Finalization
- **Move Completion:**
  1. The driver marks the job complete in `orders.json`.
  2. Users confirm via OTP (email/WhatsApp), updating the status to "completed."
  3. **Edge Case:** If OTP is not received, users can request a resend or use an alternative method.
- **Payment Settlement:**
  1. The platform retains a 20% fee, releasing 80% to the vendor post-verification, tracked in `vendors.json`.
  2. Vendors confirm payment receipt.
- **Feedback & Support:**
  1. Users rate vendors and provide feedback, stored in `orders.json` and `vendors.json`.
  2. Both parties can access support or file disputes via the dashboard.

---

## 6. User Journey Map

### Pre-Move
- **Discovery:** Users find the platform via marketing or referrals.
- **Onboarding:** Sign-up, email/phone verification, and tutorial.
- **Engagement:** Interact with MoveForm and explore vendors.
- **User Profile Management:** Update contact details, notification preferences, and payment methods in the dashboard.
- **Multi-Currency Awareness:** Disclaimer for international users about INR payments.

### During Move Process
- **Order Creation:** Submit move details with autocomplete.
- **Vendor Selection:** Review ratings, send requests, and communicate.
- **Quote Review:** Compare quotes using a side-by-side tool and negotiate.
- **Payment & Scheduling:** Pay via Razorpay and schedule collaboratively.
- **Updates:** Receive notifications via email/WhatsApp.
- **Account Management and Order History:** View past orders, vendor requests, and quotes in the dashboard.

### Post-Move
- **Completion:** Confirm via OTP.
- **Feedback:** Rate vendor and provide comments.
- **Support:** Access customer service or initiate disputes.
- **History:** View past moves in the dashboard.
- **Feedback Loop:** Provide ongoing feedback for platform improvement.

---

## 7. Vendor Journey Map

### Pre-Engagement
- **Onboarding:** Register, submit credentials, and set up a detailed profile in `vendors.json`.
- **Familiarization:** Explore dashboard and tutorials.
- **Vendor Profile Customization:** Add service specialties and experience.

### Active Engagement
- **Requests:** Receive and review move requests from `orders.json`.
- **Quotes:** Submit/update quotes using templates and communicate with users, stored in `vendors.json`.
- **Scheduling:** Propose time slots and finalize collaboratively in `orders.json`.
- **Vendor Availability Management:** Set availability status in `vendors.json`.
- **Automated Reminders:** Receive reminders for deadlines and updates.

### Post-Move
- **Completion & Payment:** Confirm job and track funds in `vendors.json`.
- **Analytics:** View performance metrics like acceptance rates and response times in the dashboard.
- **Support:** Resolve disputes via support tools.
- **Engagement:** Stay updated on new requests.

---

## 8. Edge Cases and Solutions

To ensure robustness, the system handles the following edge cases:
1. **User Closes Website Mid-Process:**  
   - **Solution:** Save progress automatically (e.g., partially filled MoveForm, selected vendors) in `orders.json` so users can resume later via the dashboard.  
   - **Notification:** Send a reminder email/WhatsApp (e.g., "Complete your move request for Order #123!").  
   - **Example:** A user selects vendors, closes the site, and later resumes to accept a quote.

2. **Vendor Does Not Respond:**  
   - **Solution:** If no quote is received within 24 hours, notify the user and suggest alternative vendors or extend the deadline.  
   - **Fallback:** Automatically reassign the request to other available vendors based on ratings and proximity from `vendors.json`.  
   - **Example:** Vendor A misses the deadline, and the system suggests Vendor B and C.

3. **Scheduling Conflicts:**  
   - **Solution:** Detect conflicts with existing commitments in `orders.json` and propose alternative time slots via ScheduleForm.  
   - **Notification:** Alert both parties to resolve collaboratively.  
   - **Example:** A vendor is booked at 10 AM, so the system suggests 2 PM instead.

4. **Payment Failures:**  
   - **Solution:** If Razorpay payment fails, notify the user instantly, offer retry options, or suggest alternative methods (e.g., saved card, UPI).  
   - **Grace Period:** Allow 24 hours to retry before canceling the order in `orders.json`.  
   - **Example:** A user's card is declined, and they retry with a different method.

5. **OTP Verification Issues:**  
   - **Solution:** Provide options to resend OTP via email/WhatsApp or use an alternative method (e.g., security question).  
   - **Timeout:** Extend OTP validity to 10 minutes if not received.  
   - **Example:** A user doesn't receive the OTP due to a network issue and requests a resend.

6. **Vendor Cancellation Post-Acceptance:**  
   - **Solution:** Notify the user immediately, offer a replacement vendor from the original quote pool in `vendors.json`, or allow rescheduling.  
   - **Compensation:** Apply a penalty to the vendor (e.g., reduced rating in `vendors.json`).  
   - **Example:** Vendor B cancels, and the system suggests Vendor C with a similar quote.

7. **User Changes Mind After Accepting Quote:**  
   - **Solution:** Allow cancellations within a 12-hour grace period (subject to a small fee or vendor approval) and refund via Razorpay, updating `orders.json`.  
   - **Notification:** Inform the vendor of the change.  
   - **Example:** A user accepts a $500 quote but cancels within 6 hours for a better option.

8. **Data Privacy and Security Breaches:**  
   - **Solution:** Ensure GDPR/CCPA compliance with encrypted data storage in JSON files, user consent for data use, and options to delete accounts from `orders.json` and `vendors.json`.  
   - **Audit:** Regularly test for vulnerabilities.  
   - **Example:** A user requests data deletion after completing a move.

---

## 9. API Endpoints

### Orders API
- **`POST /api/orders`**  
  - Create order in `orders.json`.  
  - **Input:** Move details (pickupPincode, destinationPincode, moveSize, moveDate).  
  - **Output:** Order ID, "Initiated."
- **`GET /api/orders/[orderId]`**  
  - Fetch order details (vendors, ratings, status) from `orders.json`.
- **`POST /api/orders/[orderId]/request`**  
  - Send vendor requests, updating `orders.json`.  
  - **Input:** Vendor IDs.  
  - **Action:** Status to "requests sent."
- **`