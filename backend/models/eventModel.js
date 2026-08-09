const db = require('../config/db');

const Event = {

  create: async (userId, data) => {
    const {
      event_name, category, event_date, event_time,
      location, estimated_budget, expected_guests, description,
    } = data;
    const [result] = await db.query(
      `INSERT INTO events
        (user_id, event_name, category, event_date, event_time, location,
         estimated_budget, expected_guests, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Upcoming')`,
      [userId, event_name, category, event_date, event_time, location,
       estimated_budget, expected_guests, description || null]
    );
    return result.insertId;
  },

  findAllByUser: async (userId) => {
    const [rows] = await db.query(
      `SELECT * FROM events WHERE user_id = ? ORDER BY event_date ASC, id DESC`,
      [userId]
    );
    return rows;
  },

  findByIdAndUser: async (id, userId) => {
    const [rows] = await db.query(
      `SELECT * FROM events WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return rows[0];
  },

  getRole: async (id, userId) => {
    const [rows] = await db.query(`SELECT user_id FROM events WHERE id = ?`, [id]);
    if (!rows[0]) return null;
    if (rows[0].user_id === userId) return 'owner';
    const [collab] = await db.query(
      `SELECT role FROM event_collaborators WHERE event_id = ? AND user_id = ? AND status = 'accepted'`,
      [id, userId]
    );
    return collab[0] ? collab[0].role : null;
  },

  
  findByIdForMember: async (id, userId) => {
    const [rows] = await db.query(
      `SELECT e.*,
              CASE WHEN e.user_id = ? THEN 'owner' ELSE ec.role END AS my_role,
              (e.user_id = ?) AS is_owner
       FROM events e
       LEFT JOIN event_collaborators ec
         ON ec.event_id = e.id AND ec.user_id = ? AND ec.status = 'accepted'
       WHERE e.id = ? AND (e.user_id = ? OR ec.id IS NOT NULL)`,
      [userId, userId, userId, id, userId]
    );
    return rows[0];
  },


  findAllForUser: async (userId) => {
    const [rows] = await db.query(
      `SELECT e.*,
              CASE WHEN e.user_id = ? THEN 'owner' ELSE ec.role END AS my_role,
              (e.user_id = ?) AS is_owner
       FROM events e
       LEFT JOIN event_collaborators ec
         ON ec.event_id = e.id AND ec.user_id = ? AND ec.status = 'accepted'
       WHERE e.user_id = ? OR ec.id IS NOT NULL
       ORDER BY e.event_date ASC, e.id DESC`,
      [userId, userId, userId, userId]
    );
    return rows;
  },

  update: async (id, userId, data) => {
    const {
      event_name, category, event_date, event_time,
      location, estimated_budget, expected_guests, description, status,
    } = data;
    const [result] = await db.query(
      `UPDATE events SET
        event_name = ?, category = ?, event_date = ?, event_time = ?,
        location = ?, estimated_budget = ?, expected_guests = ?,
        description = ?, status = ?
       WHERE id = ? AND user_id = ?`,
      [event_name, category, event_date, event_time, location,
       estimated_budget, expected_guests, description || null,
       status || 'Upcoming', id, userId]
    );
    return result.affectedRows;
  },

  updateStatus: async (id, userId, status) => {
    const [result] = await db.query(
      `UPDATE events SET status = ? WHERE id = ? AND user_id = ?`,
      [status, id, userId]
    );
    return result.affectedRows;
  },

  remove: async (id, userId) => {
    const [result] = await db.query(
      `DELETE FROM events WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return result.affectedRows;
  },

  search: async (userId, term) => {
    const like = `%${term}%`;
    const [rows] = await db.query(
      `SELECT e.*,
              CASE WHEN e.user_id = ? THEN 'owner' ELSE ec.role END AS my_role,
              (e.user_id = ?) AS is_owner
       FROM events e
       LEFT JOIN event_collaborators ec
         ON ec.event_id = e.id AND ec.user_id = ? AND ec.status = 'accepted'
       WHERE (e.user_id = ? OR ec.id IS NOT NULL)
         AND (e.event_name LIKE ? OR e.category LIKE ? OR e.location LIKE ?)
       ORDER BY e.event_date ASC`,
      [userId, userId, userId, userId, like, like, like]
    );
    return rows;
  },

  
  getStats: async (userId, eventId = null) => {
    const params = [userId];
    let where = 'WHERE user_id = ?';
    if (eventId) {
      where += ' AND id = ?';
      params.push(eventId);
    }
    const [rows] = await db.query(
      `SELECT
         COUNT(*)                                                AS total_events,
         SUM(CASE WHEN status = 'Upcoming'    THEN 1 ELSE 0 END)  AS upcoming_events,
         SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END)  AS inprogress_events,
         SUM(CASE WHEN status = 'Completed'   THEN 1 ELSE 0 END)  AS completed_events,
         SUM(CASE WHEN status = 'Cancelled'   THEN 1 ELSE 0 END)  AS cancelled_events,
         COALESCE(SUM(estimated_budget), 0)                      AS total_budget,
         COALESCE(SUM(expected_guests), 0)                       AS total_expected_guests
       FROM events ${where}`,
      params
    );
    return rows[0];
  },

};

module.exports = Event;
