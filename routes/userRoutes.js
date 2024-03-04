const express = require('express');
const UserController = require('../controllers/UserController');
const AuthController = require('../controllers/AuthorizeController');
const User = require('../models/userModel');
const router = express.Router();

// Route pour l'inscription d'un utilisateur
router.post('/register', UserController.registerUser);

// Route pour la connexion d'un utilisateur
router.post('/login', AuthController.loginUser);

router.get('/verifStatus' , UserController.verifyStatus);

router.put('/updateUser/:id_client' , UserController.updateUser);

router.get('/clientInfo/:id_client' , UserController.getInfo);

// Ajoutez ici d'autres routes relatives aux utilisateurs si nécessaire

module.exports = router;
