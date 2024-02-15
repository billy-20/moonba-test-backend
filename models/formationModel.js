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
        let formations = [];
        let currentFormationId = null;
        let currentFormation = null;

        // Itérer sur chaque ligne de résultat pour construire un tableau de formations
        // avec un tableau de sessions pour chaque formation
        result.rows.forEach(row => {
            if (row.id_formations !== currentFormationId) {
                if (currentFormation) {
                    formations.push(currentFormation); // Ajouter la formation précédente au tableau
                }
                // Commencer une nouvelle formation
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

            // Ajouter la session à la formation courante, si elle existe
            if (row.session_id) {
                currentFormation.sessions.push({
                    id: row.session_id,
                    date: row.session_date,
                    nombre_places: row.nombre_places
                });
            }
        });

        // Ne pas oublier d'ajouter la dernière formation traitée au tableau
        if (currentFormation) {
            formations.push(currentFormation);
        }

        return formations;
    } catch (error) {
        throw error;
    }
}



  static async deleteFormation(id) {
    const query = 'DELETE FROM formations WHERE id_formations = $1 RETURNING *';
    const values = [id];
  
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
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
