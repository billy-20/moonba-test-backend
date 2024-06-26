// inscriptionController.js

const Inscription = require('../models/inscriptionModel');
const pool = require('../db'); 

const inscriptionController = {
  
    /**
     * Récupère les inscriptions d'un client par son identifiant.
     * 
     * @param {Object} req - L'objet de requête HTTP, contient l'identifiant du client dans req.params.clientId.
     * @param {Object} res - L'objet de réponse HTTP.
     */
    getInscriptionsByClient: async (req, res) => {
        try {
            const clientId = req.params.clientId; 
            const inscriptions = await Inscription.getInscriptionsByClient(clientId);
            res.status(200).json(inscriptions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

      /**
     * Annule une inscription par son identifiant.
     * 
     * @param {Object} req - L'objet de requête HTTP, contient l'identifiant de l'inscription dans req.params.inscriptionId.
     * @param {Object} res - L'objet de réponse HTTP.
     */
    annulerInscription: async (req, res) => {
        try {
            const inscriptionId = req.params.inscriptionId; 
            const inscription = await Inscription.annulerInscription(inscriptionId);
            res.status(200).json({ message: 'Inscription annulée avec succès', inscription });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Vérifie si un client est inscrit à une formation spécifique.
     * 
     * @param {Object} req - L'objet de requête HTTP, contient les identifiants du client et de la formation dans req.params.
     * @param {Object} res - L'objet de réponse HTTP.
     */
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
     
    /**
     * Change la session d'une inscription existante.
     * 
     * @param {Object} req - L'objet de requête HTTP, contient l'identifiant de l'inscription et le nouvel identifiant de session dans req.body.
     * @param {Object} res - L'objet de réponse HTTP.
     */
    changerSession :async (req, res) => {
      const { inscriptionId, nouvelleSessionId } = req.body; 
    try {
      const inscriptionMiseAJour = await Inscription.changerSessionInscription(inscriptionId, nouvelleSessionId);
      res.status(200).json({ message: 'La session de l\'inscription a été mise à jour avec succès', inscription: inscriptionMiseAJour });
   } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

    /**
     * Récupère les inscriptions à une formation spécifique par son identifiant.
     * 
     * @param {Object} req - L'objet de requête HTTP, contient l'identifiant de la formation dans req.params.formationId.
     * @param {Object} res - L'objet de réponse HTTP.
     */
   getInscriptionsByFormation: async (req, res) => {
    try {
        const formationId = req.params.formationId;
        const inscriptions = await Inscription.getInscriptionsByFormation(formationId);
        res.json(inscriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
},

 /**
     * Vérifie et valide le compte d'un utilisateur en utilisant un jeton de vérification.
     * Suit un processus de transaction pour s'assurer de la cohérence des données.
     * 
     * @param {Object} req - L'objet de requête HTTP, contient le jeton de vérification dans req.query.token.
     * @param {Object} res - L'objet de réponse HTTP.
     */
verify: async (req, res) => {
  const { token } = req.query;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const findUserQuery = 'SELECT * FROM Unverified_Users WHERE verification_token = $1';
    const userResult = await client.query(findUserQuery, [token]);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      const insertUserQuery = 'INSERT INTO Users (email, password, role ,verification_token,is_verified) VALUES ($1, $2, $3,$4, TRUE) RETURNING id_user';
      const insertedUser = await client.query(insertUserQuery, [user.email, user.password, 'Client',token]);
      const id_user = insertedUser.rows[0].id_user;

      const insertClientQuery = 'INSERT INTO Clients (id_user, adresse, type, numero_telephone) VALUES ($1, $2, $3, $4) RETURNING id_client';
      const clientResult = await client.query(insertClientQuery, [id_user, user.adresse, user.type, user.numero_telephone]);
      const id_client = clientResult.rows[0].id_client;
      if (user.type === 'Particulier') {
        const insertParticulierQuery = 'INSERT INTO Particulier (id_client, nom, prenom) VALUES ($1, $2, $3)';
        await client.query(insertParticulierQuery, [id_client, user.nom, user.prenom]);
      } else {
        const insertEntrepriseQuery = 'INSERT INTO Entreprise (id_client, nom_entreprise, numero_tva, numero_entreprise, adresse_facturation) VALUES ($1, $2, $3, $4 ,$5)';
        await client.query(insertEntrepriseQuery, [id_client, user.nom_entreprise, user.numero_tva, user.numero_entreprise , user.adresse_facturation ]);
      }

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

module.exports = inscriptionController;
