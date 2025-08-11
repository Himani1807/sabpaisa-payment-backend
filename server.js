const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://192.168.29.35:5173',
    'http://192.168.29.35:5174',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/payment', require('./routes/payment'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/sabpaisa', require('./routes/sabpaisa-init'));

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'SabPaisa Payment Backend Running',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Direct SabPaisa init route (inline for immediate deployment)
app.post('/api/sabpaisa/init', (req, res) => {
  const crypto = require('crypto');
  
  try {
    // Extract data from request body
    const {
      amount,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod,
      upiId
    } = req.body;

    // Generate unique client transaction ID
    const clientTxnId = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Build the data string for SabPaisa
    let encData = `clientCode=${process.env.SAB_CLIENT_CODE}` +
      `&transUserName=${process.env.SAB_USERNAME}` +
      `&transUserPassword=${process.env.SAB_PASSWORD}` +
      `&clientTxnId=${clientTxnId}` +
      `&amount=${amount}` +
      `&payerName=${customerName}` +
      `&payerEmail=${customerEmail}` +
      `&payerMobile=${customerPhone}` +
      `&callbackUrl=${process.env.SAB_CALLBACK_URL}`;

    // Add payment method specific parameters
    if (paymentMethod === 'upi' && upiId) {
      encData += `&modeTransfer=UPI_MODE_TRANSFER` +
        `&seamlessType=S2S` +
        `&payerVpa=${upiId}`;
    }

    console.log('Building encData:', encData.substring(0, 100) + '...');

    // Encrypt the data using AES-128-CBC
    const cipher = crypto.createCipher('aes-128-cbc', process.env.SAB_AUTH_KEY);
    let encrypted = cipher.update(encData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    console.log('Encrypted data length:', encrypted.length);

    // Return the encrypted data and other required parameters
    res.json({
      success: true,
      data: {
        encData: encrypted,
        clientCode: process.env.SAB_CLIENT_CODE,
        sabpaisaUrl: process.env.SAB_TEST_URL || 'https://stage-securepay.sabpaisa.in/SabPaisa/sabPaisaInit?v=1',
        clientTxnId
      }
    });

  } catch (error) {
    console.error('SabPaisa init error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SabPaisa Backend Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});