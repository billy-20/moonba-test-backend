

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const pool = require('../db'); // Assurez-vous que ceci correspond au chemin de votre fichier de connexion à la base de données
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// service de SMS (double verification)



function environment() {
    let clientId = process.env.PAYPAL_CLIENT_ID;
    let clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
}

function paypalClient() {
    return new paypal.core.PayPalHttpClient(environment());
}

exports.createPayPalPayment = async (req, res) => {
    const { formationId, clientId, promoCode } = req.body;

    // Vérification des inscriptions précédentes...
    const inscriptionCheckResult = await pool.query(
        'SELECT * FROM Inscriptions WHERE id_client = $1 AND id_formations = $2 AND statut_inscription = $3',
        [clientId, formationId, 'Confirmé']
    );
    if (inscriptionCheckResult.rows.length > 0) {
        return res.status(400).send({ error: 'Vous avez déjà payé cette formation.' });
    }

    let price = await calculatePrice(formationId, promoCode); // Implémentez cette fonction pour récupérer et ajuster le prix

    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            amount: {
                currency_code: 'EUR',
                value: price.toString()
            }
        }],
       
    });

    try {
        const order = await paypalClient().execute(request);
        res.json({ id: order.result.id, approvalUrl: order.result.links.find(link => link.rel === "approve").href });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur lors de la création de l\'intention de paiement PayPal.');
    }
};

