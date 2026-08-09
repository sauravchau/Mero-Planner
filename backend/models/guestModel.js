const db = require('../config/db');

const Guest = {

  create: async (data) => {
    const { event_id, guest_name, phone, email, category } = data;
    const [result] = await db.query(
      `INSERT INTO guests (event_id, guest_name, phone, email, category, invitation_sent, rsvp_status)
       VALUES (?, ?, ?, ?, ?, 0, 'Pending')`,
      [event_id, guest_name, phone, email || null, category]
    );
    return result.insertId;
  },

  findAllByUser: async (userId, filters = {}) => {
    let sql = `
      SELECT g.*, e.event_name
      FROM guests g
      JOIN events e ON g.event_id = e.id
      WHERE (e.user_id = ? OR e.id IN (
        SELECT event_id FROM event_collaborators WHERE user_id = ? AND status = 'accepted'
      ))`;
    const params = [userId, userId];

    if (filters.event_id) {
      sql += ` AND g.event_id = ?`;
      params.push(filters.event_id);
    }
    if (filters.category) {
      sql += ` AND g.category = ?`;
      params.push(filters.category);
    }
    if (filters.search) {
      sql += ` AND (g.guest_name LIKE ? OR g.phone LIKE ?)`;
      const like = `%${filters.search}%`;
      params.push(like, like);
    }

    const sortColumn = filters.sortBy === 'rsvp_status' ? 'g.rsvp_status' : 'g.guest_name';
    const sortDir = filters.sortDir === 'desc' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sortColumn} ${sortDir}`;

    const [rows] = await db.query(sql, params);
    return rows;
  },

  findByIdAndUser: async (id, userId) => {
    const [rows] = await db.query(
      `SELECT g.*, e.event_name FROM guests g
       JOIN events e ON g.event_id = e.id
       WHERE g.id = ? AND (e.user_id = ? OR e.id IN (
         SELECT event_id FROM event_collaborators WHERE user_id = ? AND status = 'accepted'
       ))`,
      [id, userId, userId]
    );
    return rows[0];
  },
  
  eventBelongsToUser: async (eventId, userId) => {
    const [rows] = await db.query(
      `SELECT id FROM events WHERE id = ? AND (user_id = ? OR id IN (
         SELECT event_id FROM event_collaborators WHERE user_id = ? AND status = 'accepted'
       ))`,
      [eventId, userId, userId]
    );
    return rows.length > 0;
  },

  update: async (id, userId, data) => {
    const { guest_name, phone, email, category, event_id } = data;
    const [result] = await db.query(
      `UPDATE guests g
       JOIN events e ON g.event_id = e.id
       SET g.guest_name = ?, g.phone = ?, g.email = ?, g.category = ?, g.event_id = ?
       WHERE g.id = ? AND (e.user_id = ? OR e.id IN (
         SELECT event_id FROM event_collaborators WHERE user_id = ? AND status = 'accepted'
       ))`,
      [guest_name, phone, email || null, category, event_id, id, userId, userId]
    );
    return result.affectedRows;
  },

  remove: async (id, userId) => {
    const [result] = await db.query(
      `DELETE g FROM guests g
       JOIN events e ON g.event_id = e.id
       WHERE g.id = ? AND (e.user_id = ? OR e.id IN (
         SELECT event_id FROM event_collaborators WHERE user_id = ? AND status = 'accepted'
       ))`,
      [id, userId, userId]
    );
    return result.affectedRows;
  },

  setInvitation: async (id, userId, sent) => {
    const [result] = await db.query(
      `UPDATE guests g
       JOIN events e ON g.event_id = e.id
       SET g.invitation_sent = ?
       WHERE g.id = ? AND (e.user_id = ? OR e.id IN (
         SELECT event_id FROM event_collaborators WHERE user_id = ? AND status = 'accepted'
       ))`,
      [sent ? 1 : 0, id, userId, userId]
    );
    return result.affectedRows;
  },

  setRsvp: async (id, userId, status) => {
    const [result] = await db.query(
      `UPDATE guests g
       JOIN events e ON g.event_id = e.id
       SET g.rsvp_status = ?
       WHERE g.id = ? AND (e.user_id = ? OR e.id IN (
         SELECT event_id FROM event_collaborators WHERE user_id = ? AND status = 'accepted'
       ))`,
      [status, id, userId, userId]
    );
    return result.affectedRows;
  },

  findByEvent: async (eventId, userId) => {
    const [rows] = await db.query(
      `SELECT g.* FROM guests g
       JOIN events e ON g.event_id = e.id
       WHERE g.event_id = ? AND (e.user_id = ? OR e.id IN (
         SELECT event_id FROM event_collaborators WHERE user_id = ? AND status = 'accepted'
       ))
       ORDER BY g.guest_name ASC`,
      [eventId, userId, userId]
    );
    return rows;
  },

  countByEvent: async (eventId) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS guest_count FROM guests WHERE event_id = ?`,
      [eventId]
    );
    return rows[0].guest_count;
  },

  getStats: async (userId, eventId = null) => {
    const params = [userId, userId];
    let where = `WHERE (e.user_id = ? OR e.id IN (
         SELECT event_id FROM event_collaborators WHERE user_id = ? AND status = 'accepted'
       ))`;
    if (eventId) {
      where += ' AND e.id = ?';
      params.push(eventId);
    }
    const [rows] = await db.query(
      `SELECT
         COUNT(*)                                                        AS total_guests,
         SUM(CASE WHEN g.invitation_sent = 1 THEN 1 ELSE 0 END)          AS invited_guests,
         SUM(CASE WHEN g.rsvp_status = 'Confirmed' THEN 1 ELSE 0 END)    AS confirmed_guests,
         SUM(CASE WHEN g.invitation_sent = 0 THEN 1 ELSE 0 END)         AS pending_invitations
       FROM guests g
       JOIN events e ON g.event_id = e.id
       ${where}`,
      params
    );
    return rows[0];
  },

};

module.exports = Guest;
