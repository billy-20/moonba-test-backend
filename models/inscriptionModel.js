// InscriptionModel.js

// Import des dépendances
const pool = require('../db');

// Définition du modèle pour la gestion des inscriptions aux formations
class Inscription {
    // Méthode statique pour récupérer les inscriptions d'un client
    static async getInscriptionsByClient(clientId) {
        try {
            const query = 'SELECT * FROM Inscriptions WHERE id_client = $1 AND statut_paiement = \'Payé\'';
            const result = await pool.query(query, [clientId]);
            return result.rows;
        } catch (error) {
            throw new Error('Erreur lors de la récupération des inscriptions du client : ' + error.message);
        }
    }
}

// Export du modèle Inscription
module.exports = Inscription;
