const express = require('express');
const UserController = require('../controllers/UserController');
const AuthController = require('../controllers/AuthorizeController');
const router = express.Router();

// Route pour l'inscription d'un utilisateur
router.post('/register', UserController.registerUser);

// Route pour la connexion d'un utilisateur
router.post('/login', AuthController.loginUser);

// Ajoutez ici d'autres routes relatives aux utilisateurs si nécessaire

module.exports = router;
