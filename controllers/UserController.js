const User = require('../models/userModel');

class UserController {

  /**
   * Enregistre un nouvel utilisateur dans le système.
   * 
   * @param {Object} req - L'objet de la requête HTTP, contenant les informations de l'utilisateur.
   * @param {Object} res - L'objet de la réponse HTTP.
   */
  static async registerUser(req, res) {
    const { email, adresse, type,numero_telephone, nom, prenom, nom_entreprise, numero_tva, password, numero_entreprise, adresse_facturation, verificationToken} = req.body;

    try {
      const newUser = await User.createUser(email, adresse, type,numero_telephone, nom, prenom, nom_entreprise, numero_tva, password,numero_entreprise,adresse_facturation, verificationToken);
      res.json(newUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Récupère les informations d'un client par son identifiant.
   * 
   * @param {Object} req - L'objet de la requête HTTP, contenant l'identifiant du client dans req.params.id_client.
   * @param {Object} res - L'objet de la réponse HTTP.
   */
  static async getInfo(req,res){
    const id_client = req.params.id_client;

    try {
        const clientInfo = await User.getClientInfo(id_client);
        res.status(200).json(clientInfo);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }


  }

    /**
   * Met à jour les informations d'un utilisateur.
   * 
   * @param {Object} req - L'objet de la requête HTTP, contenant l'identifiant du client et les nouvelles informations dans req.body.
   * @param {Object} res - L'objet de la réponse HTTP.
   */
  static async updateUser(req, res){
    const id_client = req.params.id_client;
    const {  email, newPassword, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva , numero_entreprise } = req.body;
    
    try {
        const result = await User.updateClientInfo(id_client, email, newPassword, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva,numero_entreprise);
        
        if (result.success) {
            res.status(200).json({ message: 'Client and user information updated successfully.' });
        } else {
            res.status(400).json({ message: 'Failed to update client and user information.' });
        }
    } catch (error) {
        console.error('Controller Error:', error.message);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }


  }

  /**
   * Initie une demande de réinitialisation de mot de passe pour l'utilisateur.
   * 
   * @param {Object} req - L'objet de la requête HTTP, contenant l'email de l'utilisateur dans req.body.email.
   * @param {Object} res - L'objet de la réponse HTTP.
   */
  static async requestPasswordReset(req, res) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email manquant." });
    }
  
    try {
      await User.initiatePasswordReset(email);
      res.status(200).json({ message: " un corurier de réinitialisation a été envoyé a votre email." });
    } catch (error) {
      console.error('Error initiating password reset:', error);
      res.status(500).json({ error: 'Erreur interne du serveur lors de la demande de réinitialisation du mot de passe.' });
    }
  }

 /**
   * Réinitialise le mot de passe de l'utilisateur.
   * 
   * @param {Object} req - L'objet de la requête HTTP, contenant le token et le nouveau mot de passe dans req.body.
   * @param {Object} res - L'objet de la réponse HTTP.
   */
static async resetPassword(req, res) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token ou nouveau mot de passe manquant." });
  }

  try {
    await User.resetPassword(token, newPassword);
    res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Erreur interne du serveur lors de la réinitialisation du mot de passe.' });
  }
}

/**
   * Vérifie le statut de vérification d'un utilisateur à l'aide d'un token.
   * 
   * @param {Object} req - L'objet de la requête HTTP, contenant le token de vérification dans req.query.verificationToken.
   * @param {Object} res - L'objet de la réponse HTTP.
   */
  static async verifyStatus(req,res) {
  const { verificationToken } = req.query;

  if (!verificationToken) {
    return res.status(400).json({ message: "Token de vérification manquant." });
  }

  try {
    const isVerified = await User.checkVerificationStatus(verificationToken);
    res.json({ isVerified });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ message: "Erreur serveur lors de la vérification du statut." });
  }

}

  
}

module.exports = UserController;
