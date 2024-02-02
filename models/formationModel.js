const pool = require('../db');

class Formation {
  static async createFormation(nomFormation, description, niveau, prix, duree) {
    const query = 'INSERT INTO formations (nom_formation, description, niveau, prix, duree) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [nomFormation, description, niveau, prix, duree];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

 static async getAllFormations() {
    const query = 'SELECT * FROM formations';

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async getFormationById(id) {
    const query = 'SELECT * FROM formations WHERE id_formations = $1';
    const values = [id];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

}

module.exports = Formation;
