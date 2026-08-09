const path  = require('path');
const User  = require('../models/userModel');
const Vendor = require('../models/vendorModel');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');

exports.showAdminDashboard = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'admin-dashboard.html'));
};


exports.listUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ users });
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ message: 'Server error while fetching users.' });
  }
};

exports.setUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'vendor', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    if (Number(req.params.id) === req.session.user.id) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }
    await User.setRole(req.params.id, role);
    res.json({ message: 'User role updated.' });
  } catch (err) {
    console.error('setUserRole error:', err);
    res.status(500).json({ message: 'Server error while updating the user.' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (Number(req.params.id) === req.session.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }
    await User.remove(req.params.id);
    res.json({ message: 'User removed.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ message: 'Server error while removing the user.' });
  }
};


exports.listVendors = async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    const vendors = await Vendor.findAllForAdmin(filters);
    res.json({ vendors });
  } catch (err) {
    console.error('listVendors (admin) error:', err);
    res.status(500).json({ message: 'Server error while fetching vendors.' });
  }
};

exports.approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });
    await Vendor.setStatus(req.params.id, 'approved', null);
    res.json({ message: 'Vendor approved — now visible in the vendor listing.' });
  } catch (err) {
    console.error('approveVendor error:', err);
    res.status(500).json({ message: 'Server error while approving the vendor.' });
  }
};

exports.rejectVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });
    await Vendor.setStatus(req.params.id, 'rejected', req.body.reason || null);
    res.json({ message: 'Vendor rejected.' });
  } catch (err) {
    console.error('rejectVendor error:', err);
    res.status(500).json({ message: 'Server error while rejecting the vendor.' });
  }
};
