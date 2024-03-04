

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const pool = require('../db'); // Assurez-vous que ceci correspond au chemin de votre fichier de connexion à la base de données
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// service de SMS (double verification)




 

exports.createPaymentIntentForFormation = async (req, res) => {
    try {
        const { formationId, clientId, promoCode } = req.body; // Récupération du clientId depuis la requête

       
        

        const checkInscriptionQuery = 'SELECT * FROM Inscriptions WHERE id_client = $1 AND id_formations = $2 AND statut_inscription = $3';
        const inscriptionCheckResult = await pool.query(checkInscriptionQuery, [clientId, formationId, 'Confirmé']);
        if (inscriptionCheckResult.rows.length > 0) {
            // Inscription déjà confirmée pour cette formation
            return res.status(400).send({ error: 'Vous avez déjà payé cette formation.' });
        }
        
        // Optionnel : Récupérer le prix de la formation depuis la base de données si le prix n'est pas envoyé depuis le frontend
        let price;

       


        if (req.body.price) {
            price = req.body.price;
        } else {
            // Supposons que votre table de formations a une colonne 'prix'
            const formationQuery = 'SELECT prix FROM formations WHERE id_formations = $1';
            const formationResult = await pool.query(formationQuery, [formationId]);
            if (formationResult.rows.length > 0) {
                price = formationResult.rows[0].prix; // Utiliser le prix depuis la base de données
            } else {
                return res.status(404).send({ error: 'Formation non trouvée.' });
            }
        }

        let discountAmount = 0; // Montant de la réduction en centimes
        if (promoCode) {
            
            const promoCodeValidation = await validatePromoCode(promoCode);
            console.log(promoCode);
            if (!promoCodeValidation.isValid) {
                return res.status(400).send({ error: 'Code promo invalide ou expiré.' });
            }
            // Calculer le montant de la réduction basé sur le pourcentage
            discountAmount = (price * promoCodeValidation.discount) / 100;
            price -= discountAmount; // Appliquer la réduction
            console.log(price);
        }

        // Création de l'intention de paiement avec Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: price * 100, // Convertir le prix en centimes
            currency: "eur",
            payment_method_types: ["card"],
            payment_method_options: {
                card: {
                    request_three_d_secure: 'any'
                }
            },
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


async function validatePromoCode(promoCode) {
    try {
        const promoCodeQuery = 'SELECT discount FROM PromoCodes WHERE code = $1 AND is_active = true ';
        const result = await pool.query(promoCodeQuery, [promoCode]);
        if (result.rows.length > 0) {
            return {
                isValid: true,
                discount: result.rows[0].discount // pourcentage de réduction
            };
        }
        return { isValid: false };
    } catch (error) {
        console.error('Erreur lors de la validation du code promo:', error);
        return { isValid: false };
    }
}

async function handlePaymentConfirmation(clientId, formationId,price) {
    // Logique pour enregistrer l'inscription dans votre base de données
    // et envoyer un email de confirmation via SendGrid
   
    const sessionQuery = 'SELECT id_session FROM Sessions WHERE id_formations = $1 AND nombre_places > 0 LIMIT 1';
    let sessionId;
    try {
        const sessionResult = await pool.query(sessionQuery, [formationId]);
        if (sessionResult.rows.length > 0) {
            sessionId = sessionResult.rows[0].id_session;
        } else {
            console.error('Aucune session disponible pour cette formation.');
            return; // Stopper l'exécution si aucune session disponible
        }
    } catch (error) {
        console.error('Erreur lors de la récupération d\'une session disponible:', error);
        return; // Gérer l'erreur comme approprié
    }
    const inscriptionDate = new Date().toISOString();
    const statutPaiement = 'Payé';
    const statutInscription='Confirmé';

    const query = 'INSERT INTO Inscriptions (id_client, id_formations, id_session, statut_paiement, date_inscription, statut_inscription) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_inscription';
    const values = [clientId, formationId, sessionId, statutPaiement, inscriptionDate, statutInscription];


    try {
        const result = await pool.query(query, values);
        const idInscription = result.rows[0].id_inscription;
        console.log(`Inscription enregistrée avec succès. ID: ${idInscription}`);

        const decrementPlacesQuery = 'UPDATE sessions SET nombre_places = nombre_places - 1 WHERE id_formations = $1 AND nombre_places > 0 RETURNING nombre_places';
        const decrementResult = await pool.query(decrementPlacesQuery, [formationId]);
    
        if (decrementResult.rows.length > 0) {
            const updatedPlaces = decrementResult.rows[0].nombre_places;
            console.log(`Nombre de places mis à jour pour la formation ${formationId}. Places restantes: ${updatedPlaces}`);
        } else {
            console.log('Erreur ou aucune place restante pour décrémenter');
            // Vous pourriez vouloir gérer ce cas spécifiquement, par exemple, en annulant l'inscription ou en informant l'utilisateur.
        }

        // Supposons que vous ayez une fonction pour récupérer l'email du client
        const clientEmail = await getClientEmail(clientId); // Vous devez implémenter cette fonction

        // Envoi de l'email de confirmation
        await sendConfirmationEmail(clientEmail, formationId, price, clientId);
    } catch (error) {
        console.log("client id = ",clientId);
        console.error('Erreur lors de l\'inscription ou de l\'envoi de l\'email:', error);
        // Gérer l'erreur comme vous le souhaitez
    }
}

async function getClientEmail(clientId) {
    try {
        // Premièrement, récupérer l'id_user correspondant au clientId de la table Clients
        const queryUser = 'SELECT id_user FROM Clients WHERE id_client = $1';
        const resultUser = await pool.query(queryUser, [clientId]);
        if (resultUser.rows.length === 0) {
            throw new Error('Client non trouvé.');
        }
        const userId = resultUser.rows[0].id_user;

        // Deuxièmement, utiliser l'id_user pour récupérer l'email de la table Users
        const queryEmail = 'SELECT email FROM Users WHERE id_user = $1';
        const resultEmail = await pool.query(queryEmail, [userId]);
        if (resultEmail.rows.length > 0) {
            return resultEmail.rows[0].email;
        } else {
            throw new Error('Email non trouvé pour cet utilisateur.');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'email du client:', error);
        throw error;
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
        from: 'formations@moonba-studio.com', // Votre adresse email SendGrid
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