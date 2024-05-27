const pool = require('../db');
const bcrypt = require('bcrypt');
//const nodemailer = require('nodemailer');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const { v4: uuidv4 } = require('uuid'); // Pour générer des UUID uniques


class User {


    /**
   * Crée un nouvel utilisateur et insère ses informations dans la base de données.
   * Envoie également un email de bienvenue avec un lien de vérification.
   * 
   * @param {string} email - L'email de l'utilisateur.
   * @param {string} adresse - L'adresse de l'utilisateur.
   * @param {string} type - Le type de l'utilisateur ('Particulier' ou 'Entreprise').
   * @param {string} numero_telephone - Le numéro de téléphone de l'utilisateur.
   * @param {string} nom - Le nom de l'utilisateur (pour un particulier).
   * @param {string} prenom - Le prénom de l'utilisateur (pour un particulier).
   * @param {string} nom_entreprise - Le nom de l'entreprise (pour une entreprise).
   * @param {string} numero_tva - Le numéro de TVA de l'entreprise (pour une entreprise).
   * @param {string} password - Le mot de passe de l'utilisateur à hasher.
   * @param {string} numero_entreprise - Le numéro d'enregistrement de l'entreprise (pour une entreprise).
   * @param {string} adresse_facturation - L'adresse de facturation (pour une entreprise).
   * @returns {Promise<Object>} Un objet indiquant si l'utilisateur a été créé et contenant un message et un token de vérification.
   */
  static async createUser(email, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva, password, numero_entreprise, adresse_facturation) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const verificationToken = uuidv4();

    const emailCheckQuery = 'SELECT * FROM users WHERE email = $1';
    const emailCheckValues = [email];

