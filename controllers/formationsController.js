const Formation = require('../models/formationModel');

// Récupérer toutes les formations
const getAll = async (req, res) => {
  try {
    const formations = await Formation.getAllFormationsWithSessions();
    console.log("all formations ");
    res.status(200).json(formations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des formations.' });
  }
};

const getAllWithoutSessions = async (req, res) => {
  try {
    const formations = await Formation.getAllFormationsWithoutSessions();
    console.log("all formations without sessions ");
    res.status(200).json(formations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des formations.' });
  }
};

const getFormationDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const formation = await Formation.getFormationDetail(id);
    console.log("formation detail id :  ", id);
    res.status(200).json(formation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération de la formation.' });
  }
};




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

const createFormation = async(req, res)=>{

  const { nomFormation, description, niveau, prix, duree } = req.body;
  try {
      const newFormation = await Formation.createFormation( nomFormation, description, niveau, prix, duree);
      console.log("add formation OK");
      res.json(newFormation);
  } catch (error) {
    console.log(error);
      res.status(400).json({ message: error.message });
  }


}

// Récupérer une formation par ID
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
  getFormationDetails
};
