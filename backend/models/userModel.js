const db = require('../config/db');

const User = {

  findByEmail: async (email) => {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },

  findById: async (id) => {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },

  create: async (full_name, email, hashedPassword, role = 'user') => {
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      [full_name, email, hashedPassword, role]
    );
    return result;
  },

  findByGoogleId: async (googleId) => {
    const [rows] = await db.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
    return rows[0];
  },

  createGoogleUser: async (full_name, email, googleId, role = 'user') => {
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, google_id, role, is_verified) VALUES (?, ?, ?, ?, 1)',
      [full_name, email, googleId, role]
    );
    return result;
  },

  linkGoogleId: async (id, googleId) => {
    const [result] = await db.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, id]);
    return result.affectedRows;
  },

  setVerificationToken: async (id, tokenHash, expiresAt) => {
    const [result] = await db.query(
      'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?',
      [tokenHash, expiresAt, id]
    );
    return result.affectedRows;
  },

  findByVerificationToken: async (tokenHash) => {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE verification_token = ? AND verification_token_expires > NOW()',
      [tokenHash]
    );
    return rows[0];
  },

  markVerified: async (id) => {
    const [result] = await db.query(
      'UPDATE users SET is_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  },

  setResetToken: async (email, tokenHash, expiresAt) => {
    const [result] = await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [tokenHash, expiresAt, email]
    );
    return result.affectedRows;
  },

  findByResetToken: async (tokenHash) => {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [tokenHash]
    );
    return rows[0];
  },

  updatePassword: async (id, hashedPassword) => {
    const [result] = await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, id]
    );
    return result.affectedRows;
  },


  setDeleteToken: async (id, tokenHash, expiresAt) => {
    const [result] = await db.query(
      'UPDATE users SET delete_token = ?, delete_token_expires = ? WHERE id = ?',
      [tokenHash, expiresAt, id]
    );
    return result.affectedRows;
  },

  findByDeleteToken: async (tokenHash) => {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE delete_token = ? AND delete_token_expires > NOW()',
      [tokenHash]
    );
    return rows[0];
  },

  clearDeleteToken: async (id) => {
    const [result] = await db.query(
      'UPDATE users SET delete_token = NULL, delete_token_expires = NULL WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  },

  findAll: async () => {
    const [rows] = await db.query(
      'SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  },

  setRole: async (id, role) => {
    const [result] = await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    return result.affectedRows;
  },

  remove: async (id) => {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows;
  },

};

module.exports = User;
