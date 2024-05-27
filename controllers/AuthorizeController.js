const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

/**
 * Classe AuthController pour gérer l'authentification et l'autorisation.
 */
class AuthController {
  /**
   * loginUser - Authentifie un utilisateur et génère un JWT s'il est authentifié avec succès.
   * 
   * @param {Object} req - L'objet de requête contenant les identifiants de l'utilisateur.
   * @param {Object} res - L'objet de réponse pour renvoyer le JWT et les informations de l'utilisateur.
   */
  static async loginUser(req, res) {
    const { email, password } = req.body;

    try {
      // Authentifier l'utilisateur avec l'email et le mot de passe.
      const user = await User.authenticate(email, password);
      if (user) {
        // Obtenir l'ID client pour l'utilisateur authentifié.
        const clientId = await User.getClientId(user.id);
        
        // Créer un JWT avec les détails de l'utilisateur.
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET, 
          { expiresIn: '1h' } // Le token expire en 1 heure.
        );

        // Répondre avec un message de succès, le token, le rôle de l'utilisateur et l'ID client.
        res.json({ message: "Connexion réussie", token, role: user.role, clientId: clientId });
      } else {
        // Répondre avec un message d'erreur si l'authentification échoue.
        res.status(401).json({ message: "Identifiants invalides" });
      }
    } catch (error) {
      console.error(error);
      // Répondre avec un message d'erreur de serveur interne.
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  /**
   * checkAdmin - Middleware pour vérifier si l'utilisateur authentifié est un administrateur.
   * 
   * @param {Object} req - L'objet de requête.
   * @param {Object} res - L'objet de réponse.
   * @param {Function} next - La fonction middleware suivante dans la pile.
   */
  static async checkAdmin(req, res, next){
    try {
        // Extraire le token de l'en-tête Authorization.
        const token = req.headers.authorization.split(" ")[1]; 
        // Décoder et vérifier le JWT.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Vérifier si le rôle décodé n'est pas admin.
        if (decoded.role !== 'Admin') {
            // Répondre avec un message d'erreur d'accès interdit si ce n'est pas un admin.
            return res.status(403).json({ message: "Accès refusé" });
        }

        // Attacher l'utilisateur décodé à l'objet de requête.
        req.user = decoded;
        next(); // Appeler le middleware suivant dans la pile.
    } catch (error) {
        // Répondre avec un message d'échec d'authentification.
        return res.status(401).json({ message: "Authentification échouée" });
    }
  }


}

module.exports = AuthController;
