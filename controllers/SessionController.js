// sessionController.js

const Session = require('../models/sessionModel'); // Assurez-vous que le chemin d'accès est correct
const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

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

    getInscriptionsParSession : async(req, res) =>{
        const { sessionId } = req.params; 
        console.log(sessionId);

        try {
            const inscrits = await Session.getInscritsParSession(sessionId);
            res.json(inscrits);
            // Création d'un nouveau document PDF
        
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    },

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

    changeSession : async (req, res) => {
        const { inscriptionId, newSessionId } = req.body;
        try {
            const result = await Session.changeSession(inscriptionId, newSessionId);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    //static async assignerSessionAUneFormation(formationId, dateSession, nombrePlaces) {

    assignerSession : async (req, res) => {
        const { formationId, dateSession, nombrePlaces, adresse, info_supplementaire } = req.body;
        try {
            const result = await Session.assignerSessionAUneFormation(formationId, dateSession,nombrePlaces, adresse,info_supplementaire);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};



module.exports = sessionController;
