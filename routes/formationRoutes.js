const express = require('express');
const formationController = require('../controllers/formationsController');

const router = express.Router();

// Route pour obtenir toutes les formations
router.get('/getAllFormationsWithSessions', formationController.getAll);

// Route pour obtenir une formation par ID
router.get('/getFormationById/:id', formationController.getById);


router.delete('/formation/:id', formationController.deleteFormation);

module.exports = router;
