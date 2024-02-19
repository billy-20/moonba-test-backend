const pool = require('../db');
const bcrypt = require('bcrypt');
//const nodemailer = require('nodemailer');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);



class User {

  static async createUser(email, adresse, type, nom, prenom, nom_entreprise, numero_tva, password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    let query;
    let values;

    // Insertion dans la table Users avec le rôle "Client" par défaut
    query = 'INSERT INTO Users (email, password, role) VALUES ($1, $2, $3) RETURNING id_user';
    values = [email, hashedPassword, 'Client'];
    const user = await pool.query(query, values);
    const id_user = user.rows[0].id_user;

    // Insertion dans la table Clients
    query = 'INSERT INTO Clients (id_user, adresse, type) VALUES ($1, $2, $3) RETURNING id_client';
    values = [id_user, adresse, type];
    const client = await pool.query(query, values);
    const id_client = client.rows[0].id_client;

    // Insertion dans la table Particulier ou Entreprise en fonction du type
    if (type === 'Particulier') {
      query = 'INSERT INTO Particulier (id_client, nom, prenom) VALUES ($1, $2, $3)';
      values = [id_client, nom, prenom];
    } else { // Entreprise
      query = 'INSERT INTO Entreprise (id_client, nom_entreprise, numero_tva) VALUES ($1, $2, $3)';
      values = [id_client, nom_entreprise, numero_tva];
    }
    await pool.query(query, values);

    // Envoi de l'email de bienvenue
    try {
      await User.sendWelcomeEmail(email);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
    }

    return { id_user, email, role: 'Client' };
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



  static async sendWelcomeEmail(email) {
    const msg = {
        to: email,
        from: 'formations@moonba-studio.com', // Utilisez l'adresse email validée par SendGrid
        subject: 'Bienvenue sur notre site!',
        text: 'Nous sommes ravis de vous accueillir parmi nous.',
        html: '<strong>Nous sommes ravis de vous accueillir parmi nous.</strong>',
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
