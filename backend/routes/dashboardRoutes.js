const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.get('/api/dashboard/summary', isLoggedIn, controller.getDashboardSummary);

module.exports = router;
