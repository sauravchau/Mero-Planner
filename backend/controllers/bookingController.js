const Booking = require('../models/bookingModel');
const Vendor  = require('../models/vendorModel');

exports.createBooking = async (req, res) => {
  try {
    const { vendor_id, event_id, event_date, message } = req.body;
    if (!vendor_id || !event_date) {
      return res.status(400).json({ message: 'Vendor and event date are required.' });
    }

    const vendor = await Vendor.findById(vendor_id);
    if (!vendor || vendor.status !== 'approved') {
      return res.status(404).json({ message: 'Vendor not found.' });
    }

    const id = await Booking.create({
      user_id: req.session.user.id,
      vendor_id,
      event_id,
      event_date,
      message,
    });
    const booking = await Booking.findById(id);
    res.status(201).json({ message: 'Booking request sent to the vendor.', booking });
  } catch (err) {
    console.error('createBooking error:', err);
    res.status(500).json({ message: 'Server error while creating the booking.' });
  }
};


exports.myBookings = async (req, res) => {
  try {
    const bookings = await Booking.findByUser(req.session.user.id);
    res.json({ bookings });
  } catch (err) {
    console.error('myBookings error:', err);
    res.status(500).json({ message: 'Server error while fetching your bookings.' });
  }
};

exports.vendorBookings = async (req, res) => {
  try {
    const vendor = await Vendor.findByUserId(req.session.user.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found.' });
    const bookings = await Booking.findByVendor(vendor.id);
    res.json({ bookings, vendor });
  } catch (err) {
    console.error('vendorBookings error:', err);
    res.status(500).json({ message: 'Server error while fetching bookings.' });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const vendor = await Vendor.findByUserId(req.session.user.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found.' });

    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.vendor_id !== vendor.id) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const allowed = ['confirmed', 'completed', 'cancelled'];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    await Booking.updateStatus(req.params.id, req.body.status);
    res.json({ message: 'Booking updated.' });
  } catch (err) {
    console.error('updateBookingStatus error:', err);
    res.status(500).json({ message: 'Server error while updating the booking.' });
  }
};
