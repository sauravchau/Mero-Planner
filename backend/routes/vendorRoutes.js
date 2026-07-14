const express = require('express');
const router = express.Router();
const controller = require('../controllers/vendorController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.get('/vendors.html', isLoggedIn, controller.showVendorsPage);

router.get('/api/vendors/filters', isLoggedIn, controller.getFilters);

router.post('/api/vendors/recommend', isLoggedIn, controller.recommend);

router.get('/api/vendors', isLoggedIn, controller.getVendors);
router.get('/api/vendors/:id', isLoggedIn, controller.getVendorById);

router.post('/api/vendors', isLoggedIn, controller.createVendor);
router.put('/api/vendors/:id', isLoggedIn, controller.updateVendor);
router.delete('/api/vendors/:id', isLoggedIn, controller.deleteVendor);

module.exports = router;
