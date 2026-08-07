const bcrypt = require('bcryptjs');
const path   = require('path');
const User   = require('../models/userModel');
const Vendor = require('../models/vendorModel');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');

exports.showVendorRegister = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'vendor-register.html'));
};

exports.showVendorDashboard = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'vendor-dashboard.html'));
};

exports.registerVendor = async (req, res) => {
  const {
    full_name, email, password, confirm_password,
    vendor_name, category, location, price_npr,
    description, contact_phone,
  } = req.body;

  try {
    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }
    if (!vendor_name || !category || !location || !price_npr) {
      return res.status(400).json({ message: 'Business name, category, location and starting price are required.' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await User.create(full_name, email, hashedPassword, 'vendor');
    const userId = userResult.insertId;

    await Vendor.create({
      vendor_name,
      category,
      location,
      price_npr,
      description,
      contact_phone,
      user_id: userId,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Registration submitted! An admin will review your business before it goes live.',
    });
  } catch (err) {
    console.error('registerVendor error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};
exports.getMyVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findByUserId(req.session.user.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found.' });
    res.json({ vendor });
  } catch (err) {
    console.error('getMyVendorProfile error:', err);
    res.status(500).json({ message: 'Server error while fetching your profile.' });
  }
};

exports.updateMyVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findByUserId(req.session.user.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found.' });

    const merged = { ...vendor, ...req.body, rating: vendor.rating };
    await Vendor.update(vendor.id, merged);
    const updated = await Vendor.findById(vendor.id);
    res.json({ message: 'Profile updated.', vendor: updated });
  } catch (err) {
    console.error('updateMyVendorProfile error:', err);
    res.status(500).json({ message: 'Server error while updating your profile.' });
  }
};
