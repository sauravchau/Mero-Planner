const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/bookingController');
const path       = require('path');
const { isLoggedIn }  = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/my-bookings.html', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/views/my-bookings.html'));
});

router.post('/api/bookings',           isLoggedIn, requireRole('user'),   controller.createBooking);
router.get('/api/bookings/mine',       isLoggedIn, requireRole('user'),   controller.myBookings);

router.get('/api/vendor/bookings',     isLoggedIn, requireRole('vendor'), controller.vendorBookings);
router.put('/api/vendor/bookings/:id', isLoggedIn, requireRole('vendor'), controller.updateBookingStatus);

module.exports = router;