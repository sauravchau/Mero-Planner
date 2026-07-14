const express = require('express');
const router = express.Router();
const controller = require('../controllers/eventController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.get('/create-event.html', isLoggedIn, controller.showCreateEventPage);
router.get('/my-events.html', isLoggedIn, controller.showMyEventsPage);

router.post('/api/events', isLoggedIn, controller.createEvent);
router.get('/api/events', isLoggedIn, controller.getEvents);
router.get('/api/events/stats', isLoggedIn, controller.getEventStats);
router.get('/api/events/:id', isLoggedIn, controller.getEventById);
router.put('/api/events/:id', isLoggedIn, controller.updateEvent);
router.delete('/api/events/:id', isLoggedIn, controller.deleteEvent);

module.exports = router;
