const express = require('express');
const router = express.Router();
const controller = require('../controllers/checklistController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.get('/checklist.html', isLoggedIn, controller.showChecklistPage);

router.post('/api/checklist/generate/:eventId', isLoggedIn, controller.generateChecklist);
router.get('/api/checklist/:eventId', isLoggedIn, controller.getChecklist);
router.post('/api/checklist/custom', isLoggedIn, controller.addCustomTask);
router.put('/api/checklist/:id/status', isLoggedIn, controller.updateTaskStatus); 
router.put('/api/checklist/:id', isLoggedIn, controller.updateChecklistItem);
router.delete('/api/checklist/:id', isLoggedIn, controller.deleteTask);

module.exports = router;
