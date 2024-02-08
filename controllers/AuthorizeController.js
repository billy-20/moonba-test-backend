const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

class AuthController {
  static async loginUser(req, res) {
    const { email, password } = req.body;

    try {
      const user = await User.authenticate(email, password);
      let clientId = user.id;
      if (user) {
        // Créer un token JWT
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET, // Clé secrète pour signer le token
          { expiresIn: '1h' } // Durée de validité du token
        );

        res.json({ message: "Login successful", token , clientId });
        console.log(clientId);
        console.log("login OK");
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
