const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const authenticateToken = require('../authenticateToken');


router.post('/create-payment-intent-formation', authenticateToken, stripeController.createPaymentIntentForFormation);

router.post('/create-paypal-payment', stripeController.createPayPalPayment);

router.post('/verify-paypal-payment', stripeController.verifyPayPalPayment);


module.exports = router;
