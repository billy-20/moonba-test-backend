

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
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
        await handlePaymentConfirmation(clientId, formationId,price);

        res.status(200).send({ clientSecret: paymentIntent.client_secret });
        console.log("payment OK");
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Erreur lors de la création de l\'intention de paiement.' });
    }
};

async function handlePaymentConfirmation(clientId, formationId,price) {
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
        await sendConfirmationEmail(clientEmail, formationId, price, clientId);
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

async function getClientInfo(clientId) {
    // D'abord, récupérer le type du client
    const clientTypeQuery = 'SELECT type FROM clients WHERE id_client = $1';
    const clientTypeResult = await pool.query(clientTypeQuery, [clientId]);
    if (clientTypeResult.rows.length > 0) {
        const { type } = clientTypeResult.rows[0];
        
        // Si le client est une entreprise
        if (type === 'Entreprise') {
            const queryEntreprise = 'SELECT nom_entreprise FROM entreprise WHERE id_client = $1';
            const result = await pool.query(queryEntreprise, [clientId]);
            if (result.rows.length > 0) {
                return { type: 'Entreprise', nom: result.rows[0].nom_entreprise };
            }
        }
        // Si le client est un particulier
        else if (type === 'Particulier') {
            const queryParticulier = 'SELECT nom, prenom FROM particulier WHERE id_client = $1';
            const result = await pool.query(queryParticulier, [clientId]);
            if (result.rows.length > 0) {
                return { type: 'Particulier', nom: result.rows[0].nom, prenom: result.rows[0].prenom };
            }
        }
    }
    throw new Error('Client non trouvé ou type de client non spécifié.');
}


async function sendConfirmationEmail(email, formationId, price, clientId) {
    let nameFormation;
    // Récupération du nom de la formation comme précédemment
    const formationQuery = 'SELECT nom_formation FROM formations WHERE id_formations = $1';
    try {
        const formationResult = await pool.query(formationQuery, [formationId]);
        if (formationResult.rows.length > 0) {
            nameFormation = formationResult.rows[0].nom_formation;
        } else {
            throw new Error('Formation non trouvée.');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du nom de la formation:', error);
        return;
    }

    // recuperation des info du client afin de les mettre dans la facture : 

    let clientInfo;
    try {
        clientInfo = await getClientInfo(clientId);
    } catch (error) {
        console.error('Erreur lors de la récupération des infos du client:', error);
        return;
    }

    // Continuer avec la création du PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const fontSize = 12;
    const textWidth = 50;
    const initialHeight = page.getHeight() - 4 * fontSize;
    
    page.drawText(`Facture pour la formation: ${nameFormation}`, {
        x: textWidth,
        y: initialHeight,
        size: fontSize,
        color: rgb(0, 0, 0),
    });
    
    page.drawText(`Prix: ${price}€`, {
        x: textWidth,
        y: initialHeight - 2 * fontSize,
        size: fontSize,
        color: rgb(0, 0, 0),
    });

    // Ajouter les informations du client
    if (clientInfo.type === 'Entreprise') {
        page.drawText(`Entreprise: ${clientInfo.nom}`, {
            x: textWidth,
            y: initialHeight - 4 * fontSize,
            size: fontSize,
            color: rgb(0, 0, 0),
        });
    } else {
        page.drawText(`Client: ${clientInfo.prenom} ${clientInfo.nom}`, {
            x: textWidth,
            y: initialHeight - 4 * fontSize,
            size: fontSize,
            color: rgb(0, 0, 0),
        });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    // Configuration de l'email avec pièce jointe PDF
    const msg = {
        to: email,
        from: 'bilalelhaddadi.pro@gmail.com', // Votre adresse email SendGrid
        subject: 'Confirmation de votre inscription à la formation',
        text: `Votre paiement a été accepté et vous êtes maintenant inscrit à la formation. Nom de la formation: ${nameFormation}`,
        html: `<strong>Votre paiement a été accepté et vous êtes maintenant inscrit à la formation.</strong> Nom de la formation: ${nameFormation}`,
        attachments: [
            {
                content: pdfBase64,
                filename: 'facture.pdf',
                type: 'application/pdf',
                disposition: 'attachment',
            },
        ],
    };

    // Envoi de l'email
    try {
        await sgMail.send(msg);
        console.log('Email de confirmation envoyé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
    }
}