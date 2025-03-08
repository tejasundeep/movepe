# Move Management System

A robust platform designed to streamline the process of organizing moves for both users and vendors. Built with Next.js and React-Bootstrap.

## Features

- User move request submission with pincode autocomplete
- Vendor selection and quote request system
- Real-time order status tracking
- Integrated payment processing with Razorpay
- Email and WhatsApp notifications via SendGrid and Twilio
- Vendor rating and review system

## Prerequisites

- Node.js 14.x or higher
- NPM 6.x or higher
- A SendGrid account for email notifications
- A Twilio account for WhatsApp notifications
- A Razorpay account for payment processing

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd move-management-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your configuration:
   ```
   NEXTAUTH_SECRET=your-nextauth-secret-key
   NEXTAUTH_URL=http://localhost:3000

   # Razorpay Configuration
   RAZORPAY_KEY_ID=your-razorpay-key-id
   RAZORPAY_KEY_SECRET=your-razorpay-key-secret

   # SendGrid Configuration
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=your-verified-sender@yourdomain.com

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_WHATSAPP_NUMBER=your-twilio-whatsapp-number
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/project-root
  /app
    /api            # API routes
    /order         # Order-related pages
    layout.js      # Root layout
    page.js        # Homepage
  /components      # React components
  /data           # JSON data files
  /lib            # Helper functions
  /styles         # Global styles
```

## API Endpoints

- `POST /api/orders` - Create a new move order
- `GET /api/orders/[orderId]` - Get order details
- `POST /api/orders/[orderId]/request-quotes` - Request quotes from vendors
- `GET /api/pincodes/search` - Search pincodes with autocomplete

## Data Storage

The system uses JSON files for data storage:
- `orders.json` - Stores order information
- `vendors.json` - Stores vendor details
- `pincodes.json` - Stores pincode data

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@yourdomain.com or create an issue in the repository. 