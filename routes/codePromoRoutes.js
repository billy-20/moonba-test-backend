const express = require('express');
const promoCodeController = require('../controllers/promoCodesController');
const auth = require('../controllers/AuthorizeController');

const router = express.Router();

router.post('/createCodePromo', auth.checkAdmin, promoCodeController.createCode);
// Ajoutez ces routes dans votre fichier de routes (probablement routes/promoCodesRoutes.js)

router.get('/getAllPromoCodes', auth.checkAdmin, promoCodeController.getAllCodes);
router.delete('/deletePromoCode/:idCode', auth.checkAdmin, promoCodeController.deleteCode);
router.put('/updatePromoCode/:idCode', auth.checkAdmin, promoCodeController.updateCode);


module.exports = router;
