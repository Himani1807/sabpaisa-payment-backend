const SabPaisaEncryption = require('../utils/encryption');
const TransactionModel = require('../models/Transaction');

class WebhookController {
  static async handleWebhook(req, res) {
    try {
      console.log('Webhook received from SabPaisa:', req.body);

      const { encResponse, clientCode } = req.body;

      // Verify client code
      if (clientCode !== process.env.SABPAISA_CLIENT_CODE) {
        console.log('Invalid client code in webhook:', clientCode);
        return res.status(401).send('UNAUTHORIZED');
      }

      if (!encResponse) {
        console.log('No encrypted response in webhook');
        return res.status(400).send('BAD_REQUEST');
      }

      // Decrypt webhook data
      const decryptedData = SabPaisaEncryption.decrypt(
        process.env.SABPAISA_AUTH_KEY,
        process.env.SABPAISA_AUTH_IV,
        encResponse
      );

      console.log('Decrypted webhook data:', decryptedData);

      // Parse response
      const webhookData = this.parseWebhookData(decryptedData);

      // Update transaction status
      const updateResult = await TransactionModel.updateStatus(webhookData.clientTxnId, {
        status: this.mapStatusCode(webhookData.statusCode),
        sabpaisaTxnId: webhookData.sabpaisaTxnId,
        paymentMode: webhookData.paymentMode,
        bankRefNumber: webhookData.bankRefNumber || webhookData.bankTxnId
      });

      if (updateResult.changes > 0) {
        console.log(`Transaction ${webhookData.clientTxnId} updated successfully`);
        
        // Here you can add additional logic:
        // - Send email notifications
        // - Update inventory
        // - Trigger fulfillment
        
        res.send('SUCCESS');
      } else {
        console.log(`No transaction found for ${webhookData.clientTxnId}`);
        res.status(404).send('TRANSACTION_NOT_FOUND');
      }

    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).send('ERROR');
    }
  }

  static parseWebhookData(dataString) {
    const params = new URLSearchParams(dataString);
    const webhookData = {};
    
    for (const [key, value] of params.entries()) {
      webhookData[key] = value;
    }
    
    return webhookData;
  }

  static mapStatusCode(statusCode) {
    const statusMap = {
      '0000': 'SUCCESS',
      '0100': 'PENDING',
      '0200': 'ABORTED',
      '0300': 'FAILED',
      '0400': 'CHALLAN_GENERATED',
      '0999': 'UNKNOWN'
    };
    
    return statusMap[statusCode] || 'UNKNOWN';
  }

  // Webhook health check
  static healthCheck(req, res) {
    res.send('WEBHOOK_ACTIVE');
  }
}

module.exports = WebhookController;