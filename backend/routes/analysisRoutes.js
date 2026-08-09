const express = require('express');
const router = express.Router();
const controller = require('../controllers/analysisController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.get('/api/analysis/summary/:eventId', isLoggedIn, controller.getEventBudgetSummary);
router.get('/api/analysis/category-summary/:eventId', isLoggedIn, controller.getCategorySummary);
router.get('/api/analysis/budget-analysis/:eventId', isLoggedIn, controller.getBudgetAnalysis);
router.get('/api/analysis/recommendations/:eventId', isLoggedIn, controller.getRecommendations);

module.exports = router;
