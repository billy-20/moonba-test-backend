const pool = require('../db');

class Formation {
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

     
        result.rows.forEach(row => {
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
    } catch (error) {
        throw error;
    }
}



  static async deleteFormation(id) {
    const deleteSessionsQuery = 'DELETE FROM sessions WHERE id_formations = $1';
    const query = 'DELETE FROM formations WHERE id_formations = $1 RETURNING *';
    const values = [id];
  
    try {
      await pool.query(deleteSessionsQuery, [id]);

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

  static async updateFormation(id, nomFormation, description, niveau, prix, duree) {
    const query = `
        UPDATE formations 
        SET nom_formation = $2, description = $3, niveau = $4, prix = $5, duree = $6
        WHERE id_formations = $1
        RETURNING *;
    `;
    const values = [id, nomFormation, description, niveau, prix, duree];

    try {
      const result = await pool.query(query, values);
      if (result.rows.length > 0) {
        return result.rows[0];
      } else {
        throw new Error('Formation non trouvée ou mise à jour échouée.');
      }
    } catch (error) {
      throw error;
    }
}


}

module.exports = Formation;
