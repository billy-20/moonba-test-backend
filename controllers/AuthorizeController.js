const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

class AuthController {
  static async loginUser(req, res) {
    const { email, password } = req.body;

    try {
      const user = await User.authenticate(email, password);
      if (user) {

        const clientId = await User.getClientId(user.id);
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET, 
          { expiresIn: '1h' } 
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


 static async checkAdmin(req, res, next){
    try {
        const token = req.headers.authorization.split(" ")[1]; 
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'Admin') {
            return res.status(403).json({ message: "Accès refusé" });
        }

        
        req.user = decoded;

        next(); 
    } catch (error) {
        return res.status(401).json({ message: "Authentification échouée" });
    }
}

// le next sert a passer au prochain middleware , si c'est admin alors il passe direct au prochain, si role==Admin alors le process continue


}

module.exports = AuthController;
