# SabPaisa Payment Backend

A Node.js Express backend for SabPaisa payment gateway integration with React e-commerce checkout.

## Features

- ✅ SabPaisa payment gateway integration
- ✅ UPI, Cards, Net Banking, Wallets support
- ✅ Secure payment data encryption
- ✅ SQLite database for transaction storage
- ✅ Webhook handling for payment confirmations
- ✅ CORS configuration for frontend integration

## Environment Variables

Create a `.env` file with:

```bash
NODE_ENV=production
PORT=5000
SABPAISA_CLIENT_CODE=your_client_code
SABPAISA_TRANS_USERNAME=your_username
SABPAISA_TRANS_PASSWORD=your_password
SABPAISA_AUTH_KEY=your_auth_key
SABPAISA_AUTH_IV=your_auth_iv
SABPAISA_TEST_URL=https://stage-securepay.sabpaisa.in/SabPaisa/sabPaisaInit?v=1
CALLBACK_URL=https://your-backend-url.com/api/payment/callback
DB_PATH=./database.sqlite
```

## API Endpoints

- `POST /api/payment/initiate` - Initiate payment
- `POST /api/payment/callback` - SabPaisa callback handler
- `GET /api/payment/status/:clientTxnId` - Get payment status
- `POST /api/webhook/sabpaisa` - Webhook endpoint

## Deployment

### Render
1. Connect this repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables

### Local Development
```bash
npm install
npm start
```

## Tech Stack

- Node.js + Express.js
- SQLite3 for database
- AES encryption for payment data
- CORS for cross-origin requests
- Helmet.js for security headers