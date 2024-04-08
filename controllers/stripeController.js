

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
    try {
        const { formationId, clientId, promoCode } = req.body;

        const inscriptionCheckResult = await pool.query(
            'SELECT * FROM Inscriptions WHERE id_client = $1 AND id_formations = $2 AND statut_inscription = $3',
            [clientId, formationId, 'Confirmé']
        );
        if (inscriptionCheckResult.rows.length > 0) {
            console.log("formation deja paye");
            return res.status(400).send({ error: 'Vous avez déjà payé cette formation.' });
        }

        let price;
        const formationResult = await pool.query('SELECT prix FROM formations WHERE id_formations = $1', [formationId]);
        if (formationResult.rows.length > 0) {
            price = formationResult.rows[0].prix;
        } else {
            return res.status(404).send({ error: 'Formation non trouvée.' });
        }

        if (promoCode) {
            console.log("promo code paypal : " , promoCode);
            const promoCodeValidation = await validatePromoCode(promoCode);
            if (!promoCodeValidation.isValid) {
                return res.status(400).send({ error: 'Code promo invalide ou expiré.' });
            }
            let discountAmount = (price * promoCodeValidation.discount) / 100;
            price -= discountAmount;
        }
        console.log("price paypal" , price);
        // Créer la transaction PayPal
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'EUR',
                    value: price.toString() // Convertir le prix final en chaîne de caractères
                }
            }]
        });

        const order = await paypalClient().execute(request);
        // Enregistrer la transaction ou des détails supplémentaires ici si nécessaire
        //await handlePaymentConfirmation(clientId, formationId, price); // Assurez-vous que cette fonction gère correctement PayPal

        res.json({ id: order.result.id });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur lors de la création de l\'intention de paiement PayPal.');
    }
};


exports.verifyPayPalPayment = async (req, res) => {
    const { orderID, clientId, formationId, promoCode} = req.body; // Assurez-vous d'inclure clientId, formationId, et price dans votre requête

    try {
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
       
        const request = new paypal.orders.OrdersGetRequest(orderID);
        const order = await paypalClient().execute(request);

        if (order.result.status === 'COMPLETED') {
            // Le paiement a été complété avec succès
            // Procéder à l'inscription de l'utilisateur à la formation ici
            await handlePaymentConfirmation(clientId, formationId, price);
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

       
        await handlePaymentConfirmation(clientId, formationId,price);

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

async function handlePaymentConfirmation(clientId, formationId,price) {
    
   
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
    } catch (error) {
        console.error('Erreur lors de la récupération des infos du client:', error);
        return;
    }

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
                <p>n° SIREN / SIRET : <br>E-mail: <br>Téléphone: </p>
            </div>
        </div>
        <div class="billing-details">
            <p>Destinataire: ${clientInfo.nom}
            <p>adresse de facturation : ${clientInfo.adresse_facturation}
            <p>numero entreprise : ${clientInfo.numero_entreprise}
            

        </div>
        <div class="invoice-info">
            <p>Facture: <br>Date de facture: "date aujourdh'ui encore a impelemnter" "<br>Date d'échéance: </p>
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
                        <td></td>
                        <td></td>
                        <td>${price} €</td>
                        <td>${21}</td>
                        <td> €</td>
                    </tr>
                
                </tbody>
            </table>
        </div>
        <div class="totals">
            <table width="100%">
                <tr>
                    <th>Sous-total HT</th>
                    
                </tr>
                <tr>
                   
                  
                </tr>
                <tr>
                    <th>Montant Total EUR</th>
                    <td>${price} €</td>
                </tr>
                <tr>
                    <th>Montant payé (EUR)</th>
                  
                </tr>
                <tr>
                    <th>Montant à payer (EUR)</th>
                    
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

    // send email here
    try {
        await sgMail.send(msg);
        console.log('Email de confirmation envoyé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
    }
}