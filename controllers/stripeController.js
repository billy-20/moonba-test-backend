

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../db'); // Assurez-vous que ceci correspond au chemin de votre fichier de connexion à la base de données
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.createPaymentIntentForFormation = async (req, res) => {
    try {
        const { formationId, clientId } = req.body; // Récupération du clientId depuis la requête

        // Optionnel : Récupérer le prix de la formation depuis la base de données si le prix n'est pas envoyé depuis le frontend
        let price;
        if (req.body.price) {
            price = req.body.price;
        } else {
            // Supposons que votre table de formations a une colonne 'prix'
            const formationQuery = 'SELECT prix FROM formations WHERE id_formation = $1';
            const formationResult = await pool.query(formationQuery, [formationId]);
            if (formationResult.rows.length > 0) {
                price = formationResult.rows[0].prix; // Utiliser le prix depuis la base de données
            } else {
                return res.status(404).send({ error: 'Formation non trouvée.' });
            }
        }

        // Création de l'intention de paiement avec Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: price * 100, // Convertir le prix en centimes
            currency: "eur",
            payment_method_types: ["card"],
            // Ajoutez ici d'autres paramètres si nécessaire
        });

        // Ici, vous pouvez appeler une fonction pour enregistrer le paiement dans votre base de données
        // et potentiellement envoyer un email de confirmation
        await handlePaymentConfirmation(clientId, formationId);

        res.status(200).send({ clientSecret: paymentIntent.client_secret });
        console.log("payment OK");
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Erreur lors de la création de l\'intention de paiement.' });
    }
};

async function handlePaymentConfirmation(clientId, formationId) {
    // Logique pour enregistrer l'inscription dans votre base de données
    // et envoyer un email de confirmation via SendGrid
    const inscriptionDate = new Date().toISOString();
    const statutPaiement = 'Payé';

    const query = 'INSERT INTO Inscriptions (id_client, id_formation, statut_paiement, date_inscription) VALUES ($1, $2, $3, $4) RETURNING id_inscription';
    const values = [clientId, formationId, statutPaiement, inscriptionDate];

    try {
        const result = await pool.query(query, values);
        const idInscription = result.rows[0].id_inscription;
        console.log(`Inscription enregistrée avec succès. ID: ${idInscription}`);

        // Supposons que vous ayez une fonction pour récupérer l'email du client
        const clientEmail = await getClientEmail(clientId); // Vous devez implémenter cette fonction

        // Envoi de l'email de confirmation
        await sendConfirmationEmail(clientEmail, formationId);
    } catch (error) {
        console.error('Erreur lors de l\'inscription ou de l\'envoi de l\'email:', error);
        // Gérer l'erreur comme vous le souhaitez
    }
}

async function getClientEmail(clientId) {
    // Implémentez la logique pour récupérer l'email du client depuis la base de données
    const queryEmail = 'SELECT email FROM Clients WHERE id_client = $1';
    const resultEmail = await pool.query(queryEmail, [clientId]);
    if (resultEmail.rows.length > 0) {
        return resultEmail.rows[0].email;
    } else {
        throw new Error('Client non trouvé.');
    }
}

async function sendConfirmationEmail(email, formationId) {

  const formationQuery = 'SELECT nom_formation FROM formations WHERE id_formations = $1';
    let nameFormation;
    try {
        const formationResult = await pool.query(formationQuery, [formationId]);
        if (formationResult.rows.length > 0) {
            nameFormation = formationResult.rows[0].nom_formation;
        } else {
            throw new Error('Formation non trouvée.');
        }
        console.log(nameFormation);
    } catch (error) {
        console.error('Erreur lors de la récupération du nom de la formation:', error);
        // Vous pouvez décider de ne pas envoyer l'email si le nom de la formation ne peut être récupéré
        return;
    }
    // Votre logique d'envoi d'email
    const msg = {
        to: email,
        from: 'bilalelhaddadi.pro@gmail.com', // Remplacez par votre adresse email validée par SendGrid
        subject: 'Confirmation de votre inscription à la formation',
        text: `Votre paiement a été accepté et vous êtes maintenant inscrit à la formation. nom de la formation: ${nameFormation}`,
        html: `<strong>Votre paiement a été accepté et vous êtes maintenant inscrit à la formation.</strong> nom de la formation: ${nameFormation}`,
    };

    try {
        await sgMail.send(msg);
        console.log('Email de confirmation envoyé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
        // Gérer l'erreur
    }
}
