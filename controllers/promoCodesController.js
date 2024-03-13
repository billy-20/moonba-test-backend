const PromoCode = require('../models/codesPromoModel');


class PromoCodesController {
  
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


static async getAllCodes(req, res) {
    try {
      const codes = await PromoCode.getAllPromoCodes();
      res.json(codes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  
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