    try {
        const emailCheckResult = await pool.query(emailCheckQuery, emailCheckValues);
        if (emailCheckResult.rows.length > 0) {
            console.log("error email alreadyr existss");

            return { success: false, message: 'Email exite deja ' };
        }

        const insertQuery = 'INSERT INTO Unverified_Users (email, password, role, verification_token, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva, numero_entreprise, adresse_facturation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id_user';
        const insertValues = [email, hashedPassword, 'Client', verificationToken, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva, numero_entreprise, adresse_facturation];
        
        await pool.query(insertQuery, insertValues);
        await User.sendWelcomeEmail(email, verificationToken);
        return { success: true, message: 'User created, verification pending.', verificationToken: verificationToken };
    } catch (error) {
        console.error('Error in user creation process:', error);
        throw error; 
    }
}

  /**
   * Vérifie le statut de vérification d'un utilisateur à l'aide de son token de vérification.
   * 
   * @param {string} verificationToken - Le token de vérification de l'utilisateur.
   * @returns {Promise<boolean>} True si l'utilisateur est vérifié, false sinon.
   */
  static async checkVerificationStatus(verificationToken) {
    const query = 'SELECT is_verified FROM Users WHERE verification_token = $1';
    try {
      const result = await pool.query(query, [verificationToken]);
      if (result.rows.length > 0) {
        const { is_verified } = result.rows[0];
        return is_verified;
      } else {
        return false; 
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      throw error;
    }
  }

   /**
   * Récupère les informations détaillées d'un client par son identifiant.
   * 
   * @param {number} id_client - L'identifiant du client.
   * @returns {Promise<Object>} Les informations détaillées du client.
   */
  static async getClientInfo(id_client) {
    try {
        const clientQuery = 'SELECT * FROM Clients WHERE id_client = $1';
        const clientResult = await pool.query(clientQuery, [id_client]);
        if (clientResult.rows.length === 0) {
            throw new Error('Client not found');
        }
        const clientInfo = clientResult.rows[0];

        const userQuery = 'SELECT email,password, role FROM Users WHERE id_user = $1';
        const userResult = await pool.query(userQuery, [clientInfo.id_user]);
        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }
        const userInfo = userResult.rows[0];

        let returnInfo = {
            id_client: id_client,
            password:userInfo.password,
            email: userInfo.email,
            role: userInfo.role,
            adresse: clientInfo.adresse,
            type: clientInfo.type,
            numero_telephone:clientInfo.numero_telephone
        };

        if (clientInfo.type === 'Entreprise') {
            const entrepriseQuery = 'SELECT * FROM Entreprise WHERE id_client = $1';
            const entrepriseResult = await pool.query(entrepriseQuery, [id_client]);
            if (entrepriseResult.rows.length > 0) {
                const entrepriseInfo = entrepriseResult.rows[0];
                returnInfo = { ...returnInfo, nom_entreprise: entrepriseInfo.nom_entreprise, numero_entreprise: entrepriseInfo.numero_entreprise , numero_tva: entrepriseInfo.numero_tva };
            }
        }
        else if (clientInfo.type === 'Particulier') {
            const particulierQuery = 'SELECT * FROM Particulier WHERE id_client = $1';
            const particulierResult = await pool.query(particulierQuery, [id_client]);
            if (particulierResult.rows.length > 0) {
                const particulierInfo = particulierResult.rows[0];
                returnInfo = { ...returnInfo, nom: particulierInfo.nom, prenom: particulierInfo.prenom };
            }
        }

        return returnInfo;
    } catch (error) {
        console.error('Error getting client info:', error);
        throw error;
    }
}


  /**
   * Met à jour les informations d'un client et de l'utilisateur associé.
   * 
   * @param {number} id_client - L'identifiant du client.
   * @param {string} email - Le nouvel email de l'utilisateur (optionnel).
   * @param {string} newPassword - Le nouveau mot de passe de l'utilisateur (optionnel).
   * @param {string} adresse - La nouvelle adresse du client (optionnel).
   * @param {string} type - Le nouveau type du client ('Particulier' ou 'Entreprise') (optionnel).
   * @param {string} numero_telephone - Le nouveau numéro de téléphone du client (optionnel).
   * @param {string} nom - Le nouveau nom du client (pour un particulier) (optionnel).
   * @param {string} prenom - Le nouveau prénom du client (pour un particulier) (optionnel).
   * @param {string} nom_entreprise - Le nouveau nom de l'entreprise (pour une entreprise) (optionnel).
   * @param {string} numero_tva - Le nouveau numéro de TVA de l'entreprise (pour une entreprise) (optionnel).
   * @param {string} numero_entreprise - Le nouveau numéro d'enregistrement de l'entreprise (pour une entreprise) (optionnel).
   * @returns {Promise<Object>} Un objet indiquant si la mise à jour a réussi et contenant un message descriptif.
   */
  static async updateClientInfo(id_client, email, newPassword, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva, numero_entreprise) {
    try {
        await pool.query('BEGIN');

        if (email || newPassword) {
            let userUpdateParts = [];
            let userValues = [];
            let counter = 1;

            if (email) {
                userUpdateParts.push(`email = $${counter}`);
                userValues.push(email);
                counter++;
            }

            if (newPassword) {
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
                userUpdateParts.push(`password = $${counter}`);
                userValues.push(hashedPassword);
                counter++;
            }

            userValues.push(id_client);
            const updateUserQuery = `
                UPDATE Users
                SET ${userUpdateParts.join(', ')}
                WHERE id_user = (SELECT id_user FROM Clients WHERE id_client = $${counter})
            `;
            await pool.query(updateUserQuery, userValues);
        }

        // Mise à jour conditionnelle dans Clients
        let clientUpdateParts = [];
        let clientValues = [];
        let clientCounter = 1;

        if (adresse) {
            clientUpdateParts.push(`adresse = $${clientCounter}`);
            clientValues.push(adresse);
            clientCounter++;
        }


        if (type) {
            clientUpdateParts.push(`type = $${clientCounter}`);
            clientValues.push(type);
            clientCounter++;
        }

        if (type === 'Entreprise' ) {

          if(nom_entreprise){
            const updateEntrepriseQuery = `
            UPDATE entreprise
            SET nom_entreprise = COALESCE($1, nom_entreprise)
            WHERE id_client = $2
        `;
        await pool.query(updateEntrepriseQuery, [nom_entreprise, id_client]);
          }


          if(numero_tva){
            const updateEntrepriseQuery = `
            UPDATE entreprise
            SET numero_tva = COALESCE($1, numero_tva)
            WHERE id_client = $2
        `;
        await pool.query(updateEntrepriseQuery, [ numero_tva, id_client]);
          }

          if(numero_entreprise){
            const updateEntrepriseQuery = `
            UPDATE entreprise
            SET numero_entreprise = COALESCE($1, numero_entreprise)
            WHERE id_client = $2
        `;
        await pool.query(updateEntrepriseQuery, [numero_entreprise, id_client]);
          }
         
      }


      
      if (type === 'Particulier' ) {
        if(nom){
          const updateParticulierQuery = `
              UPDATE particulier
              SET nom = COALESCE($1, nom)
              WHERE id_client = $2
          `;
          await pool.query(updateParticulierQuery, [nom, id_client]);
        }

        if(prenom){
          const updateParticulierQuery = `
              UPDATE particulier
              SET  prenom = COALESCE($1, prenom)
              WHERE id_client = $2
          `;
          await pool.query(updateParticulierQuery, [ prenom, id_client]);
        }
        
    }
      
      if (numero_telephone) {
          clientUpdateParts.push(`numero_telephone = $${clientCounter}`);
          clientValues.push(numero_telephone);
          clientCounter++;
      }

        if (clientUpdateParts.length > 0) {
            clientValues.push(id_client);
            const updateClientQuery = `
                UPDATE Clients
                SET ${clientUpdateParts.join(', ')}
                WHERE id_client = $${clientCounter}
            `;
            await pool.query(updateClientQuery, clientValues);
        }

        await pool.query('COMMIT');

        return { success: true, message: 'Client and User info updated successfully.' };
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error during client and user info update:', error);
        throw error;
    }
}

   /**
   * Récupère l'identifiant du client associé à un identifiant d'utilisateur.
   * 
   * @param {number} id_user - L'identifiant de l'utilisateur.
   * @returns {Promise<number>} L'identifiant du client.
   */
  static async getClientId(id_user){

    try{
      const query = 'SELECT id_client FROM clients WHERE id_user = $1';
      const values = [id_user]; 

      const result = await pool.query(query, values);
      if (result.rows.length > 0) {
        return result.rows[0].id_client; 
      } else {
        throw new Error('No client found for this user');
      }

    }catch(error){
      console.log("error get client id :",error);
      throw error;
    }



  }

  /**
   * Initie un processus de réinitialisation de mot de passe en créant un token de réinitialisation.
   * Envoie un email à l'utilisateur avec des instructions pour réinitialiser son mot de passe.
   * 
   * @param {string} email - L'email de l'utilisateur.
   */
  static async initiatePasswordReset(email) {
    const user = await this.findUserByEmail(email);
    if (!user) {
        throw new Error('Aucun utilisateur trouvé avec cet email');
    }

    const resetToken = uuidv4();
    // Enregistrez ce token dans votre base de données avec une date d'expiration
    // Exemple: "UPDATE users SET reset_token = $1, reset_token_expire = NOW() + INTERVAL '1 hour' WHERE email = $2"
    // Assurez-vous de mettre en place la logique correspondante dans votre DB pour gérer ces champs
    await this.saveResetToken(user.id_user, resetToken);

    await this.sendPasswordResetEmail(email, resetToken);
}

