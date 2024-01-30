const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');

// Route pour l'inscription d'un utilisateur
router.post('/register', UserController.registerUser);

module.exports = router;
