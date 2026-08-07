const db = require('../config/db');

const Booking = {

  create: async ({ user_id, vendor_id, event_id, event_date, message }) => {
    const [result] = await db.query(
      `INSERT INTO bookings (user_id, vendor_id, event_id, event_date, message)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, vendor_id, event_id || null, event_date, message || null]
    );
    return result.insertId;
  },

  findById: async (id) => {
    const [rows] = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
    return rows[0];
  },

  findByUser: async (user_id) => {
    const [rows] = await db.query(
      `SELECT b.*, v.vendor_name, v.category, v.image_url,
              (r.id IS NOT NULL) AS already_rated
       FROM bookings b
       JOIN vendors v ON v.id = b.vendor_id
       LEFT JOIN vendor_ratings r ON r.booking_id = b.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [user_id]
    );
    return rows;
  },

  findByVendor: async (vendor_id) => {
    const [rows] = await db.query(
      `SELECT b.*, u.full_name, u.email
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.vendor_id = ?
       ORDER BY b.created_at DESC`,
      [vendor_id]
    );
    return rows;
  },

  updateStatus: async (id, status) => {
    const [result] = await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows;
  },

};

module.exports = Booking;
