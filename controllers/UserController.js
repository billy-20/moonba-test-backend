const User = require('../models/userModel');

class UserController {
  static async registerUser(req, res) {
    const { email, adresse, type, nom, prenom, nom_entreprise, numero_tva, password } = req.body;

    try {
      const newUser = await User.createUser(email, adresse, type, nom, prenom, nom_entreprise, numero_tva, password);
      res.json(newUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = UserController;
