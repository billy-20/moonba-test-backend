// routes.js ou un fichier similaire

const express = require('express');
const sessionController = require('../controllers/SessionController'); // Assurez-vous que le chemin d'accès est correct
const router = express.Router();

// Route pour obtenir les sessions disponibles pour une formation donnée
router.get('/sessionsDisponibles/:formationId', sessionController.getSessionsDisponibles);

router.put('/inscriptions/changeSession', sessionController.changeSession);


module.exports = router;
