const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/vendorAuthController');
const { isLoggedIn }  = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/vendor-register',  controller.showVendorRegister);
router.get('/vendor-dashboard', isLoggedIn, requireRole('vendor'), controller.showVendorDashboard);

router.post('/api/vendor/register', controller.registerVendor);

router.get('/api/vendor/me',  isLoggedIn, requireRole('vendor'), controller.getMyVendorProfile);
router.put('/api/vendor/me',  isLoggedIn, requireRole('vendor'), controller.updateMyVendorProfile);

module.exports = router;
