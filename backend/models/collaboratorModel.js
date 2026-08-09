const db = require('../config/db');

const VALID_ROLES = ['editor', 'viewer'];

const Collaborator = {

  VALID_ROLES,


  findByEvent: async (eventId, viewerUserId = null) => {
    const [rows] = await db.query(
      `SELECT ec.*, u.full_name, u.email,
              inviter.full_name AS invited_by_name,
              (ec.user_id = ?) AS is_me
       FROM event_collaborators ec
       JOIN users u ON ec.user_id = u.id
       JOIN users inviter ON ec.invited_by = inviter.id
       WHERE ec.event_id = ?
       ORDER BY FIELD(ec.status,'accepted','pending','declined'), ec.created_at ASC`,
      [viewerUserId, eventId]
    );
    return rows;
  },

  findByEventAndUser: async (eventId, userId) => {
    const [rows] = await db.query(
      `SELECT * FROM event_collaborators WHERE event_id = ? AND user_id = ?`,
      [eventId, userId]
    );
    return rows[0];
  },

  findById: async (id) => {
    const [rows] = await db.query(`SELECT * FROM event_collaborators WHERE id = ?`, [id]);
    return rows[0];
  },

  // Pending invitations addressed to a user, with event + owner context,
  // for the "You have been invited to collaborate on X" notification.
  findPendingForUser: async (userId) => {
    const [rows] = await db.query(
      `SELECT ec.id, ec.role, ec.created_at, ec.event_id,
              e.event_name, e.event_date,
              owner.full_name AS owner_name
       FROM event_collaborators ec
       JOIN events e ON ec.event_id = e.id
       JOIN users owner ON e.user_id = owner.id
       WHERE ec.user_id = ? AND ec.status = 'pending'
       ORDER BY ec.created_at DESC`,
      [userId]
    );
    return rows;
  },

  invite: async (eventId, userId, invitedBy, role) => {
    const [result] = await db.query(
      `INSERT INTO event_collaborators (event_id, user_id, invited_by, role, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [eventId, userId, invitedBy, VALID_ROLES.includes(role) ? role : 'viewer']
    );
    return result.insertId;
  },

  respond: async (id, userId, status) => {
    const [result] = await db.query(
      `UPDATE event_collaborators
       SET status = ?, responded_at = NOW()
       WHERE id = ? AND user_id = ? AND status = 'pending'`,
      [status, id, userId]
    );
    return result.affectedRows;
  },

  updateRole: async (id, eventId, role) => {
    if (!VALID_ROLES.includes(role)) return 0;
    const [result] = await db.query(
      `UPDATE event_collaborators SET role = ? WHERE id = ? AND event_id = ?`,
      [role, id, eventId]
    );
    return result.affectedRows;
  },

  remove: async (id, eventId) => {
    const [result] = await db.query(
      `DELETE FROM event_collaborators WHERE id = ? AND event_id = ?`,
      [id, eventId]
    );
    return result.affectedRows;
  },

  removeByEventAndUser: async (eventId, userId) => {
    const [result] = await db.query(
      `DELETE FROM event_collaborators WHERE event_id = ? AND user_id = ?`,
      [eventId, userId]
    );
    return result.affectedRows;
  },

};

module.exports = Collaborator;
