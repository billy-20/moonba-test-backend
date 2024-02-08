// inscriptionController.js

// Import des dépendances
const Inscription = require('../models/inscriptionModel');

// Contrôleur pour la gestion des inscriptions aux formations
const inscriptionController = {
    // Méthode pour récupérer les inscriptions d'un client
    getInscriptionsByClient: async (req, res) => {
        try {
            const clientId = req.params.clientId; // Récupération de l'id du client depuis les paramètres de la requête
            const inscriptions = await Inscription.getInscriptionsByClient(clientId);
            res.status(200).json(inscriptions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

// Export du contrôleur inscriptionController
module.exports = inscriptionController;
