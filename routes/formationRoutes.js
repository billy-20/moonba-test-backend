const express = require('express');
const formationController = require('../controllers/formationsController');
const auth = require('../controllers/AuthorizeController');

const router = express.Router();
const multer = require('multer');


const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, 'images/'); 
    },
    filename: function(req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  
  const upload = multer({ storage: storage });

// Route pour obtenir toutes les formations
router.get('/getAllFormationsWithSessions', formationController.getAll);

// Route pour obtenir une formation par ID
router.get('/getFormationById/:id', formationController.getById);


router.delete('/formation/:id', formationController.deleteFormation);

router.post('/addFormation', auth.checkAdmin, upload.single('photo'), formationController.createFormation);


router.put('/updateFormation/:id' ,auth.checkAdmin, formationController.updateFormation);

router.get('/getAllFormationsWithoutSessions' ,auth.checkAdmin, formationController.getAllWithoutSessions);

router.get('/getFormationDetails/:id' , formationController.getFormationDetails);

router.delete('/deleteFormation/:id' , formationController.deleteFormation);

module.exports = router;
