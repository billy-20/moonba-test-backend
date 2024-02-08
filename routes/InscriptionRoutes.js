// routes.js

// Import des dépendances
const express = require('express');
const inscriptionController = require('../controllers/InscriptionController');

// Initialisation du routeur express
const router = express.Router();

// Routes pour la gestion des inscriptions
router.get('/:clientId/inscriptions', inscriptionController.getInscriptionsByClient);

// Export du routeur
module.exports = router;
