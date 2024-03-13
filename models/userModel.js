const pool = require('../db');
const bcrypt = require('bcrypt');
//const nodemailer = require('nodemailer');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const { v4: uuidv4 } = require('uuid'); // Pour générer des UUID uniques


class User {

  static async createUser(email, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva, password , numero_entreprise, adresse_facturation) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const verificationToken = uuidv4();

    // Insertion dans la table Unverified_Users
    const query = 'INSERT INTO Unverified_Users (email, password, role, verification_token, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva, numero_entreprise, adresse_facturation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 , $13) RETURNING id_user';
    const values = [email, hashedPassword, 'Client', verificationToken, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva , numero_entreprise , adresse_facturation];
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
        return false; 
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      throw error;
    }
  }

  static async getClientInfo(id_client) {
    try {
        const clientQuery = 'SELECT * FROM Clients WHERE id_client = $1';
        const clientResult = await pool.query(clientQuery, [id_client]);
        if (clientResult.rows.length === 0) {
            throw new Error('Client not found');
        }
        const clientInfo = clientResult.rows[0];

        const userQuery = 'SELECT email, role FROM Users WHERE id_user = $1';
        const userResult = await pool.query(userQuery, [clientInfo.id_user]);
        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }
        const userInfo = userResult.rows[0];

        let returnInfo = {
            id_client: id_client,
            email: userInfo.email,
            role: userInfo.role,
            adresse: clientInfo.adresse,
            type: clientInfo.type,
        };

        if (clientInfo.type === 'Entreprise') {
            const entrepriseQuery = 'SELECT * FROM Entreprise WHERE id_client = $1';
            const entrepriseResult = await pool.query(entrepriseQuery, [id_client]);
            if (entrepriseResult.rows.length > 0) {
                const entrepriseInfo = entrepriseResult.rows[0];
                returnInfo = { ...returnInfo, nom_entreprise: entrepriseInfo.nom, numero_entreprise: entrepriseInfo.numero };
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



  static async updateClientInfo(id_client, email, newPassword, adresse, type, numero_telephone, nom, prenom, nom_entreprise, numero_tva) {
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


  //on desactive ici pour pas gaspiller autant d'envoi de mails pour les tests

  static async sendWelcomeEmail(email, token) {
    const verificationUrl = `http://localhost:3000/clients/verify?token=${token}`; 
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
