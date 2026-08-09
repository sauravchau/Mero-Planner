const Booking = require('../models/bookingModel');
const Rating  = require('../models/ratingModel');
const Vendor  = require('../models/vendorModel');

exports.rateBooking = async (req, res) => {
  try {
    const numRating = Number(req.body.rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking || booking.user_id !== req.session.user.id) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (!['confirmed', 'completed'].includes(booking.status)) {
      return res.status(400).json({ message: 'You can only rate a vendor once your booking is confirmed.' });
    }

    const existing = await Rating.findByBooking(booking.id);
    if (existing) {
      return res.status(409).json({ message: 'You already rated this booking.' });
    }

    await Rating.create({
      booking_id: booking.id,
      user_id:    booking.user_id,
      vendor_id:  booking.vendor_id,
      rating:     numRating,
      comment:    req.body.comment,
    });

    const { avg_rating } = await Rating.averageForVendor(booking.vendor_id);
    await Vendor.updateRating(booking.vendor_id, avg_rating);

    res.status(201).json({ message: 'Thanks for rating this vendor!' });
  } catch (err) {
    console.error('rateBooking error:', err);
    res.status(500).json({ message: 'Server error while submitting your rating.' });
  }
};

exports.vendorRatings = async (req, res) => {
  try {
    const ratings = await Rating.findByVendor(req.params.vendorId);
    const summary = await Rating.averageForVendor(req.params.vendorId);
    res.json({
      ratings,
      average: Number(summary.avg_rating) || 0,
      total: summary.total,
    });
  } catch (err) {
    console.error('vendorRatings error:', err);
    res.status(500).json({ message: 'Server error while fetching ratings.' });
  }
};
