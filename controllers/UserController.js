const User = require('../models/userModel');

class UserController {
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

  static async getInfo(req,res){
    const id_client = req.params.id_client;

    try {
        const clientInfo = await User.getClientInfo(id_client);
        res.status(200).json(clientInfo);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }


  }

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

  // Méthode pour réinitialiser le mot de passe
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
