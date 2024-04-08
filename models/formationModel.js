const pool = require('../db');

/**
 * Classe Formation pour gérer les opérations liées aux formations dans la base de données.
 */
class Formation {
  /**
   * Crée une nouvelle formation.
   * @param {string} nomFormation - Le nom de la formation.
   * @param {string} description - La description de la formation.
   * @param {string} niveau - Le niveau requis pour la formation.
   * @param {number} prix - Le prix de la formation.
   * @param {number} duree - La durée de la formation en jours.
   * @returns {Promise<Object>} La formation créée.
   */
  static async createFormation(nomFormation, description, niveau, prix, duree) {
    const query = 'INSERT INTO formations (nom_formation, description, niveau, prix, duree) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [nomFormation, description, niveau, prix, duree];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Récupère toutes les formations qui n'ont pas de sessions associées.
   * @returns {Promise<Array>} Liste des formations sans sessions.
   */
  static async getAllFormationsWithoutSessions() {
    const query = `
        SELECT f.id_formations, f.nom_formation, f.description, f.niveau, f.prix, f.duree
        FROM formations f
        LEFT JOIN sessions s ON f.id_formations = s.id_formations
        WHERE s.id_formations IS NULL
        ORDER BY f.id_formations
    `;
  
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        throw error;
    }
  }
  
  /**
   * Récupère les détails d'une formation spécifique par son ID.
   * @param {number} id - L'ID de la formation à récupérer.
   * @returns {Promise<Object>} Détails de la formation spécifiée.
   */
  static async getFormationDetail(id){
    try {
      const query = 'SELECT * FROM formations WHERE id_formations = $1';
      const { rows } = await pool.query(query, [id]);
      if (rows.length > 0) {
          return rows[0];
      } else {
          throw new Error('Formation not found');
      }
    } catch (error) {
      console.error('Error getting formation details:', error);
      throw error;
    }
  }

  /**
   * Récupère les formations similaires basées sur le nom et la description.
   * @param {number} id - L'ID de la formation pour laquelle trouver des similaires.
   * @returns {Promise<Array>} Liste des formations similaires.
   */
  static async getSimilarFormations(id) {
    const formation = await this.getFormationById(id);
    if (!formation) throw new Error('Formation not found');

    const nomFormation = formation.nom_formation.toLowerCase();
    const descriptionFormation = formation.description.toLowerCase();

    const query = `
        SELECT * FROM formations
        WHERE id_formations != $1
        AND (LOWER(nom_formation) LIKE '%' || $2 || '%'
        OR LOWER(description) LIKE '%' || $3 || '%')
    `;
    const values = [id, nomFormation, descriptionFormation];

    try {
        const { rows } = await pool.query(query, values);
        return rows;
    } catch (error) {
        console.error('Error getting similar formations:', error);
        throw error;
    }
  }

  /**
   * Récupère toutes les formations avec leurs sessions à venir.
   * @returns {Promise<Array>} Liste des formations avec leurs sessions.
   */
  static async getAllFormationsWithSessions() {
    const query = `
        SELECT f.id_formations, f.nom_formation, f.description, f.niveau, f.prix, f.duree, s.id_formations as session_id, s.date as session_date, s.nombre_places
        FROM formations f
        LEFT JOIN sessions s ON f.id_formations = s.id_formations
        WHERE s.date >= CURRENT_DATE
        ORDER BY f.id_formations, s.date
    `;

    try {
        const result = await pool.query(query);
        // La logique pour regrouper les sessions par formation suit ici.
        return regrouperSessions(result.rows);
    } catch (error) {
        throw error;
    }
  }

  /**
   * Supprime une formation spécifique par son ID et ses sessions associées.
   * @param {number} id - L'ID de la formation à supprimer.
   * @returns {Promise<Object>} La formation supprimée.
   */
  static async deleteFormation(id) {
    try {
      await pool.query('BEGIN'); // Commence la transaction
      await pool.query('DELETE FROM sessions WHERE id_formations = $1', [id]); // Supprime les sessions associées
      const result = await pool.query('DELETE FROM formations WHERE id_formations = $1 RETURNING *', [id]); // Supprime la formation
      await pool.query('COMMIT'); // Applique la transaction
      return result.rows[0];
    } catch (error) {
      await pool.query('ROLLBACK'); // Annule la transaction en cas d'erreur
      throw error;
    }
  }
  
  
  /**
   * Récupère une formation spécifique par son ID.
   * @param {number} id - L'ID de la formation à récupérer.
   * @returns {Promise<Object>} La formation spécifiée.
   */
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

  /**
   * Met à jour une formation spécifique par son ID.
   * @param {number} id - L'ID de la formation à mettre à jour.
   * @param {string} nomFormation - Nouveau nom de la formation.
   * @param {string} description - Nouvelle description de la formation.
   * @param {string} niveau - Nouveau niveau requis pour la formation.
   * @param {number} prix - Nouveau prix de la formation.
   * @param {number} duree - Nouvelle durée de la formation.
   * @returns {Promise<Object>} La formation mise à jour.
   */
  static async updateFormation(id, nomFormation, description, niveau, prix, duree) {
    try {
      await pool.query('BEGIN'); // Commence la transaction
      // Ici, on suppose que la mise à jour pourrait affecter d'autres tables dans le futur
      const result = await pool.query(`
        UPDATE formations 
        SET nom_formation = $2, description = $3, niveau = $4, prix = $5, duree = $6
        WHERE id_formations = $1
        RETURNING *;
      `, [id, nomFormation, description, niveau, prix, duree]);
      // Ajoute ici d'autres opérations si nécessaire
      await pool.query('COMMIT'); // Applique la transaction
      if (result.rows.length > 0) {
        return result.rows[0];
      } else {
        throw new Error('Formation non trouvée ou mise à jour échouée.');
      }
    } catch (error) {
      await pool.query('ROLLBACK'); // Annule la transaction en cas d'erreur
      throw error;
    }
  }
  
}

module.exports = Formation;

/**
 * Regroupe les sessions par formation à partir des données brutes de la requête.
 * @param {Array} rows - Les lignes de données brutes de la base de données.
 * @returns {Array} Les formations regroupées avec leurs sessions.
 */
function regrouperSessions(rows) {
  let formations = [];
  let currentFormationId = null;
  let currentFormation = null;

  rows.forEach(row => {
      if (row.id_formations !== currentFormationId) {
          if (currentFormation) {
              formations.push(currentFormation); 
          }
          currentFormationId = row.id_formations;
          currentFormation = {
              id_formations: row.id_formations,
              nom_formation: row.nom_formation,
              description: row.description,
              niveau: row.niveau,
              prix: row.prix,
              duree: row.duree,
              sessions: []
          };
      }

      if (row.session_id) {
          currentFormation.sessions.push({
              id: row.session_id,
              date: row.session_date,
              nombre_places: row.nombre_places
          });
      }
  });

  if (currentFormation) {
      formations.push(currentFormation);
  }

  return formations;
}
