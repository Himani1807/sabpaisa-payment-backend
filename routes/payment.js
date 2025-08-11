const express = require('express');
const { body } = require('express-validator');
const PaymentController = require('../controllers/paymentController');

const router = express.Router();

// Validation middleware
const paymentValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('customerName').trim().isLength({ min: 2 }).withMessage('Customer name is required'),
  body('customerEmail').isEmail().withMessage('Valid email is required'),
  body('customerMobile').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian mobile number is required')
];

// Routes
router.post('/initiate', paymentValidation, PaymentController.initiatePayment);
router.post('/callback', PaymentController.handleCallback);
router.get('/status/:clientTxnId', PaymentController.getTransactionStatus);

module.exports = router;