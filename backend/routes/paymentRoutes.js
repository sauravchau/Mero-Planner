const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.post('/api/payments', isLoggedIn, controller.addPayment);
router.get('/api/payments/item/:itemId', isLoggedIn, controller.getPaymentHistory);
router.put('/api/payments/:id', isLoggedIn, controller.updatePayment);
router.delete('/api/payments/:id', isLoggedIn, controller.deletePayment);

module.exports = router;
