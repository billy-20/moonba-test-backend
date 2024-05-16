// InscriptionModel.js
const { stripeRefund, paypalRefund } = require('../controllers/refundController');

const pool = require('../db');

class Inscription {
    static async getInscriptionsByClient(clientId) {
        try {
            const query = 'SELECT * FROM Inscriptions WHERE id_client = $1 AND statut_paiement = \'Payé\' AND statut_inscription=\'Confirmé\'';
            const result = await pool.query(query, [clientId]);
            return result.rows;
        } catch (error) {
            throw new Error('Erreur lors de la récupération des inscriptions du client : ' + error.message);
        }
    }

    
    static async annulerInscription(inscriptionId) {
        const getSessionAndPaymentQuery = `
            SELECT i.id_session, i.payment_intent_id, i.capture_id, i.prix_final
            FROM Inscriptions i
            JOIN Formations f ON i.id_formations = f.id_formations
            WHERE i.id_inscription = $1`;
        const deleteQuery = 'DELETE FROM Inscriptions WHERE id_inscription = $1 RETURNING *';
        const values = [inscriptionId];
    
        try {
            const sessionResult = await pool.query(getSessionAndPaymentQuery, values);
            if (sessionResult.rows.length > 0) {
                const sessionId = sessionResult.rows[0].id_session;
                const paymentIntentId = sessionResult.rows[0].payment_intent_id; // id pour remboursement stripe
                const captureId = sessionResult.rows[0].capture_id; // id pour remboursement paypal
                const price = sessionResult.rows[0].prix_final; // prix final payé
    
                const deleteResult = await pool.query(deleteQuery, values);
                if (deleteResult.rows.length > 0) {
                    
                    if (paymentIntentId) {
                        await stripeRefund(paymentIntentId);
                    }
                    if (captureId) {
                        await paypalRefund(captureId, price);  
                    }
    
                    // Augmenter le nombre de places
                    await this.augmenterNombrePlaces(sessionId);
    
                    return deleteResult.rows[0];
                } else {
                    throw new Error('Inscription non trouvée.');
                }
            } else {
                throw new Error('Session associée à l\'inscription non trouvée ou formation sans prix défini.');
            }
        } catch (error) {
            throw error;
        }
    }
    


static async augmenterNombrePlaces(sessionId) {
    const query = 'UPDATE Sessions SET nombre_places = nombre_places + 1 WHERE id_session = $1 RETURNING *';
    try {
        const result = await pool.query(query, [sessionId]);
        if (result.rows.length > 0) {
            return result.rows[0];
        } else {
            throw new Error('Session non trouvée ou mise à jour du nombre de places échouée.');
        }
    } catch (error) {
        throw new Error('Erreur lors de la mise à jour du nombre de places de la session : ' + error.message);
    }
}
    static async checkInscription (clientId, formationId) {
        const query = `
          SELECT statut_inscription
          FROM inscriptions
          WHERE id_client = $1 AND id_formations = $2
        `;
        try {
          const result = await pool.query(query, [clientId, formationId]);
          if (result.rows.length > 0) {
            return result.rows[0].statut_inscription;
          } else {
            return null;
          }
        } catch (error) {
          throw error;
        }
      }

static async changerSessionInscription(inscriptionId, nouvelleSessionId) {
  const query = `
      UPDATE Inscriptions
      SET id_session = $2
      WHERE id_inscription = $1
      RETURNING *
  `;
  try {
      const result = await pool.query(query, [inscriptionId, nouvelleSessionId]);
      if (result.rows.length > 0) {
          return result.rows[0];
      } else {
          throw new Error('Inscription non trouvée ou mise à jour échouée.');
      }
  } catch (error) {
      throw new Error('Erreur lors de la mise à jour de la session de l\'inscription : ' + error.message);
  }
}


static async getInscriptionsByFormation(formationId) {
  try {
      const query = `
          SELECT 
              Inscriptions.*,
              Clients.adresse, 
              Clients.type,
              Users.email, 
              Particulier.nom AS nom_particulier, 
              Particulier.prenom, 
              Entreprise.nom_entreprise, 
              Entreprise.numero_tva
          FROM Inscriptions
          JOIN Clients ON Inscriptions.id_client = Clients.id_client
          JOIN Users ON Clients.id_user = Users.id_user
          LEFT JOIN Particulier ON Clients.id_client = Particulier.id_client
          LEFT JOIN Entreprise ON Clients.id_client = Entreprise.id_client
          WHERE Inscriptions.id_formations = $1 
              AND Inscriptions.statut_paiement = 'Payé' 
              AND Inscriptions.statut_inscription = 'Confirmé'
      `;
      const result = await pool.query(query, [formationId]);
      return result.rows.map(row => {

        let clientData = {
          id_inscription: row.id_inscription,
          id_client: row.id_client,
          id_formations: row.id_formations,
          id_session: row.id_session,
          statut_paiement: row.statut_paiement,
          date_inscription: row.date_inscription,
          statut_inscription: row.statut_inscription,
          adresse: row.adresse,
          type: row.type,
          email: row.email, 
      };
          if (row.type === 'Particulier') {
              return {
                  ...clientData,
                  nom: row.nom_particulier,
                  prenom: row.prenom,
                  nom_entreprise: null,
                  numero_tva: null
              };
          } else {
              return {
                  ...clientData,
                  nom: row.nom_entreprise,
                  prenom: null,
                  nom_entreprise: row.nom_entreprise,
                  numero_tva: row.numero_tva
              };
          }
      });
  } catch (error) {
      throw new Error('Erreur lors de la récupération des inscriptions par formation : ' + error.message);
  }
}

      
}

module.exports = Inscription;
