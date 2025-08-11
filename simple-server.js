const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://192.168.29.35:5173',
    'http://192.168.29.35:5174',
    process.env.FRONTEND_URL,
    // Allow Render and other deployment platforms
    /https:\/\/.*\.onrender\.com$/,
    /https:\/\/.*\.vercel\.app$/
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.includes('/api/sabpaisa/callback')) {
    console.log(`📨 ${req.method} ${req.path}`, {
      contentType: req.headers['content-type'],
      bodyKeys: Object.keys(req.body || {}),
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'SabPaisa Payment Backend Running',
    status: 'OK',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      payment: '/api/payment/initiate',
      callback: '/api/sabpaisa/callback',
      status: '/api/payment/status/:clientTxnId'
    }
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

// SabPaisa callback route (immediate response)
app.post('/api/sabpaisa/callback', (req, res) => {
  console.log('🔄 SabPaisa callback received:', {
    timestamp: new Date().toISOString(),
    encResponse: req.body.encResponse ? 'Present' : 'Missing',
    bodySize: JSON.stringify(req.body).length
  });
  
  // Respond immediately to SabPaisa
  res.status(200).send('OK');
  
  // Process in background (don't block response)
  if (req.body.encResponse) {
    setImmediate(() => {
      try {
        // Import webhook controller and process
        const WebhookController = require('./controllers/webhookController');
        WebhookController.handleSabPaisaWebhook(req, { 
          json: () => {}, 
          status: () => ({ json: () => {} }) 
        });
      } catch (error) {
        console.error('⚠️ Background callback processing error:', error);
      }
    });
  }
});

// Import routes
app.use('/api/payment', require('./routes/payment'));
app.use('/api/webhook', require('./routes/webhook'));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple Backend Server running on port ${PORT}`);
  console.log(`📱 Network access: http://192.168.29.35:${PORT}`);
  
  // Keep alive interval
  setInterval(() => {
    // console.log('Server alive at', new Date().toISOString());
  }, 30000);
});

// Keep the process running
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit, just log
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  server.close(() => {
    console.log('Process terminated');
  });
});