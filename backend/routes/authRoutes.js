const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/authController');
const { isLoggedIn } = require('../middleware/authMiddleware');


router.get('/',          controller.showLogin);
router.get('/login',     controller.showLogin);
router.get('/register',  controller.showRegister);
router.get('/dashboard', isLoggedIn, controller.showDashboard);

router.post('/api/auth/register', controller.register);
router.post('/api/auth/login',    controller.login);
router.get('/logout',             controller.logout);
router.get('/api/auth/user',      controller.getSessionUser);

module.exports = router;
