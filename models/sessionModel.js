
const pool = require('../db');

class Session {
   

    static async getInscritsParSession(sessionId) {
        const query = `
            SELECT 
                i.id_session, 
                u.email, 
                c.type, 
                c.adresse, 
                c.numero_telephone,
                CASE 
                    WHEN c.type = 'Particulier' THEN p.prenom || ' ' || p.nom
                    WHEN c.type = 'Entreprise' THEN e.nom_entreprise
                END as nom
            FROM Inscriptions i
            JOIN Clients c ON i.id_client = c.id_client
            JOIN Users u ON c.id_user = u.id_user
            LEFT JOIN particulier p ON c.id_client = p.id_client
            LEFT JOIN entreprise e ON c.id_client = e.id_client
            WHERE i.id_session = $1
        `;
        try {
            const result = await pool.query(query, [sessionId]);
            if (result.rows.length === 0) {
                console.log('Aucune inscription trouvée pour cette session.');
                return [];
            }
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des inscrits pour la session :', error);
            throw new Error('Erreur lors de la récupération des inscrits pour la session : ' + error.message);
        }
    }
    

    static async getAllSessionsWithInscription() {
        const query = `
            SELECT DISTINCT s.id_session, s.adresse, s.date /* Assurez-vous d'ajuster les colonnes selon votre schéma */
            FROM Sessions s
            JOIN Inscriptions i ON s.id_session = i.id_session
            WHERE EXISTS (
                SELECT 1
                FROM Inscriptions ins
                WHERE ins.id_session = s.id_session
            )
        `;
        try {
            const result = await pool.query(query);
            if (result.rows.length === 0) {
                console.log('Aucune session avec inscription trouvée.');
                return [];
            }
            return result.rows;
        } catch (error) {
            console.error('Erreur lors de la récupération des sessions avec inscriptions :', error);
            throw new Error('Erreur lors de la récupération des sessions avec inscriptions : ' + error.message);
        }
    }
    
static async addNombrePlaces(idSession){

    const query = `UPDATE sessions 
                    SET nombre_places = nombre_places+1
                    WHERE id_session = $1
                    RETURNING *`;


    try {
        const result = await pool.query(query , [idSession]);
        if (result.rows.length === 0) {
            console.log('Aucune session trouvee');
            return [];
        }
        return result.rows;
    } catch (error) {
        console.error('Erreur lors de la récupération des sessions  :', error);
        throw new Error('Erreur lors de la récupération des sessions  : ' + error.message);
    }
}


static async getSessionsDisponibles(formationId) {
    const query = `
        SELECT s.* FROM Sessions s
        JOIN Formations f ON s.id_formations = f.id_formations
        WHERE s.id_formations = $1 AND s.nombre_places > 0
    `;
    try {
        const result = await pool.query(query, [formationId]);
        return result.rows;
    } catch (error) {
        throw new Error('Erreur lors de la récupération des sessions disponibles : ' + error.message);
    }
}

static async assignerSessionAUneFormation(formationId, dateSession, nombrePlaces, adresse, info_supplementaire ) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const insertQuery = `
            INSERT INTO sessions (id_formations, date, nombre_places, adresse ,info_supplementaire)
            VALUES ($1, $2, $3 , $4 , $5)
            RETURNING *;
        `;

        const values = [formationId, dateSession, nombrePlaces ,adresse , info_supplementaire];

        const result = await client.query(insertQuery, values);

        await client.query('COMMIT');
        console.log("Session assignée avec succès à la formation.");
        return result.rows[0]; 
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erreur lors de l'assignation de la session à la formation: ", error.message);
        throw new Error("Erreur lors de l'assignation de la session à la formation: " + error.message);
    } finally {
        client.release();
    }
}

static async ajouterSessionAFormation(formId, dateSession, nombrePlaces, adresse, infoSupplementaire) {
    try {
        const existingSessions = await this.getSessionsDisponibles(formId);
        if (existingSessions.length > 0) {
            return await this.assignerSessionAUneFormation(formId, dateSession, nombrePlaces, adresse, infoSupplementaire);
        } else {
            console.log('Aucune session existante pour cette formation veuillez assigner d abord une session pour celle ci ensuite vous pourrez ajouter plus de sessions a cette formation');
            throw new Error('Aucune session existante pour cette formation, veuillez d\'abord créer une session initiale.');
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout d\'une nouvelle session :', error);
        throw new Error('Erreur lors de l\'ajout d\'une nouvelle session : ' + error.message);
    }
}


static async changeSession(inscriptionId, newSessionId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query('SELECT a_change_de_session, id_session, nb_changes FROM Inscriptions WHERE id_inscription = $1', [inscriptionId]);
        if (rows.length === 0) {
            throw new Error('Inscription non trouvée.');
        }

        const { a_change_de_session, id_session, nb_changes } = rows[0];

        if (a_change_de_session && nb_changes >= 2) {
            console.log("Nombre maximal de changements de session déjà effectué.");
            throw new Error('Nombre maximal de changements de session déjà effectué.');
        }

        const sessionQuery = 'SELECT date FROM Sessions WHERE id_session = $1';
        const sessionResult = await client.query(sessionQuery, [newSessionId]);
        if (sessionResult.rows.length === 0) {
            throw new Error('Session non trouvée.');
        }
        const sessionDate = new Date(sessionResult.rows[0].date);
        const currentDate = new Date();
        const diffTime = Math.abs(sessionDate - currentDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 3) {
            throw new Error('Il n\'est pas possible de changer de session moins de 3 jours avant le début.');

        }

        await client.query('UPDATE Inscriptions SET id_session = $1, a_change_de_session = true, nb_changes = nb_changes + 1 WHERE id_inscription = $2', [newSessionId, inscriptionId]);

        await client.query('UPDATE Sessions SET nombre_places = nombre_places + 1 WHERE id_session = $1', [id_session]);
        await client.query('UPDATE Sessions SET nombre_places = nombre_places - 1 WHERE id_session = $1', [newSessionId]);

        await client.query('COMMIT');
        console.log("Change session : OK");
        return { message: 'Session changée avec succès.' };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        client.release();
        return res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
}


}

module.exports = Session;
