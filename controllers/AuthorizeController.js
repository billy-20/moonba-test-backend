const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

class AuthController {
  static async loginUser(req, res) {
    const { email, password } = req.body;

    try {
      const user = await User.authenticate(email, password);
      if (user) {
        // Créer un token JWT
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET, // Clé secrète pour signer le token
          { expiresIn: '1h' } // Durée de validité du token
        );

        // clientId n'est plus utilisé dans cette version car id_user représente l'identifiant unique dans Users
        res.json({ message: "Login successful", token, role: user.role , clientId : user.id});
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = AuthController;
