const express = require('express');
const WebhookController = require('../controllers/webhookController');

const router = express.Router();

router.post('/sabpaisa', WebhookController.handleWebhook);
router.get('/sabpaisa/health', WebhookController.healthCheck);

module.exports = router;