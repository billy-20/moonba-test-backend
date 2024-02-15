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
    },

    annulerInscription: async (req, res) => {
        try {
            const inscriptionId = req.params.inscriptionId; // Récupération de l'id de l'inscription depuis les paramètres de la requête
            const inscription = await Inscription.annulerInscription(inscriptionId);
            res.status(200).json({ message: 'Inscription annulée avec succès', inscription });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    checkInscription: async (req, res) => {
        const { clientId, formationId } = req.params;
        try {
          const statutInscription = await Inscription.checkInscription(clientId, formationId);
          if (statutInscription) {
            res.json({ isInscrit: true, statut: statutInscription });
          } else {
            res.json({ isInscrit: false });
          }
        } catch (error) {
          console.error('Erreur lors de la vérification de l\'inscription:', error);
          res.status(500).send('Erreur serveur.');
        }
      },
      // inscriptionController.js

    changerSession :async (req, res) => {
      const { inscriptionId, nouvelleSessionId } = req.body; // Assurez-vous que le corps de la requête contient ces informations
    try {
      const inscriptionMiseAJour = await Inscription.changerSessionInscription(inscriptionId, nouvelleSessionId);
      res.status(200).json({ message: 'La session de l\'inscription a été mise à jour avec succès', inscription: inscriptionMiseAJour });
   } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

   getInscriptionsByFormation: async (req, res) => {
    try {
        const formationId = req.params.formationId;
        const inscriptions = await Inscription.getInscriptionsByFormation(formationId);
        res.json(inscriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

    

};

// Export du contrôleur inscriptionController
module.exports = inscriptionController;
