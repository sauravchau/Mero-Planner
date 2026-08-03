const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/adminController');
const { isLoggedIn }  = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(isLoggedIn, requireRole('admin'));

router.get('/admin-dashboard', controller.showAdminDashboard);

router.get('/api/admin/users',            controller.listUsers);
router.put('/api/admin/users/:id/role',   controller.setUserRole);
router.delete('/api/admin/users/:id',     controller.deleteUser);

router.get('/api/admin/vendors',            controller.listVendors);
router.put('/api/admin/vendors/:id/approve', controller.approveVendor);
router.put('/api/admin/vendors/:id/reject',  controller.rejectVendor);

module.exports = router;
