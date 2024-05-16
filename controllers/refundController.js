// controllers/refundController.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');

function paypalClient() {
    let clientId = process.env.PAYPAL_CLIENT_ID;
    let clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    let environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
    return new paypal.core.PayPalHttpClient(environment);
}

exports.stripeRefund = async (paymentIntentId) => {
    try {
        const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
        console.log('Stripe refund successful:', refund);
        return refund;
    } catch (error) {
        console.error('Stripe refund error:', error);
        throw error;
    }
};

exports.paypalRefund = async (captureId, amount) => {
    try {
        const request = new paypal.payments.CapturesRefundRequest(captureId);
        request.requestBody({
            amount: {
                value: amount.toString(), 
                currency_code: 'EUR'
            }
        });
        const refund = await paypalClient().execute(request);
        console.log('PayPal refund successful:', refund);
        return refund;
    } catch (error) {
        console.error('PayPal refund error:', error);
        throw error;
    }
};

