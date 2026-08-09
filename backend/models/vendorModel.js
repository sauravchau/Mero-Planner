const db = require('../config/db');

const Vendor = {

  findAll: async (filters = {}) => {
    const clauses = [];
    const params = [];

    if (filters.category) {
      clauses.push('category = ?');
      params.push(filters.category);
    }
    if (filters.location) {
      clauses.push('location LIKE ?');
      params.push(`%${filters.location}%`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT * FROM vendors ${where} ORDER BY rating DESC`,
      params
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await db.query(`SELECT * FROM vendors WHERE id = ?`, [id]);
    return rows[0];
  },

  distinctLocations: async () => {
    const [rows] = await db.query(`SELECT DISTINCT location FROM vendors ORDER BY location`);
    return rows.map((r) => r.location);
  },

  distinctCategories: async () => {
    const [rows] = await db.query(`SELECT DISTINCT category FROM vendors ORDER BY category`);
    return rows.map((r) => r.category);
  },

  create: async (data) => {
    const { vendor_name, category, location, price_npr, rating, experience_years, guest_capacity, description, contact_phone, image_url } = data;
    const [result] = await db.query(
      `INSERT INTO vendors (vendor_name, category, location, price_npr, rating, experience_years, guest_capacity, description, contact_phone, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vendor_name, category, location, price_npr, rating || 0, experience_years || 0, guest_capacity || 0, description || null, contact_phone || null, image_url || null]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { vendor_name, category, location, price_npr, rating, experience_years, guest_capacity, description, contact_phone, image_url } = data;
    const [result] = await db.query(
      `UPDATE vendors
       SET vendor_name = ?, category = ?, location = ?, price_npr = ?, rating = ?, experience_years = ?,
           guest_capacity = ?, description = ?, contact_phone = ?, image_url = COALESCE(?, image_url)
       WHERE id = ?`,
      [vendor_name, category, location, price_npr, rating || 0, experience_years || 0, guest_capacity || 0, description || null, contact_phone || null, image_url || null, id]
    );
    return result.affectedRows;
  },

  remove: async (id) => {
    const [result] = await db.query(`DELETE FROM vendors WHERE id = ?`, [id]);
    return result.affectedRows;
  },

};

module.exports = Vendor;