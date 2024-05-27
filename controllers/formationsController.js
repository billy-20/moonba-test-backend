const Formation = require('../models/formationModel');

/**
 * Récupère toutes les formations avec leurs sessions associées.
 * 
 * @param {Object} req - L'objet de la requête HTTP.
 * @param {Object} res - L'objet de la réponse HTTP.
 */
const getAll = async (req, res) => {
  try {
    const formations = await Formation.getAllFormationsWithSessions();
    res.status(200).json(formations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des formations.' });
  }
};

/**
 * Récupère toutes les formations sans leurs sessions associées.
 * 
 * @param {Object} req - L'objet de la requête HTTP.
 * @param {Object} res - L'objet de la réponse HTTP.
 */
const getAllWithoutSessions = async (req, res) => {
  try {
    const formations = await Formation.getAllFormationsWithoutSessions();
    res.status(200).json(formations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des formations.' });
  }
};

/**
 * Récupère les détails d'une formation spécifique par son identifiant.
 * 
 * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant de la formation.
 * @param {Object} res - L'objet de la réponse HTTP.
 */
const getFormationDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const formation = await Formation.getFormationDetail(id);
    res.status(200).json(formation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération de la formation.' });
  }
};

/**
 * Récupère des formations similaires à une formation spécifique par son identifiant.
 * 
 * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant de la formation.
 * @param {Object} res - L'objet de la réponse HTTP.
 */
const getSimilarFormation = async (req, res) => {
  const { id } = req.params;
  try {
    const formation = await Formation.getSimilarFormations(id);
    res.status(200).json(formation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des formatuons.' });
  }
};


/**
 * Supprime une formation spécifique par son identifiant.
 * 
 * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant de la formation à supprimer.
 * @param {Object} res - L'objet de la réponse HTTP.
 */
const deleteFormation = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedFormation = await Formation.deleteFormation(id);
    if (deletedFormation) {
      res.status(200).json({ message: 'Formation supprimée avec succès.', formation: deletedFormation });
    } else {
      res.status(404).json({ error: 'Formation non trouvée.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la suppression de la formation.' });
  }
};


/**
 * Met à jour une formation spécifique par son identifiant avec les nouveaux détails fournis.
 * 
 * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant de la formation et les nouveaux détails.
 * @param {Object} res - L'objet de la réponse HTTP.
 */
const updateFormation = async(req, res)=>{

  const { id } = req.params;
  const { nomFormation, description, niveau, prix, duree } = req.body;

  try {
      const updatedFormation = await Formation.updateFormation(id, nomFormation, description, niveau, prix, duree);
      res.json(updatedFormation);
  } catch (error) {
      res.status(400).json({ message: error.message });
  }

}

/**
 * Crée une nouvelle formation avec les détails fournis.
 * 
 * @param {Object} req - L'objet de la requête HTTP, contient les détails de la nouvelle formation.
 * @param {Object} res - L'objet de la réponse HTTP.
 */
const createFormation = async(req, res)=>{

  const { nomFormation, description, niveau, prix, duree, prerequis } = req.body;
  try {
      const newFormation = await Formation.createFormation( nomFormation, description, niveau, prix, duree, prerequis);
      res.json(newFormation);
  } catch (error) {
    console.log(error);
      res.status(400).json({ message: error.message });
  }


}

/**
 * Récupère une formation spécifique par son identifiant.
 * 
 * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant de la formation.
 * @param {Object} res - L'objet de la réponse HTTP.
 */
const getById = async (req, res) => {
  const { id } = req.params;
  try {
    const formation = await Formation.getFormationById(id);
    if (formation) {
      res.status(200).json(formation);
    } else {
      res.status(404).json({ error: 'Formation non trouvée.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération de la formation.' });
  }
};

module.exports = {
  getAll,
  getById,
  deleteFormation,
  updateFormation,
  createFormation,
  getAllWithoutSessions,
  getFormationDetails,
  getSimilarFormation
};
