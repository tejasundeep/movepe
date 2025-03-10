# Project Initial Setup

The project is a Next.js application that provides a platform for managing moves and deliveries. It connects customers, vendors, and riders in a seamless workflow.

# Project Environment File

The environment file (.env) contains configuration for:
- NextAuth authentication
- Google OAuth
- Razorpay payment integration
- SendGrid email service
- Twilio messaging service
- Database connection (Prisma with SQLite)

# Project Directory Structure

- `/app`: Next.js application routes and components
- `/components`: Reusable UI components
- `/lib`: Utility functions and services
- `/prisma`: Prisma schema and migrations
- `/data`: JSON data files (legacy, now migrated to Prisma)
- `/scripts`: Utility scripts for data management
- `/public`: Static assets

# Project Frontend

The frontend is built with Next.js and React, using React Bootstrap for UI components. It provides interfaces for:
- Customer dashboard for creating and tracking orders
- Vendor dashboard for managing service requests
- Rider dashboard for handling deliveries
- Admin dashboard for platform management
- Affiliate dashboard for managing referrals and earnings
- Inventory management dashboard for tracking and managing inventory items
- Analytics dashboard with business intelligence visualizations and performance metrics
- Support and dispute resolution center for customer assistance
- User profile management for personal information and preferences
- Help and documentation center with guides and tutorials

# Project Backend

The backend is implemented using Next.js API routes, with:
- RESTful API endpoints for all operations
- Authentication via NextAuth.js
- Data storage with Prisma ORM
- Payment processing with Razorpay
- Notifications via SendGrid (email) and Twilio (WhatsApp)

# Project Database Schema

The database schema is managed by Prisma and includes the following models:
- User: Customer, vendor, rider, and admin accounts
- Vendor: Vendor profiles linked to user accounts
- Rider: Rider profiles linked to user accounts
- Order: Move and delivery orders
- OrderStatusHistory: History of order status changes
- Quote: Vendor quotes for orders
- Review: Customer reviews of vendors and riders
- ReviewCriteria: Criteria-based ratings for reviews
- ReviewResponse: Vendor responses to reviews
- Payment: Payment records for orders
- Notification: System notifications for users
- Pincode: Geographic location data
- Setting: System configuration settings
- NotificationTemplate: Templates for system notifications
- Inventory: Vendor inventory management
- AnalyticsEvent: System analytics events
- AuditLog: System audit logs
- ApiMetric: API performance metrics
- Discount: Promotional discounts
- NotificationTemplate: Templates for system notifications
- QuoteTemplate: Templates for vendor quotes
- Affiliate: Affiliate accounts for users
- Referral: Referrals made by affiliates
- AffiliateEarning: Earnings for affiliates

# Project API Routes

API routes are organized by resource type:
- `/api/auth`: Authentication endpoints
- `/api/users`: User management
- `/api/vendors`: Vendor management
- `/api/riders`: Rider management
- `/api/orders`: Order management
- `/api/payment`: Payment processing
- `/api/pincodes`: Location data
- `/api/settings`: System settings
- `/api/notifications`: Notification management
- `/api/analytics`: Analytics and reporting
  - `/api/analytics`: Get business overview metrics and track events
  - `/api/analytics/vendor`: Vendor-specific analytics 
  - `/api/analytics/operational-bottlenecks`: Identify system bottlenecks
  - `/api/analytics/notifications`: Notification performance tracking
- `/api/inventory`: Inventory management
  - `/api/inventory`: Get and update vendor inventory
  - `/api/inventory/allocate`: Allocate inventory items to orders
- `/api/reviews`: Review management with criteria and responses
- `/api/dashboard`: Dashboard data
- `/api/socket`: WebSocket connection management
- `/api/quotes`: Quote management
- `/api/affiliate`: Affiliate and referral management

# Project Design Choices

- Next.js for server-side rendering and API routes
- Prisma for type-safe database access
- SQLite for local development (can be switched to PostgreSQL for production)
- React Bootstrap for responsive UI components
- NextAuth.js for authentication
- Razorpay for payment processing
- SendGrid and Twilio for notifications
- WebSocket for real-time updates

# Project Dependencies

