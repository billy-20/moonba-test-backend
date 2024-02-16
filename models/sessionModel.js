
const pool = require('../db');

class Session {
   
// Dans votre SessionModel.js ou un fichier similaire

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

static async assignerSessionAUneFormation(formationId, dateSession, nombrePlaces) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const insertQuery = `
            INSERT INTO sessions (id_formations, date, nombre_places)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;

        const values = [formationId, dateSession, nombrePlaces];

        const result = await client.query(insertQuery, values);

        await client.query('COMMIT');
        console.log("Session assignée avec succès à la formation.");
        return result.rows[0]; // Retourner les détails de la session créée
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erreur lors de l'assignation de la session à la formation: ", error.message);
        throw new Error("Erreur lors de l'assignation de la session à la formation: " + error.message);
    } finally {
        client.release();
    }
}

static async changeSession(inscriptionId, newSessionId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Vérifier si le changement de session est autorisé
        const { rows } = await client.query('SELECT a_change_de_session, id_session, nb_changes FROM Inscriptions WHERE id_inscription = $1', [inscriptionId]);
        if (rows.length === 0) {
            throw new Error('Inscription non trouvée.');
        }

        const { a_change_de_session, id_session, nb_changes } = rows[0];

        if (a_change_de_session && nb_changes >= 2) {
            console.log("Nombre maximal de changements de session déjà effectué.");
            throw new Error('Nombre maximal de changements de session déjà effectué.');
        }

        // Mettre à jour l'inscription
        await client.query('UPDATE Inscriptions SET id_session = $1, a_change_de_session = true, nb_changes = nb_changes + 1 WHERE id_inscription = $2', [newSessionId, inscriptionId]);

        // Ajuster les nombres de places
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
