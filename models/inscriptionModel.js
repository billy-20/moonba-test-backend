// InscriptionModel.js

// Import des dépendances
const pool = require('../db');

// Définition du modèle pour la gestion des inscriptions aux formations
class Inscription {
    // Méthode statique pour récupérer les inscriptions d'un client
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
      //DELETE FROM formations WHERE id_formations = $1 RETURNING *
        const query = 'DELETE FROM Inscriptions WHERE id_inscription = $1 RETURNING *';
        const values = [ inscriptionId];

        try {
            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                return result.rows[0];
            } else {
                throw new Error('Inscription non trouvée.');
            }
        } catch (error) {
            throw error;
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
            // Retourner le statut de l'inscription si trouvé
            return result.rows[0].statut_inscription;
          } else {
            // Aucune inscription trouvée pour cette combinaison client/formation
            return null;
          }
        } catch (error) {
          throw error;
        }
      }
      // Dans InscriptionModel.js

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

// Dans InscriptionModel.js

// Méthode pour récupérer les inscriptions par formation
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
          email: row.email, // Inclure l'email dans les résultats
      };
          // Structurer les données selon que le client est un Particulier ou une Entreprise
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

// Export du modèle Inscription
module.exports = Inscription;
