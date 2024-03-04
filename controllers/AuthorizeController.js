const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

class AuthController {
  static async loginUser(req, res) {
    const { email, password } = req.body;

    try {
      const user = await User.authenticate(email, password);
      if (user) {

        const clientId = await User.getClientId(user.id);
        // Créer un token JWT
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET, // Clé secrète pour signer le token
          { expiresIn: '1h' } // Durée de validité du token
        );

        res.json({ message: "Login successful", token, role: user.role , clientId : clientId});
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }


// Middleware pour vérifier le token et le rôle
 static async checkAdmin(req, res, next){
    try {
        const token = req.headers.authorization.split(" ")[1]; // Supposons que le token est envoyé en tant que "Bearer <token>"
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'Admin') {
            return res.status(403).json({ message: "Accès refusé" });
        }

        // Ajouter les informations décodées à l'objet de requête pour utilisation ultérieure
        req.user = decoded;

        next(); // Passer au prochain middleware ou route handler si l'utilisateur est un admin
    } catch (error) {
        return res.status(401).json({ message: "Authentification échouée" });
    }
}


}

module.exports = AuthController;
