const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

router.post('/create-payment-intent-formation', stripeController.createPaymentIntentForFormation);

module.exports = router;