Key dependencies include:
- next: Framework for server-rendered React applications
- react: UI library
- prisma: ORM for database access
- @prisma/client: Prisma client for database operations
- next-auth: Authentication for Next.js
- react-bootstrap: UI component library
- razorpay: Payment gateway integration
- @sendgrid/mail: Email service
- twilio: WhatsApp and SMS messaging
- uuid: Unique ID generation
- bcryptjs: Password hashing
- react-copy-to-clipboard: Clipboard functionality for sharing referral links

# Project Tools

- Prisma Studio: Database management UI
- Next.js Dev Server: Local development environment
- Migration Scripts: Data migration between JSON and Prisma

# Project User Requirements

The platform serves four main user types:
1. Customers: People who need moving or delivery services
2. Vendors: Companies that provide moving services
3. Riders: Individuals who perform deliveries
4. Admins: Platform managers who oversee operations

# Project Context

The platform facilitates the entire process of organizing moves and deliveries, from request creation to service completion, including:
- Order creation and management
- Vendor selection and quoting
- Payment processing
- Delivery tracking
- Rating and feedback
- Affiliate and referral program

# Project SEO Plan

- Semantic HTML structure
- Next.js metadata for SEO optimization
- Sitemap generation
- Structured data for rich search results
- Mobile-friendly design for better rankings

# Project Plan

1. Migrate from JSON file storage to Prisma database
2. Implement comprehensive API endpoints
3. Create user interfaces for all user types
4. Integrate payment processing
5. Set up notification system
6. Implement analytics and reporting
7. Develop real-time tracking system
8. Create affiliate and referral system
9. Enhance review and feedback system
10. Deploy to production

# Task Progress

[✓] Set up Prisma schema
[✓] Create database migrations
[✓] Migrate data from JSON files to Prisma
[✓] Update storage utilities to use Prisma
[✓] Test database operations
[✓] Update user and vendor services to use Prisma
[✓] Fix vendor earnings API route to use Prisma
[✓] Update Order Service core methods to use Prisma
[✓] Update remaining Order Service methods to use Prisma
[✓] Update Rider Service to use Prisma
[✓] Update Payment Service to use Prisma
[✓] Update Review Service to use Prisma
[✓] Update Notification Service to use Prisma
[✓] Update Inventory Service to use Prisma
[✓] Update Analytics Service to use Prisma
[✓] Update Audit Service to use Prisma
[✓] Update System Health Service to use Prisma
[✓] Update Operational Analytics Service to use Prisma
[✓] Update Vendor API Routes to use Prisma
[✓] Update Rider API Routes to use Prisma
[✓] Update Order API Routes to use Prisma
[✓] Update Review API Routes to use Prisma
[✓] Update Dashboard API Routes to use Prisma
[✓] Update Admin API Routes to use Prisma
[✓] Update Analytics API Routes to use Prisma
[✓] Update Inventory API Routes to use Prisma
[✓] Update all API routes to use new storage layer
[✓] Fix inconsistencies in rider API endpoints (rider.id vs rider.riderId)
[✓] Fix order service methods to use Prisma instead of JSON file storage
[✓] Implement real-time tracking system
  [✓] Create location tracking API for riders
  [✓] Develop real-time order status updates
  [✓] Implement WebSocket connection for live updates
  [✓] Build tracking UI for customers
[✓] Enhance notification system
  [✓] Implement email notifications via SendGrid
  [✓] Set up WhatsApp notifications via Twilio
  [✓] Create notification templates
  [✓] Build notification preferences UI
[✓] Complete quote management system
  [✓] Enhance quote comparison tools
  [✓] Implement quote negotiation features
  [✓] Build quote templates for vendors
[✓] Develop affiliate and referral system
  [✓] Create referral code generation
  [✓] Implement referral tracking
  [✓] Build affiliate dashboard for vendors
[✓] Enhance review system
  [✓] Implement multi-criteria reviews
  [✓] Build vendor response functionality
  [✓] Create review analytics
[✓] Complete inventory management
  [✓] Enhance vendor inventory tracking
  [✓] Implement resource allocation system
  [✓] Build inventory analytics
[✓] Finalize analytics and reporting
  [✓] Implement business intelligence dashboard
  [✓] Create market analysis reports
  [✓] Build performance metrics visualization
