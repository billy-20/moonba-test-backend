// routes.js ou un fichier similaire

const express = require('express');
const sessionController = require('../controllers/SessionController'); // Assurez-vous que le chemin d'accès est correct
const router = express.Router();
const auth = require('../controllers/AuthorizeController');

// Route pour obtenir les sessions disponibles pour une formation donnée
router.get('/sessionsDisponibles/:formationId', sessionController.getSessionsDisponibles);

router.put('/inscriptions/changeSession', sessionController.changeSession);

router.post('/assignerSession' , auth.checkAdmin ,sessionController.assignerSession);

router.put('/addNombrePlaces/:sessionId' , auth.checkAdmin ,sessionController.addNombrePlaces);

router.post('/ajouterSession/:formationId' , auth.checkAdmin ,sessionController.ajouterSession);


router.get('/listeInscrits/:sessionId' ,sessionController.getInscriptionsParSession);

router.get('/getallSessions' ,sessionController.getAllSessionsWithInscription);

module.exports = router;
