const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path   = require('path');
const { OAuth2Client } = require('google-auth-library');
const User   = require('../models/userModel');
const { sendResetEmail, sendVerificationEmail, sendAccountDeletionEmail } = require('../utils/mailer');
const { isStrongPassword, passwordStrengthMessage } = require('../utils/validators');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.showLogin = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'login.html'));
};

exports.showRegister = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'register.html'));
};

exports.showForgotPassword = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'forgot-password.html'));
};

exports.showResetPassword = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'reset-password.html'));
};

exports.showVerifyEmail = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'verify-email.html'));
};

exports.showDashboard = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'dashboard.html'));
};

exports.showAccountSettings = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'settings.html'));
};

exports.showConfirmDeleteAccount = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'confirm-delete-account.html'));
};

exports.register = async (req, res) => {
  const { full_name, email, password, confirm_password } = req.body;
  try {
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: passwordStrengthMessage });
    }
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await User.create(full_name, email, hashedPassword);

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await User.setVerificationToken(result.insertId, tokenHash, expiresAt);

    const baseUrl    = process.env.APP_BASE_URL || 'http://localhost:3000';
    const verifyLink = `${baseUrl}/verify-email?token=${rawToken}`;
    await sendVerificationEmail(email, full_name, verifyLink);

    res.status(201).json({
      message: 'Account created! Check your email to verify your account before logging in.',
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    if (!user.password) {
      return res.status(401).json({
        message: 'This account signs in with Google. Use "Continue with Google", or set a password via "Forgot password".',
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in. Check your inbox, or request a new link.',
        needs_verification: true,
      });
    }

    req.session.user = {
      id:        user.id,
      full_name: user.full_name,
      email:     user.email,
      role:      user.role,
    };
    res.status(200).json({ message: 'Login successful.', role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
};

exports.getSessionUser = (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ user: null });
  }
};


exports.googleClientId = (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
};

exports.googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ message: 'Google Sign-In is not configured on the server.' });
  }
  if (!credential) {
    return res.status(400).json({ message: 'Missing Google credential.' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, email_verified } = payload;

    if (!email_verified) {
      return res.status(401).json({ message: 'Your Google account email is not verified.' });
    }

    let user = await User.findByGoogleId(googleId);

    if (!user) {
      user = await User.findByEmail(email);
      if (user) {
        await User.linkGoogleId(user.id, googleId);
      } else {
        const result = await User.createGoogleUser(name || email.split('@')[0], email, googleId);
        user = await User.findById(result.insertId);
      }
    }

    req.session.user = {
      id:        user.id,
      full_name: user.full_name,
      email:     user.email,
      role:      user.role,
    };
    res.status(200).json({ message: 'Google sign-in successful.', role: user.role });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findByEmail(email);

    if (user) {
      const rawToken   = crypto.randomBytes(32).toString('hex');
      const tokenHash  = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt  = new Date(Date.now() + 30 * 60 * 1000);

      await User.setResetToken(email, tokenHash, expiresAt);

      const baseUrl   = process.env.APP_BASE_URL || 'http://localhost:3000';
      const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

      await sendResetEmail(user.email, user.full_name, resetLink);
    }

    res.status(200).json({
      message: 'If that email is registered, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.body;
  try {
    if (!token) {
      return res.status(400).json({ message: 'Missing verification token.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findByVerificationToken(tokenHash);

    if (!user) {
      return res.status(400).json({ message: 'This verification link is invalid or has expired.' });
    }

    await User.markVerified(user.id);
    res.status(200).json({ message: 'Email verified! You can now log in.' });
  } catch (err) {
    console.error('verifyEmail error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.resendVerification = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findByEmail(email);

    if (user && !user.is_verified) {
      const rawToken  = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await User.setVerificationToken(user.id, tokenHash, expiresAt);

      const baseUrl    = process.env.APP_BASE_URL || 'http://localhost:3000';
      const verifyLink = `${baseUrl}/verify-email?token=${rawToken}`;
      await sendVerificationEmail(user.email, user.full_name, verifyLink);
    }

    res.status(200).json({
      message: 'If that email is registered and not yet verified, a new verification link has been sent.',
    });
  } catch (err) {
    console.error('resendVerification error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password, confirm_password } = req.body;
  try {
    if (!token) {
      return res.status(400).json({ message: 'Missing reset token.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: passwordStrengthMessage });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findByResetToken(tokenHash);

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.updatePassword(user.id, hashedPassword);

    res.status(200).json({ message: 'Password updated. You can now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.requestAccountDeletion = async (req, res) => {
  const { password } = req.body;
  try {
    if (!password) {
      return res.status(400).json({ message: 'Please enter your password to continue.' });
    }

    const sessionUserId = req.session.user.id;
    const user = await User.findById(sessionUserId);
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (!user.password) {
      return res.status(400).json({
        message: 'This account signs in with Google and has no password set. Contact support to delete it.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await User.setDeleteToken(user.id, tokenHash, expiresAt);

    const baseUrl     = process.env.APP_BASE_URL || 'http://localhost:3000';
    const confirmLink = `${baseUrl}/confirm-delete-account?token=${rawToken}`;
    await sendAccountDeletionEmail(user.email, user.full_name, confirmLink);

    res.status(200).json({
      message: `We've sent a confirmation link to ${user.email}. Click it to permanently delete your account. The link expires in 15 minutes.`,
    });
  } catch (err) {
    console.error('requestAccountDeletion error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

exports.confirmAccountDeletion = async (req, res) => {
  const { token } = req.body;
  try {
    if (!token) {
      return res.status(400).json({ message: 'Missing confirmation token.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findByDeleteToken(tokenHash);

    if (!user) {
      return res.status(400).json({ message: 'This deletion link is invalid or has expired.' });
    }

    await User.remove(user.id);

    if (req.session.user && req.session.user.id === user.id) {
      req.session.destroy(() => {});
    }

    res.status(200).json({ message: 'Your account has been permanently deleted.' });
  } catch (err) {
    console.error('confirmAccountDeletion error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};
