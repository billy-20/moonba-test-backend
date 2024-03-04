const pool = require('../db');

class PromoCode {
  
    static async createPromoCode(code, discount, start_date, end_date, is_active) {
        const query = 'INSERT INTO PromoCodes (code, discount, start_date, end_date, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *';
        const values = [code, discount, start_date, end_date, is_active];
        
        try {
          const result = await pool.query(query, values);
          return result.rows[0];
        } catch (error) {
          console.log(error);
          throw error;
        }
      }

      // Ajoutez ces méthodes dans la classe PromoCode dans votre fichier models/codesPromoModel.js

static async getAllPromoCodes() {
    const query = 'SELECT * FROM PromoCodes';
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  
  static async deletePromoCode(idCode) {
    const query = 'DELETE FROM PromoCodes WHERE id = $1 RETURNING *';
    const values = [idCode];
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  
  static async updatePromoCode(idCode, fields) {
    const {code, discount, start_date, end_date, is_active } = fields;
    const query = 'UPDATE PromoCodes SET code = $2,discount = $3, start_date = $4, end_date = $5, is_active = $6 WHERE id = $1 RETURNING *';
    const values = [idCode ,code, discount, start_date, end_date, is_active];
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  

}

module.exports = PromoCode;
