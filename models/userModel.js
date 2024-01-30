const pool = require('../db');

class User {
  static async createUser(firstName, lastName) {
    const query = 'INSERT INTO users (firstname, lastname) VALUES ($1, $2) RETURNING *';
    const values = [firstName, lastName];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
