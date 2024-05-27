// controllers/refundController.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');

/**
 * Crée un client PayPal pour interagir avec l'API PayPal.
 * 
 * @returns {paypal.core.PayPalHttpClient} Un client HTTP pour communiquer avec PayPal.
 */
function paypalClient() {
    let clientId = process.env.PAYPAL_CLIENT_ID;
    let clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    let environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
    return new paypal.core.PayPalHttpClient(environment);
}

/**
 * Effectue un remboursement via Stripe.
 * 
 * @param {string} paymentIntentId - L'identifiant de l'intention de paiement Stripe à rembourser.
 * @returns {Promise<Object>} Les détails du remboursement Stripe.
 */
exports.stripeRefund = async (paymentIntentId) => {
    try {
        const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
        return refund;
    } catch (error) {
        console.error('Stripe refund error:', error);
        throw error;
    }
};

/**
 * Effectue un remboursement via PayPal.
 * 
 * @param {string} captureId - L'identifiant de la capture PayPal à rembourser.
 * @param {number} amount - Le montant à rembourser.
 * @returns {Promise<Object>} Les détails du remboursement PayPal.
 */
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
        return refund;
    } catch (error) {
        console.error('PayPal refund error:', error);
        throw error;
    }
};

