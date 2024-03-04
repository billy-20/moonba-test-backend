// inscriptionController.js

// Import des dépendances
const Inscription = require('../models/inscriptionModel');
const pool = require('../db'); // Mettez à jour ce chemin selon votre structure de fichiers

// Contrôleur pour la gestion des inscriptions aux formations
const inscriptionController = {
    // Méthode pour récupérer les inscriptions d'un client
    getInscriptionsByClient: async (req, res) => {
        try {
            const clientId = req.params.clientId; // Récupération de l'id du client depuis les paramètres de la requête
            const inscriptions = await Inscription.getInscriptionsByClient(clientId);
            res.status(200).json(inscriptions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    annulerInscription: async (req, res) => {
        try {
            const inscriptionId = req.params.inscriptionId; // Récupération de l'id de l'inscription depuis les paramètres de la requête
            const inscription = await Inscription.annulerInscription(inscriptionId);
            res.status(200).json({ message: 'Inscription annulée avec succès', inscription });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    checkInscription: async (req, res) => {
        const { clientId, formationId } = req.params;
        try {
          const statutInscription = await Inscription.checkInscription(clientId, formationId);
          if (statutInscription) {
            res.json({ isInscrit: true, statut: statutInscription });
          } else {
            res.json({ isInscrit: false });
          }
        } catch (error) {
          console.error('Erreur lors de la vérification de l\'inscription:', error);
          res.status(500).send('Erreur serveur.');
        }
      },
      // inscriptionController.js

    changerSession :async (req, res) => {
      const { inscriptionId, nouvelleSessionId } = req.body; // Assurez-vous que le corps de la requête contient ces informations
    try {
      const inscriptionMiseAJour = await Inscription.changerSessionInscription(inscriptionId, nouvelleSessionId);
      res.status(200).json({ message: 'La session de l\'inscription a été mise à jour avec succès', inscription: inscriptionMiseAJour });
   } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

   getInscriptionsByFormation: async (req, res) => {
    try {
        const formationId = req.params.formationId;
        const inscriptions = await Inscription.getInscriptionsByFormation(formationId);
        res.json(inscriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
},


verify: async (req, res) => {
  const { token } = req.query;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Recherche dans Unverified_Users
    const findUserQuery = 'SELECT * FROM Unverified_Users WHERE verification_token = $1';
    const userResult = await client.query(findUserQuery, [token]);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      // Insertion dans Users
      const insertUserQuery = 'INSERT INTO Users (email, password, role ,verification_token,is_verified) VALUES ($1, $2, $3,$4, TRUE) RETURNING id_user';
      const insertedUser = await client.query(insertUserQuery, [user.email, user.password, 'Client',token]);
      const id_user = insertedUser.rows[0].id_user;

      const insertClientQuery = 'INSERT INTO Clients (id_user, adresse, type, numero_telephone) VALUES ($1, $2, $3, $4) RETURNING id_client';
      const clientResult = await client.query(insertClientQuery, [id_user, user.adresse, user.type, user.numero_telephone]);
      const id_client = clientResult.rows[0].id_client;
      // Insertion conditionnelle dans Particulier ou Entreprise
      if (user.type === 'Particulier') {
        const insertParticulierQuery = 'INSERT INTO Particulier (id_client, nom, prenom) VALUES ($1, $2, $3)';
        await client.query(insertParticulierQuery, [id_client, user.nom, user.prenom]);
      } else {
        const insertEntrepriseQuery = 'INSERT INTO Entreprise (id_client, nom_entreprise, numero_tva, numero_entreprise) VALUES ($1, $2, $3, $4)';
        await client.query(insertEntrepriseQuery, [id_client, user.nom_entreprise, user.numero_tva, user.numero_entreprise ]);
      }

      // Suppression de l'entrée dans Unverified_Users
      const deleteUserQuery = 'DELETE FROM Unverified_Users WHERE verification_token = $1';
      await client.query(deleteUserQuery, [token]);

      await client.query('COMMIT');
      res.status(200).json({ message: 'Votre compte a été vérifié avec succès.' });
    } else {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Jeton de vérification invalide ou déjà utilisé.' });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la vérification du compte.' });
  } finally {
    client.release();
  }
},


    

};

// Export du contrôleur inscriptionController
module.exports = inscriptionController;
