// sessionController.js

const Session = require('../models/sessionModel'); // Assurez-vous que le chemin d'accès est correct

const sessionController = {
    getSessionsDisponibles: async (req, res) => {
        const { formationId } = req.params; // Assurez-vous que l'ID de la formation est passé en paramètre dans la route
        try {
            const sessions = await Session.getSessionsDisponibles(formationId);
            if (sessions.length > 0) {
                res.status(200).json(sessions);
            } else {
                res.status(404).json({ message: 'Aucune session disponible trouvée pour cette formation.' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    changeSession : async (req, res) => {
        const { inscriptionId, newSessionId } = req.body;
        try {
            const result = await Session.changeSession(inscriptionId, newSessionId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};



module.exports = sessionController;
