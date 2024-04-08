const pool = require('../db');

class PromoCode {
  
    /**
     * Crée un nouveau code promo dans la base de données.
     * Valide les entrées avant l'insertion. Envisagez d'utiliser une bibliothèque de validation.
     * @param {string} code - Code unique pour la promotion.
     * @param {number} discount - Pourcentage de réduction pour la promo.
     * @param {Date} start_date - Date de début de la validité de la promo.
     * @param {Date} end_date - Date de fin de la validité de la promo.
     * @param {boolean} is_active - Statut du code promo.
     * @returns {Promise<Object>} L'objet du code promo créé.
     * @throws Lance une erreur si l'opération en base de données échoue.
     */
    static async createPromoCode(code, discount, start_date, end_date, is_active) {
        // Envisagez d'ajouter ici une validation des entrées.
        const query = 'INSERT INTO PromoCodes (code, discount, start_date, end_date, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *';
        const values = [code, discount, start_date, end_date, is_active];
        
        try {
          const result = await pool.query(query, values);
          return result.rows[0];
        } catch (error) {
          console.error('Erreur lors de la création du code promo :', error);
          throw new Error('Erreur lors de la création du code promo');
        }
    }

    /**
     * Récupère tous les codes promo de la base de données.
     * Envisagez de mettre en œuvre une pagination pour la performance avec de grands ensembles de données.
     * @returns {Promise<Array>} Une liste de tous les codes promo.
     * @throws Lance une erreur si l'opération en base de données échoue.
     */
    static async getAllPromoCodes() {
        const query = 'SELECT * FROM PromoCodes';
        try {
          const result = await pool.query(query);
          return result.rows;
        } catch (error) {
          console.error('Erreur lors de la récupération des codes promo :', error);
          throw new Error('Erreur lors de la récupération des codes promo');
        }
    }
  
    /**
     * Supprime un code promo par son ID de la base de données.
     * @param {number} idCode - L'ID du code promo à supprimer.
     * @returns {Promise<Object>} L'objet du code promo supprimé.
     * @throws Lance une erreur si l'opération en base de données échoue.
     */
    static async deletePromoCode(idCode) {
        const query = 'DELETE FROM PromoCodes WHERE id = $1 RETURNING *';
        const values = [idCode];
        try {
          const result = await pool.query(query, values);
          return result.rows[0];
        } catch (error) {
          console.error('Erreur lors de la suppression du code promo :', error);
          throw new Error('Erreur lors de la suppression du code promo');
        }
    }
  
    /**
     * Met à jour un code promo par son ID dans la base de données.
     * Valide les entrées avant la mise à jour.
     * @param {number} idCode - L'ID du code promo à mettre à jour.
     * @param {Object} fields - Les champs à mettre à jour avec leurs nouvelles valeurs.
     * @returns {Promise<Object>} L'objet du code promo mis à jour.
     * @throws Lance une erreur si l'opération en base de données échoue.
     */
    static async updatePromoCode(idCode, fields) {
        // Envisagez d'ajouter ici une validation des entrées.
        const {code, discount, start_date, end_date, is_active} = fields;
        const query = 'UPDATE PromoCodes SET code = $2, discount = $3, start_date = $4, end_date = $5, is_active = $6 WHERE id = $1 RETURNING *';
        const values = [idCode, code, discount, start_date, end_date, is_active];
        try {
          const result = await pool.query(query, values);
          return result.rows[0];
        } catch (error) {
          console.error('Erreur lors de la mise à jour du code promo :', error);
          throw new Error('Erreur lors de la mise à jour du code promo');
        }
    }
}

module.exports = PromoCode;