/**
   * Envoie un email de réinitialisation de mot de passe à l'utilisateur.
   * 
   * @param {string} email - L'email de l'utilisateur.
   * @param {string} token - Le token de réinitialisation du mot de passe.
   */
  static async sendPasswordResetEmail(email, token) {
        const resetUrl = `https://moonba-studio-dev.webflow.io/reset-password?token=${token}`;
        const msg = {
            to: email,
            from: 'formations@moonba-studio.com', // Remplacez par votre adresse email d'envoi
            subject: 'Réinitialisation de votre mot de passe',
            html: `
                <p>Pour réinitialiser votre mot de passe, veuillez cliquer sur le lien suivant :</p>
                <a href="${resetUrl}">Réinitialiser mon mot de passe</a>
                <p>Si vous n'avez pas demandé de réinitialisation, veuillez ignorer cet email.</p>
            `,
        };

        try {
            await sgMail.send(msg);
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
            throw error;
        }
    }

  /**
   * Trouve un utilisateur par son email.
   * 
   * @param {string} email - L'email de l'utilisateur à trouver.
   * @returns {Promise<Object|null>} L'utilisateur trouvé ou null si aucun utilisateur n'est trouvé.
   */
  static async findUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1'; // Adaptez à votre schéma de DB
    const values = [email];
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
        return result.rows[0];
    } else {
        return null;
    }
}

   /**
   * Enregistre un token de réinitialisation de mot de passe dans la base de données pour un utilisateur.
   * 
   * @param {number} userId - L'identifiant de l'utilisateur.
   * @param {string} resetToken - Le token de réinitialisation du mot de passe.
   */ 
  static async saveResetToken(userId, resetToken) {
    const query = 'UPDATE users SET reset_token = $1, reset_token_expire = NOW() + INTERVAL \'1 hour\' WHERE id_user = $2';
    const values = [resetToken, userId];
    await pool.query(query, values);
}

 /**
   * Réinitialise le mot de passe d'un utilisateur en utilisant un token de réinitialisation.
   * 
   * @param {string} token - Le token de réinitialisation du mot de passe.
   * @param {string} newPassword - Le nouveau mot de passe de l'utilisateur.
   */
  static async resetPassword(token, newPassword) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Vérifiez d'abord la validité du token et sa date d'expiration
    const queryFindToken = 'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expire > NOW()';
    const user = await pool.query(queryFindToken, [token]);
    if (user.rows.length === 0) {
        throw new Error('Token invalide ou expiré');
    }

    // Réinitialisez le mot de passe
    const queryResetPassword = 'UPDATE users SET password = $1, reset_token = NULL, reset_token_expire = NULL WHERE reset_token = $2';
    await pool.query(queryResetPassword, [hashedPassword, token]);
}


 /**
   * Authentifie un utilisateur en vérifiant son email et son mot de passe.
   * 
   * @param {string} email - L'email de l'utilisateur.
   * @param {string} password - Le mot de passe de l'utilisateur.
   * @returns {Promise<Object>} L'utilisateur authentifié avec son id, email, et rôle.
   */
  static async authenticate(email, password) {
    const query = 'SELECT id_user, email, password, role FROM Users WHERE email = $1';
    const values = [email];

    try {
      const result = await pool.query(query, values);
      if (result.rows.length > 0) {
        const user = result.rows[0];

        if (await bcrypt.compare(password, user.password)) {
          return { id: user.id_user, email: user.email, role: user.role };
        } else {
          throw new Error('Invalid credentials');
        }
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      throw error;
    }
  }


/**
   * Envoie un email de bienvenue à un nouvel utilisateur avec un lien pour vérifier son adresse email.
   * 
   * @param {string} email - L'email du nouvel utilisateur.
   * @param {string} token - Le token de vérification pour activer le compte de l'utilisateur.
   */
  static async sendWelcomeEmail(email, token) {
    const verificationUrl = `https://test-backend-gluw.onrender.com/clients/verify?token=${token}`;
    const msg = {
      to: email,
      from: 'formations@moonba-studio.com',
      subject: 'Bienvenue sur notre site web Moonba Studio!',
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h1 style="color: #0066CC;">Bienvenue sur notre site web Moonba Studio!</h1>
          <p>Nous sommes ravis de vous avoir parmi nous. Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous.</p>
          <a href="${verificationUrl}" style="background-color: #0066CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px; margin-bottom: 20px;">Vérifier mon adresse email</a>
          <p>Si vous rencontrez des problèmes avec le bouton ci-dessus, copiez et collez l'URL suivante dans votre navigateur :</p>
          <p style="word-wrap: break-word;"><a href="${verificationUrl}" style="color: #0066CC; text-decoration: underline;">${verificationUrl}</a></p>
        </div>
      `,
    };
  
    try {
      await sgMail.send(msg);
      console.log('Email de bienvenue envoyé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
    }
  }
  

}

module.exports = User;
