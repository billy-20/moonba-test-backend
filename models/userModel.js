const pool = require('../db');
const bcrypt = require('bcrypt');

class User {
  static async createUser(email, adresse, type, nom, prenom, nom_entreprise, numero_tva,password) {
    let query;
    let values;
    const saltRounds = 10; // Vous pouvez ajuster le nombre de tours

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insertion dans la table Clients
    query = 'INSERT INTO Clients (adresse, email, type,password) VALUES ($1, $2, $3 , $4) RETURNING id_client';
    values = [adresse, email, type , hashedPassword];
    const client = await pool.query(query, values);

    const id_client = client.rows[0].id_client;

    // Insertion dans la table appropriée en fonction du type
    if (type === 'Particulier') {
      query = 'INSERT INTO Particulier (id_client, nom, prenom) VALUES ($1, $2, $3)';
      values = [id_client, nom, prenom];
    } else { // Entreprise
      query = 'INSERT INTO Entreprise (id_client, nom_entreprise, numero_tva) VALUES ($1, $2, $3)';
      values = [id_client, nom_entreprise, numero_tva];
    }

    await pool.query(query, values);

    return { id_client, email, type };
  }

  static async authenticate(email, password) {
    const query = 'SELECT * FROM Clients WHERE email = $1';
    const values = [email];

    try {
      const result = await pool.query(query, values);
      const user = result.rows[0];

      if (user && await bcrypt.compare(password, user.password)) {
        return { id: user.id_client, email: user.email, role: user.role };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
