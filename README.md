# Move Management Platform

A comprehensive platform for managing moves and deliveries, connecting customers, vendors, and riders in a seamless workflow.

## Overview

This platform facilitates the entire process of organizing moves and deliveries, from request creation to service completion, including:
- Order creation and management
- Vendor selection and quoting
- Payment processing
- Delivery tracking
- Rating and feedback

## Key Features

- **Customer Dashboard**: Create and track orders, select vendors, and provide reviews
- **Vendor Dashboard**: Manage service requests, submit quotes, and track earnings
- **Rider Dashboard**: Handle deliveries and update delivery status
- **Admin Dashboard**: Oversee platform operations and analytics

## Technology Stack

- **Frontend**: Next.js, React, React Bootstrap
- **Backend**: Next.js API Routes
- **Database**: Prisma ORM with SQLite (development) / PostgreSQL (production)
- **Authentication**: NextAuth.js
- **Payment Processing**: Razorpay
- **Notifications**: SendGrid (email), Twilio (SMS/WhatsApp)

## Recent Migration to Prisma

We recently completed a migration from JSON file storage to Prisma ORM. This migration has significantly improved the application's:

- **Performance**: Faster queries and reduced latency
- **Scalability**: Better support for concurrent users and larger datasets
- **Maintainability**: Type safety and improved code organization
- **Security**: Enhanced data validation and access control

### Migration Documentation

For more information about the migration, please refer to the following documents:

- [Migration Plan](./MIGRATION_PLAN.md): The plan that guided the migration process
- [Migration Summary](./MIGRATION_SUMMARY.md): A summary of the changes and improvements
- [Testing Plan](./TESTING_PLAN.md): The approach for testing the migrated application
- [Deployment Plan](./DEPLOYMENT_PLAN.md): The strategy for deploying to production
- [Database Optimization](./DATABASE_OPTIMIZATION.md): Best practices for optimizing database performance

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- SQLite (development) or PostgreSQL (production)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-org/movepe.git
   cd movepe
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration.

4. Run database migrations:
   ```
   npx prisma migrate dev
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Management

- Use Prisma Studio to manage the database:
  ```
  npx prisma studio
  ```

## Project Structure

- `/app`: Next.js application routes and components
- `/components`: Reusable UI components
- `/lib`: Utility functions and services
- `/prisma`: Prisma schema and migrations
- `/public`: Static assets

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Next.js team for the amazing framework
- Prisma team for the excellent ORM
- React Bootstrap for the UI components
- All contributors to this project 