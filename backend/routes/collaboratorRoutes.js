const express = require('express');
const router = express.Router();
const controller = require('../controllers/collaboratorController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.get('/api/events/:eventId/collaborators', isLoggedIn, controller.getCollaborators);
router.post('/api/events/:eventId/collaborators', isLoggedIn, controller.inviteCollaborator);
router.patch('/api/events/:eventId/collaborators/:collabId', isLoggedIn, controller.updateCollaboratorRole);
router.delete('/api/events/:eventId/collaborators/:collabId', isLoggedIn, controller.removeCollaborator);

router.get('/api/collaborations/invitations', isLoggedIn, controller.getMyInvitations);
router.post('/api/collaborations/invitations/:id/accept', isLoggedIn, controller.acceptInvitation);
router.post('/api/collaborations/invitations/:id/decline', isLoggedIn, controller.declineInvitation);

module.exports = router;
