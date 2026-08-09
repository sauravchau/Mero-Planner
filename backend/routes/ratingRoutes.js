const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/ratingController');
const { isLoggedIn }  = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/api/bookings/:bookingId/rating', isLoggedIn, requireRole('user'), controller.rateBooking);

router.get('/api/vendors/:vendorId/ratings', isLoggedIn, controller.vendorRatings);

module.exports = router;
