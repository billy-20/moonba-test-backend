// sessionController.js

const Session = require('../models/sessionModel'); 
const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

const sessionController = {

    /**
     * Obtient les sessions disponibles pour une formation spécifique.
     * 
     * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant de la formation dans req.params.formationId.
     * @param {Object} res - L'objet de la réponse HTTP.
     */
    getSessionsDisponibles: async (req, res) => {
        const { formationId } = req.params; 
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

    /**
     * Obtient toutes les sessions avec leurs inscriptions.
     * 
     * @param {Object} req - L'objet de la requête HTTP.
     * @param {Object} res - L'objet de la réponse HTTP.
     */
    getAllSessionsWithInscription: async (req, res) => {
        try {
            const sessions = await Session.getAllSessionsWithInscription();
            if (sessions.length > 0) {
                res.status(200).json(sessions);
            } else {
                res.status(404).json({ message: 'Aucune session disponible trouvée pour cette formation.' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    
    /**
     * Obtient les inscriptions pour une session spécifique.
     * 
     * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant de la session dans req.params.sessionId.
     * @param {Object} res - L'objet de la réponse HTTP.
     */
    getInscriptionsParSession : async(req, res) =>{
        const { sessionId } = req.params; 

        try {
            const inscrits = await Session.getInscritsParSession(sessionId);
            res.json(inscrits);
        
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },

     /**
     * Ajoute des places à une session spécifique.
     * 
     * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant de la session dans req.params.sessionId.
     * @param {Object} res - L'objet de la réponse HTTP.
     */
    addNombrePlaces : async(req, res) =>{
        const { sessionId } = req.params; 

        try {
            const reponse = await Session.addNombrePlaces(sessionId);
            res.json(reponse);
        
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }

    },

     /**
     * Change la session d'une inscription.
     * 
     * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant de l'inscription et la nouvelle session dans req.body.
     * @param {Object} res - L'objet de la réponse HTTP.
     */
    changeSession : async (req, res) => {
        const { inscriptionId, newSessionId } = req.body;
        try {
            const result = await Session.changeSession(inscriptionId, newSessionId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Assigne une session à une formation.
     * 
     * @param {Object} req - L'objet de la requête HTTP, contient les détails de la session à assigner dans req.body.
     * @param {Object} res - L'objet de la réponse HTTP.
     */
    assignerSession : async (req, res) => {
        const { formationId, dateSession, nombrePlaces, adresse, info_supplementaire } = req.body;
        try {
            const result = await Session.assignerSessionAUneFormation(formationId, dateSession,nombrePlaces, adresse,info_supplementaire);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    
    /**
     * Ajoute une session à une formation.
     * 
     * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant de la formation dans req.params.formationId et les détails de la session dans req.body.
     * @param {Object} res - L'objet de la réponse HTTP.
     */
    ajouterSession : async (req, res) => {
        const { formationId } = req.params;
        const {  dateSession, nombrePlaces, adresse, info_supplementaire } = req.body;
        try {
            const result = await Session.ajouterSessionAFormation(formationId, dateSession,nombrePlaces, adresse,info_supplementaire);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
};



module.exports = sessionController;
