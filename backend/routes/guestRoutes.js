const express = require('express');
const router = express.Router();
const controller = require('../controllers/guestController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.get('/guest-list.html', isLoggedIn, controller.showGuestListPage);

router.post('/api/guests', isLoggedIn, controller.createGuest);
router.get('/api/guests', isLoggedIn, controller.getGuests);
router.get('/api/guests/stats', isLoggedIn, controller.getGuestStats);
router.get('/api/guests/:id', isLoggedIn, controller.getGuestById);
router.put('/api/guests/:id', isLoggedIn, controller.updateGuest);
router.delete('/api/guests/:id', isLoggedIn, controller.deleteGuest);
router.patch('/api/guests/:id/invitation', isLoggedIn, controller.setInvitation);
router.patch('/api/guests/:id/rsvp', isLoggedIn, controller.setRsvp);

module.exports = router;
