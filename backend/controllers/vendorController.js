const path = require('path');
const Vendor = require('../models/vendorModel');
const { recommendVendors } = require('../utils/vendorRecommendation');
const { isPositiveNumber, isNonNegativeNumber } = require('../utils/validators');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');

exports.showVendorsPage = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'vendors.html'));
};

exports.getFilters = async (req, res) => {
  try {
    const [locations, categories] = await Promise.all([
      Vendor.distinctLocations(),
      Vendor.distinctCategories(),
    ]);
    res.json({ locations, categories });
  } catch (err) {
    console.error('getFilters error:', err);
    res.status(500).json({ message: 'Server error while fetching vendor filters.' });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const { category, location } = req.query;
    const vendors = await Vendor.findAll({ category, location });
    res.json({ vendors });
  } catch (err) {
    console.error('getVendors error:', err);
    res.status(500).json({ message: 'Server error while fetching vendors.' });
  }
};

exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });
    res.json({ vendor });
  } catch (err) {
    console.error('getVendorById error:', err);
    res.status(500).json({ message: 'Server error while fetching the vendor.' });
  }
};

exports.recommend = async (req, res) => {
  try {
    const { location, budget, guest_capacity, rating, category } = req.body;

    if (!isPositiveNumber(budget)) {
      return res.status(400).json({ message: 'A valid budget (NPR) is required.' });
    }
    if (!isNonNegativeNumber(guest_capacity)) {
      return res.status(400).json({ message: 'Expected guest count must be zero or greater.' });
    }
    if (rating !== undefined && rating !== null && rating !== '' && !isNonNegativeNumber(rating)) {
      return res.status(400).json({ message: 'Minimum rating must be zero or greater.' });
    }

    const vendors = await Vendor.findAll(category ? { category } : {});
    if (!vendors.length) {
      return res.json({ recommendations: [], message: 'No vendors available in the database yet.' });
    }

    const recommendations = recommendVendors(
      { location, budget, guest_capacity, rating },
      vendors,
      5
    );

    res.json({
      recommendations: recommendations.map((v) => ({
        id: v.id,
        vendor_name: v.vendor_name,
        category: v.category,
        location: v.location,
        price_npr: Number(v.price_npr),
        rating: Number(v.rating),
        experience_years: Number(v.experience_years) || 0,
        guest_capacity: Number(v.guest_capacity),
        description: v.description,
        contact_phone: v.contact_phone,
        similarity: Math.round(v.similarity_score * 1000) / 10, // one decimal place, %
        within_budget: v.within_budget,
        location_match: v.location_match,
      })),
    });
  } catch (err) {
    console.error('recommendVendors error:', err);
    res.status(500).json({ message: 'Server error while generating vendor recommendations.' });
  }
};

// (used to grow/maintain the shared vendor dataset)
function validateVendorPayload(body) {
  const errors = [];
  if (!body.vendor_name || !body.vendor_name.trim()) errors.push('Vendor Name is required.');
  if (!body.category || !body.category.trim()) errors.push('Category is required.');
  if (!body.location || !body.location.trim()) errors.push('Location is required.');
  if (!isPositiveNumber(body.price_npr)) errors.push('Price (NPR) must be greater than zero.');
  if (body.rating !== undefined && body.rating !== null && body.rating !== '' && (Number(body.rating) < 0 || Number(body.rating) > 5)) {
    errors.push('Rating must be between 0 and 5.');
  }
  if (body.guest_capacity !== undefined && !isNonNegativeNumber(body.guest_capacity)) {
    errors.push('Guest Capacity cannot be negative.');
  }
  return errors;
}

exports.createVendor = async (req, res) => {
  try {
    const errors = validateVendorPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const insertId = await Vendor.create(req.body);
    const vendor = await Vendor.findById(insertId);
    res.status(201).json({ message: 'Vendor added successfully.', vendor });
  } catch (err) {
    console.error('createVendor error:', err);
    res.status(500).json({ message: 'Server error while adding the vendor.' });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const existing = await Vendor.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Vendor not found.' });

    const errors = validateVendorPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    await Vendor.update(req.params.id, req.body);
    const updated = await Vendor.findById(req.params.id);
    res.json({ message: 'Vendor updated successfully.', vendor: updated });
  } catch (err) {
    console.error('updateVendor error:', err);
    res.status(500).json({ message: 'Server error while updating the vendor.' });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const existing = await Vendor.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Vendor not found.' });

    await Vendor.remove(req.params.id);
    res.json({ message: 'Vendor deleted successfully.' });
  } catch (err) {
    console.error('deleteVendor error:', err);
    res.status(500).json({ message: 'Server error while deleting the vendor.' });
  }
};
