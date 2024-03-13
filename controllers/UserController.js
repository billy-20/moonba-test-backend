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
    const {  email, newPassword, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva } = req.body;
    
    try {
        const result = await User.updateClientInfo(id_client, email, newPassword, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva);
        
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