exports.capturePayPalPayment = async (req, res) => {
    const { orderID, clientId, formationId, promoCode} = req.body; // Assurez-vous d'inclure clientId, formationId, et price dans votre requête

    try {
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        const capture = await paypalClient().execute(request);
        let price;
        const formationResult = await pool.query('SELECT prix FROM formations WHERE id_formations = $1', [formationId]);
        if (formationResult.rows.length > 0) {
            price = formationResult.rows[0].prix;
        } else {
            return res.status(404).send({ error: 'Formation non trouvée.' });
        }

        // Réappliquer la logique de code promo
        if (promoCode) {
            const promoCodeValidation = await validatePromoCode(promoCode);
            if (!promoCodeValidation.isValid) {
                return res.status(400).send({ error: 'Code promo invalide ou expiré.' });
            }
            let discountAmount = (price * promoCodeValidation.discount) / 100;
            price -= discountAmount;
        }
        if (capture.result.status === 'COMPLETED') {
            // Capture réussie, enregistrez les détails ici.
            const captureID = capture.result.purchase_units[0].payments.captures[0].id;
            console.log(captureID);
            await handlePaymentConfirmation(clientId, formationId, price , captureID , null);
            console.log("paiement reussi le prix : " , price);

            res.status(200).json({ success: true, captureID });
        } else {
            res.status(500).json({ success: false, message: 'Échec de la capture du paiement.' });
        }
    } catch (err) {
        console.error('Erreur lors de la capture du paiement PayPal:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

async function calculatePrice(formationId, promoCode) {
    const formationResult = await pool.query('SELECT prix FROM formations WHERE id_formations = $1', [formationId]);
    if (formationResult.rows.length === 0) {
        return { error: 'Formation non trouvée.', status: 404 };
    }
    let price = formationResult.rows[0].prix;

    if (promoCode) {
        const promoCodeValidation = await validatePromoCode(promoCode);
        if (!promoCodeValidation.isValid) {
            return { error: 'Code promo invalide ou expiré.', status: 400 };
        }
        price -= (price * promoCodeValidation.discount) / 100;
    }
    return price;
}


async function checkOrderStatus(orderID) {
    try {
        const request = new paypal.orders.OrdersGetRequest(orderID);
        console.log(request);
        const order = await paypalClient().execute(request);
        console.log("status de l'order 2 : ",order.result.status);
        return order.result;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'état de la commande:', error);
        throw error; // Propager l'erreur pour un traitement plus haut dans la pile d'appels
    }
}

exports.verifyPayPalPayment = async (req, res) => {
    const { orderID, clientId, formationId, promoCode} = req.body; // Assurez-vous d'inclure clientId, formationId, et price dans votre requête

    try {
        verifyAndCapturePayment(orderID);
        let price;
        const formationResult = await pool.query('SELECT prix FROM formations WHERE id_formations = $1', [formationId]);
        if (formationResult.rows.length > 0) {
            price = formationResult.rows[0].prix;
        } else {
            return res.status(404).send({ error: 'Formation non trouvée.' });
        }

        // Réappliquer la logique de code promo
        if (promoCode) {
            const promoCodeValidation = await validatePromoCode(promoCode);
            if (!promoCodeValidation.isValid) {
                return res.status(400).send({ error: 'Code promo invalide ou expiré.' });
            }
            let discountAmount = (price * promoCodeValidation.discount) / 100;
            price -= discountAmount;
        }
        const orderDetails = await checkOrderStatus(orderID);
        if (orderDetails.status === 'COMPLETED') {
            console.log("commande deja capture");
            return res.status(400).send({ error: 'Cette commande a déjà été capturée.' });
        }
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        const order = await paypalClient().execute(request);
        console.log(order.result.id);
        if (order.result.status === 'COMPLETED') {
            // Le paiement a été complété avec succès
            const captureID = order.result.purchase_units[0].payments.captures[0].id;
            console.log(captureID);
            // Procéder à l'inscription de l'utilisateur à la formation ici
            await handlePaymentConfirmation(clientId, formationId, price , captureID , null );
            console.log("paiement reussi le prix : " , price);
            res.status(200).send({ success: true, message: 'Paiement vérifié et inscription réussie.' });
        } else {
            // Le paiement n'a pas été complété avec succès
            res.status(400).send({ success: false, message: 'Paiement non vérifié. Inscription annulée.' });
        }
    } catch (err) {
        console.log(err);
        console.error('Erreur lors de la vérification du paiement PayPal:', err);
        res.status(500).send('Erreur lors de la vérification du paiement PayPal et de l\'inscription.');
    }
};
async function verifyAndCapturePayment(orderID) {
    console.log(`Début de la vérification de l'état de la commande: ${orderID}`);
    try {
        const orderDetails = await checkOrderStatus(orderID);
        console.log(`Statut récupéré pour la commande ${orderID}: ${orderDetails.status}`);

        if (orderDetails.status === 'COMPLETED') {
            console.log(`Commande ${orderID} déjà capturée`);
            return { success: false, message: 'Cette commande a déjà été capturée.' };
        }

        console.log(`Tentative de capture de la commande ${orderID}`);
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        const capture = await paypalClient().execute(request);
        console.log(`Résultat de la capture pour la commande ${orderID}: ${capture.result.status}`);

        if (capture.result.status === 'COMPLETED') {
            console.log(`Capture réussie pour la commande ${orderID}`);
            return { success: true, message: 'Paiement capturé avec succès.' };
        } else {
            throw new Error(`La capture a échoué pour la commande ${orderID}`);
        }
    } catch (err) {
        console.error(`Erreur lors de la capture du paiement pour la commande ${orderID}:`, err);
        throw err;
    }
}


exports.createPaymentIntentForFormation = async (req, res) => {
    try {
        const { formationId, clientId, promoCode } = req.body; 

        const checkInscriptionQuery = 'SELECT * FROM Inscriptions WHERE id_client = $1 AND id_formations = $2 AND statut_inscription = $3';
        const inscriptionCheckResult = await pool.query(checkInscriptionQuery, [clientId, formationId, 'Confirmé']);
        if (inscriptionCheckResult.rows.length > 0) {
            return res.status(400).send({ error: 'Vous avez déjà payé cette formation.' });
        }
        
        let price;

        if (req.body.price) {
            price = req.body.price;
        } else {
            const formationQuery = 'SELECT prix FROM formations WHERE id_formations = $1';
            const formationResult = await pool.query(formationQuery, [formationId]);
            if (formationResult.rows.length > 0) {
                price = formationResult.rows[0].prix; 
            } else {
                return res.status(404).send({ error: 'Formation non trouvée.' });
            }
        }

        let discountAmount = 0; 
        if (promoCode) {
            console.log("promo code" , promoCode);
            const promoCodeValidation = await validatePromoCode(promoCode);
            console.log(promoCode);
            if (!promoCodeValidation.isValid) {
                return res.status(400).send({ error: 'Code promo invalide ou expiré.' });
            }
            discountAmount = (price * promoCodeValidation.discount) / 100;
            price -= discountAmount; 
            console.log(price);
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: price * 100, // Convertir le prix en centimes
            currency: "eur",
            payment_method_types: ["card"],
            payment_method_options: {
                card: {
                    request_three_d_secure: 'any'
                }
            },
        });

       
        await handlePaymentConfirmation(clientId, formationId,price , null , paymentIntent.id );

        res.status(200).send({ clientSecret: paymentIntent.client_secret });
        console.log("payment OK");
        console.log("price : " , price);
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

async function handlePaymentConfirmation(clientId, formationId,price , captureID , paymentIntentId ) {
    
   
    const sessionQuery = 'SELECT id_session FROM Sessions WHERE id_formations = $1 AND nombre_places > 0 LIMIT 1';
    let sessionId;
    try {

        
        const sessionResult = await pool.query(sessionQuery, [formationId]);
        if (sessionResult.rows.length > 0) {
            sessionId = sessionResult.rows[0].id_session;
        } else {
            console.error('Aucune session disponible pour cette formation.');
            return; 
        }
    } catch (error) {
        console.error('Erreur lors de la récupération d\'une session disponible:', error);
        return; 
    }
    const inscriptionDate = new Date().toISOString();
    const statutPaiement = 'Payé';
    const statutInscription='Confirmé';

    const query = 'INSERT INTO Inscriptions (id_client, id_formations, id_session, statut_paiement, date_inscription, statut_inscription, payment_intent_id , capture_id, prix_final) VALUES ($1, $2, $3, $4, $5, $6 , $7 , $8, $9) RETURNING id_inscription';
    const values = [clientId, formationId, sessionId, statutPaiement, inscriptionDate, statutInscription , paymentIntentId , captureID, price];
   

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
        }

        const clientEmail = await getClientEmail(clientId); 

        await sendConfirmationEmail(clientEmail, formationId, price, clientId);
    } catch (error) {
        console.log("client id = ",clientId);
        console.error('Erreur lors de l\'inscription ou de l\'envoi de l\'email:', error);
    }
}

async function getClientEmail(clientId) {
    try {
        const queryUser = 'SELECT id_user FROM Clients WHERE id_client = $1';
        const resultUser = await pool.query(queryUser, [clientId]);
        if (resultUser.rows.length === 0) {
            throw new Error('Client non trouvé.');
        }
        const userId = resultUser.rows[0].id_user;

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
    const clientTypeQuery = 'SELECT type FROM clients WHERE id_client = $1';
    const clientTypeResult = await pool.query(clientTypeQuery, [clientId]);
    if (clientTypeResult.rows.length > 0) {
        const { type } = clientTypeResult.rows[0];
        
        if (type === 'Entreprise') {
            const queryEntreprise = 'SELECT nom_entreprise FROM entreprise WHERE id_client = $1';
            const result = await pool.query(queryEntreprise, [clientId]);
            if (result.rows.length > 0) {
                return { type: 'Entreprise', nom: result.rows[0].nom_entreprise , adresse_facturation : result.rows[0].adresse_facturation , numero_entreprise : result.rows[0].adresse_facturation };
            }
        }
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
   

    let clientInfo;
    try {
        clientInfo = await getClientInfo(clientId);
        console.log(clientInfo.adresse);
    } catch (error) {
        console.error('Erreur lors de la récupération des infos du client:', error);
        return;
    }
    const numericPrice = parseFloat(price);

    const TAUXTVA = 0.21;
    const montantTVA = numericPrice * TAUXTVA;
    const totalTTC = numericPrice + montantTVA;
    const currentDate = new Date().toLocaleDateString("fr-FR");
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateString = dueDate.toLocaleDateString("fr-FR");

    const htmlContent = `
    <!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture de Formation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header,
        .footer,
        .billing-details,
        .invoice-info,
        .line-items,
        .totals {
            margin-bottom: 20px;
        }
        .header {
            display: flex;
            justify-content: space-between;
        }
        .line-items th,
        .line-items td {
            text-align: left;
            padding: 5px 0;
        }
        .totals {
            text-align: right;
        }
        .totals th,
        .totals td {
            padding: 5px 0;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div>
                <h2>${nameFormation}</h2>
            </div>
            <div>
                <p>n° SIREN / SIRET : <br>E-mail:${`formations@moonba-studio.com`} <br>Téléphone:${12345678} </p>
            </div>
        </div>
        <div class="billing-details">
            <p>Destinataire: ${clientInfo.nom}
            <p>adresse de facturation : ${clientInfo.adresse}
            <p>Numéro d'entreprise : ${clientInfo.numero_entreprise ? clientInfo.numero_entreprise : 'Non spécifié'}</p>
            

        </div>
        <div class="invoice-info">
            <p>Facture: <br>Date de facture: ${currentDate} "<br>Date d'échéance:  ${dueDateString}</p>
        </div>
        <div class="line-items">
            <table width="100%">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantité</th>
                        <th>Prix</th>
                        <th>TVA</th>
                        <th>Montant</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Les lignes d'articles seront générées ici -->
                    <tr>
                        <td>${nameFormation}</td>
                        <td>${numericPrice.toFixed(2)} €</td>
                        <td>${montantTVA.toFixed(2)} €</td>
                        <td>${totalTTC.toFixed(2)} €</td>
                    </tr>
                
                </tbody>
            </table>
        </div>
        <div class="totals">
            <table width="100%">
                <tr>
                    <th>Sous-total HT</th>
                    <td>${numericPrice.toFixed(2)} €</td>

                </tr>
                <tr>
                <th>Total TVA</th>
                <td>${montantTVA.toFixed(2)} €</td>
                  
                </tr>
                <tr>
                    <th>Montant Total TTC</th>
                    <td>${totalTTC.toFixed(2)} €</td>
                </tr>
                <tr>
                    <th>Montant payé (EUR)</th>
                    <td>${totalTTC.toFixed(2)} €</td>

                </tr>
                <tr>
                    <th>Montant à payer (EUR)</th>
                    <td>${totalTTC.toFixed(2)} €</td>

                </tr>
            </table>
        </div>
    </div>
</body>
</html>

    `;

    // Générer le PDF à partir du contenu HTML avec Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    // Convertir le buffer PDF en base64
    const pdfBase64 = pdfBuffer.toString('base64');


    const msg = {
        to: email,
        from: 'formations@moonba-studio.com', // email de sendgrid
        subject: 'Confirmation de votre inscription à la formation',
        text: `Votre paiement a été accepté et vous êtes maintenant inscrit à la formation. 
        Nom de la formation: ${nameFormation}`,
        html: `<strong>Votre paiement a été accepté et vous êtes maintenant inscrit à la formation.</strong> <br> Nom de la formation: ${nameFormation}`,
        attachments: [
            {
                content: pdfBase64,
                filename: 'facture.pdf',
                type: 'application/pdf',
                disposition: 'attachment',
            },
        ],
    };

    // send email here
    try {
        await sgMail.send(msg);
        console.log('Email de confirmation envoyé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
    }
}
