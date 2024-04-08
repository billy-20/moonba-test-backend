const express = require('express');
const UserController = require('../controllers/UserController');
const AuthController = require('../controllers/AuthorizeController');
const User = require('../models/userModel');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };

// Route pour l'inscription d'un utilisateur
router.post('/register', [
    body('email').isEmail().withMessage('Entrez une adresse email valide')
      .normalizeEmail(),
    body('nom').trim().escape().not().isEmpty().withMessage('Nom requis'),
    body('prenom').trim().escape().not().isEmpty().withMessage('Prénom requis'),
    body('adresse').trim().escape().optional(),
    body('numero_telephone').trim().escape().optional(),
    body('nom_entreprise').trim().escape().optional(),
    body('numero_tva').trim().escape().optional(),
    body('numero_entreprise').trim().escape().optional(),
    body('adresse_facturation').trim().escape().optional(),
  ], validate, UserController.registerUser);
  
router.post('/login', [
    body('email').isEmail().withMessage('Enter a valid email address'),
    body('password').isLength({ min: 2 }).withMessage('Password must be at least 2 characters long')
  ], validate, AuthController.loginUser);

router.get('/verifStatus' , UserController.verifyStatus);

router.post('/request-reset', UserController.requestPasswordReset);

router.post('/reset-password', UserController.resetPassword);

router.put('/updateUser/:id_client' , UserController.updateUser);

router.get('/clientInfo/:id_client' , UserController.getInfo);


module.exports = router;
