const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const authenticateToken = require('../authenticateToken');


router.post('/create-payment-intent-formation', authenticateToken, stripeController.createPaymentIntentForFormation);

router.post('/create-paypal-payment',authenticateToken, stripeController.createPayPalPayment);

router.post('/capture-paypal-payment', authenticateToken, stripeController.capturePayPalPayment);


router.post('/verify-paypal-payment',authenticateToken, stripeController.verifyPayPalPayment);


module.exports = router;
