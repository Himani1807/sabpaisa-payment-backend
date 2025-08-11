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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
app.use('/api/payment', require('./routes/payment'));
app.use('/api/webhook', require('./routes/webhook'));

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

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