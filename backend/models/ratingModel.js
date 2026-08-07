const db = require('../config/db');

const Rating = {

  findByBooking: async (booking_id) => {
    const [rows] = await db.query('SELECT * FROM vendor_ratings WHERE booking_id = ?', [booking_id]);
    return rows[0];
  },

  create: async ({ booking_id, user_id, vendor_id, rating, comment }) => {
    const [result] = await db.query(
      `INSERT INTO vendor_ratings (booking_id, user_id, vendor_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [booking_id, user_id, vendor_id, rating, comment || null]
    );
    return result.insertId;
  },

  findByVendor: async (vendor_id) => {
    const [rows] = await db.query(
      `SELECT r.*, u.full_name
       FROM vendor_ratings r
       JOIN users u ON u.id = r.user_id
       WHERE r.vendor_id = ?
       ORDER BY r.created_at DESC`,
      [vendor_id]
    );
    return rows;
  },

  averageForVendor: async (vendor_id) => {
    const [rows] = await db.query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM vendor_ratings WHERE vendor_id = ?`,
      [vendor_id]
    );
    return rows[0];
  },

};

module.exports = Rating;
