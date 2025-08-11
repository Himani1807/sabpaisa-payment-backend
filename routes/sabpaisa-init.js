const express = require('express');
const crypto = require('crypto');
const router = express.Router();

router.post('/init', (req, res) => {
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

module.exports = router;