const express = require('express');
const router = express.Router();
const controller = require('../controllers/budgetController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.get('/budget.html', isLoggedIn, controller.showBudgetPage);

router.get('/api/budget/categories', isLoggedIn, controller.getCategories);

router.post('/api/budget/allocations', isLoggedIn, controller.allocateBudget);
router.get('/api/budget/allocations/:eventId', isLoggedIn, controller.getAllocations);

router.post('/api/budget/items', isLoggedIn, controller.createBudgetItem);
router.get('/api/budget/items', isLoggedIn, controller.getBudgetItems);
router.get('/api/budget/items/:id', isLoggedIn, controller.getBudgetItemById);
router.put('/api/budget/items/:id', isLoggedIn, controller.updateBudgetItem);
router.delete('/api/budget/items/:id', isLoggedIn, controller.deleteBudgetItem);

module.exports = router;