[✓] Create essential user interface pages
  [✓] Admin dashboard for platform management
    [✓] Dashboard overview
    [✓] User management
    [✓] Order management
    [✓] Rider management
    [✓] Platform settings
  [✓] Support and dispute resolution center
  [✓] User profile management interface
  [✓] Help and documentation center
[+] Deploy to production
  [+] Migrate from SQLite to PostgreSQL
  [+] Set up production environment
  [+] Configure CI/CD pipeline
  [+] Implement monitoring and alerting

# Bug Fixes

[✓] Fixed rider API endpoints to use correct rider ID (rider.id instead of rider.riderId)
  [✓] Fixed rider/update-location API endpoint
  [✓] Fixed rider/decline-order API endpoint
  [✓] Fixed rider/update-status API endpoint
[✓] Updated order service methods to use Prisma instead of JSON file storage
  [✓] Fixed getAvailableOrdersForRider method
    [✓] Corrected Prisma query syntax for filtering by service areas
    [✓] Removed NOT filter with declinedBy and implemented in-memory filtering
  [✓] Fixed getActiveDeliveriesForRider method
  [✓] Fixed getCompletedDeliveriesForRider method
[✓] Updated Prisma schema to add missing fields
  [✓] Added currentLocation field to Rider model
  [✓] Added declinedBy field to Order model
[✓] Fixed rider service methods to work with updated schema
  [✓] Updated updateRiderLocation to use Prisma directly
  [✓] Updated recordOrderDecline to use the declinedBy field
[✓] Updated sendStatusChangeNotifications method to use Prisma instead of JSON file storage
[✓] Updated isInventoryVerificationRequired method to use Prisma instead of JSON file storage
[✓] Fixed favicon.ico 500 error
  [✓] Added base64-encoded favicon directly in layout.js metadata
  [✓] Removed unnecessary head.js, favicon.js, and icon.js files
  [✓] Simplified layout structure to avoid duplicate head elements
[✓] Fixed webpack module loading error
  [✓] Moved Bootstrap CSS import to client-side component
  [✓] Used dynamic import with useEffect for Bootstrap CSS
  [✓] Removed direct import from server component (layout.js)
[✓] Fixed API Integration Issues
  [✓] Fixed OrderService's getUserOrders method to properly use Prisma

# Project Error Handling

- Comprehensive error handling in API routes
- Client-side form validation
- Server-side data validation
- Graceful error recovery
- Detailed error logging

# Project Testing

- Unit tests for utility functions
- Integration tests for API routes
- End-to-end tests for critical user flows
- Manual testing for UI components

# Project Debugging

- Detailed logging throughout the application
- Error tracking and reporting
- Development tools for database inspection

# Project Security

- Authentication via NextAuth.js
- Password hashing with bcrypt
- CSRF protection
- Input validation
- Rate limiting for API routes

# Optimization

- Server-side rendering for initial page load
- Client-side navigation for fast page transitions
- Image optimization
- Code splitting and lazy loading
- Database query optimization

# Code Review

- Consistent coding style
- Type safety with TypeScript
- Comprehensive documentation
- Regular code reviews
- Performance profiling

# Accessibility

- Semantic HTML
- ARIA attributes
- Keyboard navigation
- Screen reader compatibility
- Color contrast compliance

# Best Practices

- RESTful API design
- Component-based architecture
- Separation of concerns
- Responsive design
- Progressive enhancement

# Project Reusables

- UI components
- Form validation hooks
- API client utilities
- Authentication helpers
- Notification templates
- Quote templates
- Affiliate dashboard components
- Review components with analytics

# Project Learnings

- Prisma provides a more robust and type-safe database solution compared to JSON files
- Next.js API routes offer a convenient way to build a full-stack application
- React Bootstrap simplifies responsive UI development
- NextAuth.js streamlines authentication implementation
- WebSocket integration enables real-time updates for better user experience
- SendGrid and Twilio provide reliable notification delivery across multiple channels
- Quote templates improve vendor efficiency and consistency
- Affiliate programs can drive user acquisition and engagement
- Multi-criteria reviews provide more detailed feedback for vendors and riders

# Project Scratchpad

- Consider adding real-time updates with WebSockets (✓ Implemented)
- Explore adding a mobile app with React Native
- Investigate using PostgreSQL for production deployment
- Implement advanced analytics for affiliate performance
- Add AI-powered review sentiment analysis


