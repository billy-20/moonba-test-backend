const PromoCode = require('../models/codesPromoModel');


class PromoCodesController {
  
   /**
   * Crée un nouveau code promo.
   * 
   * @param {Object} req - L'objet de la requête HTTP, contient les informations du nouveau code promo dans req.body.
   * @param {Object} res - L'objet de la réponse HTTP.
   */
    static async createCode(req, res) {
        const {code, discount, start_date, end_date, is_active} = req.body;
    
        try {
          const newCodePromo = await PromoCode.createPromoCode(code, discount, start_date, end_date, is_active);
          res.json(newCodePromo);
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      }

/**
   * Récupère tous les codes promotionnels.
   * 
   * @param {Object} req - L'objet de la requête HTTP.
   * @param {Object} res - L'objet de la réponse HTTP.
   */
static async getAllCodes(req, res) {
    try {
      const codes = await PromoCode.getAllPromoCodes();
      res.json(codes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  
  /**
   * Supprime un code promotionnel par son identifiant.
   * 
   * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant du code dans req.params.idCode.
   * @param {Object} res - L'objet de la réponse HTTP.
   */
  static async deleteCode(req, res) {
    const { idCode } = req.params;
    try {
      const deletedCode = await PromoCode.deletePromoCode(idCode);
      if (!deletedCode) {
        return res.status(404).json({ error: 'Code not found' });
      }
      res.json(deletedCode);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  
   /**
   * Met à jour un code promotionnel par son identifiant.
   * 
   * @param {Object} req - L'objet de la requête HTTP, contient l'identifiant du code et les champs à mettre à jour dans req.params.idCode et req.body.
   * @param {Object} res - L'objet de la réponse HTTP.
   */
  static async updateCode(req, res) {
    const { idCode } = req.params;
    const fields = req.body; 
    try {
      const updatedCode = await PromoCode.updatePromoCode(idCode, fields);
      if (!updatedCode) {
        return res.status(404).json({ error: 'Code not found' });
      }
      res.json(updatedCode);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  
}

module.exports = PromoCodesController;
