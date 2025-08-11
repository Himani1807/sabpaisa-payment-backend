const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const SabPaisaEncryption = require('../utils/encryption');
const TransactionModel = require('../models/Transaction');

class PaymentController {
  // Initiate payment
  static async initiatePayment(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        amount,
        customerName,
        customerEmail,
        customerMobile,
        customerAddress = '',
        paymentMode = 'ALL',
        paymentMethod,
        upiId,
        selectedUpiApp
      } = req.body;

      // Generate unique transaction ID
      const clientTxnId = `TXN_${Date.now()}_${uuidv4().substr(0, 8)}`;

      // Store transaction in database
      await TransactionModel.create({
        clientTxnId,
        amount,
        customerName,
        customerEmail,
        customerMobile
      });

      // Prepare payment data based on payment method
      const paymentData = PaymentController.buildPaymentData({
        clientTxnId,
        amount,
        customerName,
        customerEmail,
        customerMobile,
        customerAddress,
        paymentMode,
        paymentMethod,
        upiId,
        selectedUpiApp
      });

      // Encrypt payment data
      const encData = SabPaisaEncryption.encrypt(
        process.env.SABPAISA_AUTH_KEY,
        process.env.SABPAISA_AUTH_IV,
        paymentData
      );

      res.json({
        success: true,
        data: {
          clientTxnId,
          encData,
          clientCode: process.env.SABPAISA_CLIENT_CODE,
          sabpaisaUrl: process.env.NODE_ENV === 'production' 
            ? process.env.SABPAISA_PROD_URL 
            : process.env.SABPAISA_TEST_URL
        }
      });

    } catch (error) {
      console.error('Payment initiation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate payment',
        error: error.message
      });
    }
  }

  // UPI App to Bank ID mapping (SabPaisa specific bank codes)
  static getUpiAppBankId(selectedUpiApp) {
    const upiAppBankIds = {
      'paytm': '1001',     // Paytm Payments Bank
      'phonepe': '1002',   // PhonePe 
      'googlepay': '1003', // Google Pay
      'bhim': '1004',      // BHIM UPI
      'amazonpay': '1005', // Amazon Pay
      'mobikwik': '1006',  // MobiKwik
      'freecharge': '1007',// Freecharge
      'cred': '1008'       // CRED Pay
    };
    return upiAppBankIds[selectedUpiApp] || null;
  }

  // Build payment data string
  static buildPaymentData(data) {
    const {
      clientTxnId,
      amount,
      customerName,
      customerEmail,
      customerMobile,
      customerAddress,
      paymentMode,
      paymentMethod,
      upiId,
      selectedUpiApp
    } = data;

    // Split customer name into first and last name
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Base payment parameters matching exact SabPaisa format from your screenshots
    let paymentString = `clientCode=${process.env.SABPAISA_CLIENT_CODE}` +
      `&username=${process.env.SABPAISA_TRANS_USERNAME}` +
      `&pass=${process.env.SABPAISA_TRANS_PASSWORD}` +
      `&authkey=${process.env.SABPAISA_AUTH_KEY}` +
      `&authiv=${process.env.SABPAISA_AUTH_IV}` +
      `&authFlag=true` +
      `&authType=Encryption` +
      `&txnid=${clientTxnId}` +
      `&apiVersion=1` +
      `&fn=${encodeURIComponent(firstName)}` +
      `&ln=${encodeURIComponent(lastName)}` +
      `&amt=${amount}` +
      `&con=${customerMobile}` +
      `&email=${encodeURIComponent(customerEmail)}` +
      `&param1=` +
      `&param2=` +
      `&grNumber=` +
      `&param3=` +
      `&success=` +
      `&add=${encodeURIComponent(customerAddress || '')}` +
      `&amountType=INR` +
      `&channelId=W` +
      `&udf18=` +
      `&udf19=` +
      `&udf20=` +
      `&byPassFlag=true`;

    // Add payment method specific parameters
    if (paymentMethod === 'upi') {
      paymentString += `&modeTransfer=UPI_MODE_TRANSFER`;
      paymentString += `&cardHolderName=` +
        `&pan=` +
        `&cardExpMonth=` +
        `&cardExpYear=` +
        `&cvv=` +
        `&cardType=`;
      
      if (upiId) {
        // UPI VPA payment (direct UPI ID)
        paymentString += `&vpa=${encodeURIComponent(upiId)}`;
        paymentString += `&bankid=`;
      } else if (selectedUpiApp) {
        // UPI Intent payment (App-based)
        paymentString += `&vpa=`;
        paymentString += `&bankid=`;
      }
      // Add seamless type for UPI
      paymentString += `&seamlesstype=S2S`;
      
    } else if (paymentMethod === 'card') {
      paymentString += `&modeTransfer=DC_CARD_TRANSFER`;
      // Card fields will be added when card details are provided
    } else if (paymentMethod === 'netbanking') {
      paymentString += `&modeTransfer=NB_MODE_TRANSFER`;
    } else if (paymentMethod === 'wallet') {
      paymentString += `&modeTransfer=WALLET_MODE_TRANSFER`;
    } else {
      // Default for other payment methods
      paymentString += `&modeTransfer=ALL`;
    }

    return paymentString;
  }

  // Handle payment callback
  static async handleCallback(req, res) {
    try {
      const { encResponse } = req.body;

      if (!encResponse) {
        return res.status(400).json({
          success: false,
          message: 'No encrypted response received'
        });
      }

      // Decrypt response
      const decryptedResponse = SabPaisaEncryption.decrypt(
        process.env.SABPAISA_AUTH_KEY,
        process.env.SABPAISA_AUTH_IV,
        encResponse
      );

      // Parse response
      const responseData = PaymentController.parseResponseString(decryptedResponse);

      // Update transaction status
      await TransactionModel.updateStatus(responseData.clientTxnId, {
        status: responseData.status,
        sabpaisaTxnId: responseData.sabpaisaTxnId,
        paymentMode: responseData.paymentMode,
        bankRefNumber: responseData.bankRefNumber || responseData.bankTxnId
      });

      // Redirect to frontend with status
      const frontendUrl = `${process.env.FRONTEND_URL}/payment/${responseData.status.toLowerCase()}?txn=${responseData.clientTxnId}`;
      res.redirect(frontendUrl);

    } catch (error) {
      console.error('Callback handling error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
    }
  }

  // Get transaction status
  static async getTransactionStatus(req, res) {
    try {
      const { clientTxnId } = req.params;

      const transaction = await TransactionModel.findByClientTxnId(clientTxnId);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.json({
        success: true,
        data: {
          clientTxnId: transaction.clientTxnId,
          status: transaction.status,
          amount: transaction.amount,
          paymentMode: transaction.paymentMode,
          sabpaisaTxnId: transaction.sabpaisaTxnId
        }
      });

    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction status'
      });
    }
  }

  // Parse SabPaisa response string
  static parseResponseString(responseString) {
    const params = new URLSearchParams(responseString);
    const responseData = {};
    
    for (const [key, value] of params.entries()) {
      responseData[key] = value;
    }
    
    return responseData;
  }
}

module.exports = PaymentController;