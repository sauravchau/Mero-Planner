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
      `SELECT * FROM events
       WHERE user_id = ?
         AND (event_name LIKE ? OR category LIKE ? OR location LIKE ?)
       ORDER BY event_date ASC`,
      [userId, like, like, like]
    );
    return rows;
  },

  
  getStats: async (userId) => {
    const [rows] = await db.query(
      `SELECT
         COUNT(*)                                                AS total_events,
         SUM(CASE WHEN status = 'Upcoming'    THEN 1 ELSE 0 END)  AS upcoming_events,
         SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END)  AS inprogress_events,
         SUM(CASE WHEN status = 'Completed'   THEN 1 ELSE 0 END)  AS completed_events,
         SUM(CASE WHEN status = 'Cancelled'   THEN 1 ELSE 0 END)  AS cancelled_events,
         COALESCE(SUM(estimated_budget), 0)                      AS total_budget,
         COALESCE(SUM(expected_guests), 0)                       AS total_expected_guests
       FROM events WHERE user_id = ?`,
      [userId]
    );
    return rows[0];
  },

};

module.exports = Event;
