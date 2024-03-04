const pool = require('../db');
const bcrypt = require('bcrypt');
//const nodemailer = require('nodemailer');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const { v4: uuidv4 } = require('uuid'); // Pour générer des UUID uniques


class User {

  static async createUser(email, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva, password , numero_entreprise) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const verificationToken = uuidv4();

    // Insertion dans la table Unverified_Users
    const query = 'INSERT INTO Unverified_Users (email, password, role, verification_token, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva, numero_entreprise) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id_user';
    const values = [email, hashedPassword, 'Client', verificationToken, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva , numero_entreprise];
    try {
      await pool.query(query, values);
      await User.sendWelcomeEmail(email, verificationToken);
      return { success: true, message: 'User created, verification pending.' , verificationToken: verificationToken};
    } catch (error) {
      console.error('Error creating unverified user:', error);
      throw error;
    }
  }
  static async checkVerificationStatus(verificationToken) {
    const query = 'SELECT is_verified FROM Users WHERE verification_token = $1';
    try {
      const result = await pool.query(query, [verificationToken]);
      if (result.rows.length > 0) {
        const { is_verified } = result.rows[0];
        return is_verified;
      } else {
        return false; // Si aucun utilisateur correspondant au token n'est trouvé
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      throw error;
    }
  }

  static async getClientInfo(id_client) {
    try {
        // D'abord, récupérer les informations de la table Clients
        const clientQuery = 'SELECT * FROM Clients WHERE id_client = $1';
        const clientResult = await pool.query(clientQuery, [id_client]);
        if (clientResult.rows.length === 0) {
            throw new Error('Client not found');
        }
        const clientInfo = clientResult.rows[0];
        
        // Ensuite, récupérer les informations correspondantes de la table Users
        const userQuery = 'SELECT email, role FROM Users WHERE id_user = $1';
        const userResult = await pool.query(userQuery, [clientInfo.id_user]);
        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }
        const userInfo = userResult.rows[0];
        
        // Combiner les informations du client et de l'utilisateur
        return {
            id_client: id_client,
            email: userInfo.email,
            role: userInfo.role,
            adresse: clientInfo.adresse,
            type: clientInfo.type,
            // Ajoutez ici d'autres champs si nécessaire
        };
    } catch (error) {
        console.error('Error getting client info:', error);
        throw error;
    }
}


  static async updateClientInfo(id_client, email, newPassword, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva) {
    try {
        // Début de la transaction
        await pool.query('BEGIN');

        // Mise à jour conditionnelle dans Users
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

        // Répétez le processus pour chaque champ...
        // Exemple pour 'type'

        if (type) {
            clientUpdateParts.push(`type = $${clientCounter}`);
            clientValues.push(type);
            clientCounter++;
        }

        // Ajoutez d'autres champs ici...

        if (clientUpdateParts.length > 0) {
            clientValues.push(id_client);
            const updateClientQuery = `
                UPDATE Clients
                SET ${clientUpdateParts.join(', ')}
                WHERE id_client = $${clientCounter}
            `;
            await pool.query(updateClientQuery, clientValues);
        }

        // Validation de la transaction
        await pool.query('COMMIT');

        return { success: true, message: 'Client and User info updated successfully.' };
    } catch (error) {
        // Annulation de la transaction en cas d'erreur
        await pool.query('ROLLBACK');
        console.error('Error during client and user info update:', error);
        throw error;
    }
}

  
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

  static async authenticate(email, password) {
    // Ajuster la requête pour sélectionner les utilisateurs depuis la table Users
    const query = 'SELECT id_user, email, password, role FROM Users WHERE email = $1';
    const values = [email];

    try {
      const result = await pool.query(query, values);
      if (result.rows.length > 0) {
        const user = result.rows[0];

        if (await bcrypt.compare(password, user.password)) {
          // Retourne les informations de l'utilisateur si le mot de passe est correct
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


  //on desactive ici pour pas gaspiller autant d'envoi de mails pour les tests

  static async sendWelcomeEmail(email, token) {
    const verificationUrl = `http://localhost:3000/clients/verify?token=${token}`; // Ajustez l'URL selon votre route de vérification
    const msg = {
      to: email,
      from: 'formations@moonba-studio.com',
      subject: 'Veuillez vérifier votre adresse email',
      html: `Veuillez cliquer sur le lien suivant pour vérifier votre compte : <a href="${verificationUrl}">${verificationUrl}</a>`,
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
