const express = require('express');
const formationController = require('../controllers/formationsController');

const router = express.Router();

// Route pour obtenir toutes les formations
router.get('/getAllFormations', formationController.getAll);

// Route pour obtenir une formation par ID
router.get('/getFormationById/:id', formationController.getById);

module.exports = router;
