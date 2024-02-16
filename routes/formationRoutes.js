const express = require('express');
const formationController = require('../controllers/formationsController');
const auth = require('../controllers/AuthorizeController');

const router = express.Router();

// Route pour obtenir toutes les formations
router.get('/getAllFormationsWithSessions', formationController.getAll);

// Route pour obtenir une formation par ID
router.get('/getFormationById/:id', formationController.getById);


router.delete('/formation/:id', formationController.deleteFormation);

router.post('/addFormation', auth.checkAdmin, formationController.createFormation);


router.put('/updateFormation/:id' ,auth.checkAdmin, formationController.updateFormation);

router.get('/getAllFormationsWithoutSessions' ,auth.checkAdmin, formationController.getAllWithoutSessions);


module.exports = router;
