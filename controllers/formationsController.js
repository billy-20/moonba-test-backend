const Formation = require('../models/formationModel');

// Récupérer toutes les formations
const getAll = async (req, res) => {
  try {
    const formations = await Formation.getAllFormations();
    console.log("all formations ");
    res.status(200).json(formations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des formations.' });
  }
};

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
  getById
};
