

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntentForFormation = async (req, res) => {
    try {
        const { formationId, price } = req.body;

        // Vous pouvez ici ajouter une logique supplémentaire, par exemple, 
        // pour récupérer le prix de la formation depuis la base de données 
        // en utilisant formationId si le prix n'est pas envoyé depuis le frontend.

        const paymentIntent = await stripe.paymentIntents.create({
            amount: price * 100, // Assurez-vous que le prix est en centimes
            currency: "eur",
            payment_method_types: ["card"],
            // Vous pouvez ajouter d'autres paramètres si nécessaire
        });

        res.status(200).send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Erreur lors de la création de l\'intention de paiement.' });
    }
};


/*
  const { price } = request.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: price * 100,
    currency: "eur",
    payment_method_types: ["bancontact", "card", "paypal"],
  });

  return { client_secret: paymentIntent.client_secret };
*/