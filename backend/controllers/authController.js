const bcrypt = require('bcryptjs');
const path   = require('path');
const User   = require('../models/userModel');


const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');


exports.showLogin = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'login.html'));
};


exports.showRegister = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'register.html'));
};


exports.showDashboard = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'dashboard.html'));
};


exports.register = async (req, res) => {
  const { full_name, email, password, confirm_password } = req.body;
  try {
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create(full_name, email, hashedPassword);
    res.status(201).json({ message: 'Registration successful.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};


exports.login = async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    req.session.user = {
      id:        user.id,
      full_name: user.full_name,
      email:     user.email,
      role:      role || 'Event Organizer',
    };
    res.status(200).json({ message: 'Login successful.' });
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
