// routes.js

// Import des dépendances
const express = require('express');
const inscriptionController = require('../controllers/InscriptionController');

// Initialisation du routeur express
const router = express.Router();

// Routes pour la gestion des inscriptions
router.get('/:clientId/inscriptions', inscriptionController.getInscriptionsByClient);

router.put('/annuler/:inscriptionId', inscriptionController.annulerInscription);

router.get('/:clientId/inscription/:formationId', inscriptionController.checkInscription);


router.get('/formations/:formationId/inscriptions', inscriptionController.getInscriptionsByFormation);

// Dans votre fichier de routes

router.post('/changerSession', inscriptionController.changerSession);


// Export du routeur
module.exports = router;
