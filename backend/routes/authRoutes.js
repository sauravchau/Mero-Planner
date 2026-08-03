const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/authController');
const { isLoggedIn } = require('../middleware/authMiddleware');

router.get('/',               controller.showLogin);
router.get('/login',          controller.showLogin);
router.get('/register',       controller.showRegister);
router.get('/forgot-password', controller.showForgotPassword);
router.get('/reset-password',  controller.showResetPassword);
router.get('/verify-email',    controller.showVerifyEmail);
router.get('/dashboard',      isLoggedIn, controller.showDashboard);
router.get('/settings',       isLoggedIn, controller.showAccountSettings);
router.get('/confirm-delete-account', controller.showConfirmDeleteAccount);

router.post('/api/auth/register', controller.register);
router.post('/api/auth/login',    controller.login);
router.get('/logout',             controller.logout);
router.get('/api/auth/user',      controller.getSessionUser);

router.get('/api/auth/google-client-id', controller.googleClientId);
router.post('/api/auth/google',          controller.googleLogin);

router.post('/api/auth/forgot-password', controller.forgotPassword);
router.post('/api/auth/reset-password',  controller.resetPassword);

router.post('/api/auth/verify-email',        controller.verifyEmail);
router.post('/api/auth/resend-verification', controller.resendVerification);

router.post('/api/auth/request-account-deletion', isLoggedIn, controller.requestAccountDeletion);
router.post('/api/auth/confirm-account-deletion', controller.confirmAccountDeletion);

module.exports = router;
