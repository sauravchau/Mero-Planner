const db = require('../config/db');
const ChecklistTemplate = require('./checklistTemplateModel');

const VALID_STATUSES = ['pending', 'in_progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
function calculateDueDate(eventDate, daysBeforeEvent) {
  const base = new Date(`${toDateOnly(eventDate)}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - Number(daysBeforeEvent));
  return base.toISOString().slice(0, 10);
}

function daysRemaining(dueDate) {
  if (!dueDate) return null;
  const due = new Date(`${toDateOnly(dueDate)}T00:00:00Z`);
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.round((due - todayUTC) / 86400000);
}

function enrich(item) {
  const remaining = daysRemaining(item.due_date);
  return {
    ...item,
    due_date: toDateOnly(item.due_date),
    days_remaining: remaining,
    is_overdue: item.status !== 'completed' && remaining !== null && remaining < 0,
  };
}

const ChecklistItem = {

  calculateDueDate,
  daysRemaining,

  generateForEvent: async (eventId, eventDate) => {
    const templates = await ChecklistTemplate.getAll();
    if (!templates.length) return 0;

    await db.query(
      `DELETE FROM checklist_items WHERE event_id = ? AND is_custom = FALSE`,
      [eventId]
    );

    const values = templates.map(t => ([
      eventId,
      t.task_title,
      t.category,
      t.days_before_event,
      calculateDueDate(eventDate, t.days_before_event),
      'pending',
      t.priority,
      null, 
      null, 
      false, 
    ]));

    const [result] = await db.query(
      `INSERT INTO checklist_items
        (event_id, task_title, category, days_before_event, due_date,
         status, priority, assigned_to, notes, is_custom)
       VALUES ?`,
      [values]
    );
    return result.affectedRows;
  },

  recalculateDueDates: async (eventId, newEventDate) => {
    const [result] = await db.query(
      `UPDATE checklist_items
       SET due_date = DATE_SUB(?, INTERVAL days_before_event DAY)
       WHERE event_id = ? AND is_custom = FALSE AND days_before_event IS NOT NULL`,
      [toDateOnly(newEventDate), eventId]
    );
    return result.affectedRows;
  },

  findByEvent: async (eventId, filters = {}) => {
    const { category, status, search, sortBy } = filters;
    const params = [eventId];
    let sql = `SELECT * FROM checklist_items WHERE event_id = ?`;

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    if (status && VALID_STATUSES.includes(status)) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (search && search.trim()) {
      sql += ` AND (task_title LIKE ? OR notes LIKE ? OR assigned_to LIKE ?)`;
      const like = `%${search.trim()}%`;
      params.push(like, like, like);
    }

    const sortMap = {
      due_date_asc:  'due_date IS NULL, due_date ASC',
      due_date_desc: 'due_date IS NULL, due_date DESC',
      priority:      `FIELD(priority, 'high','medium','low')`,
      status:        `FIELD(status, 'pending','in_progress','completed')`,
      created_at:    'created_at DESC',
    };
    sql += ` ORDER BY ${sortMap[sortBy] || sortMap.due_date_asc}, id ASC`;

    const [rows] = await db.query(sql, params);
    return rows.map(enrich);
  },

  findByIdForUser: async (id, userId) => {
    const [rows] = await db.query(
      `SELECT ci.* FROM checklist_items ci
       JOIN events e ON ci.event_id = e.id
       WHERE ci.id = ? AND e.user_id = ?`,
      [id, userId]
    );
    return rows[0] ? enrich(rows[0]) : null;
  },

  getSummary: async (eventId) => {
    const [rows] = await db.query(
      `SELECT
         COUNT(*)                                                            AS total,
         SUM(CASE WHEN status = 'completed'   THEN 1 ELSE 0 END)             AS completed,
         SUM(CASE WHEN status = 'pending'     THEN 1 ELSE 0 END)             AS pending,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)             AS in_progress,
         SUM(CASE WHEN status != 'completed' AND due_date < CURDATE()
                  THEN 1 ELSE 0 END)                                         AS overdue
       FROM checklist_items WHERE event_id = ?`,
      [eventId]
    );
    const r = rows[0];
    const total = Number(r.total) || 0;
    const completed = Number(r.completed) || 0;
    return {
      total,
      completed,
      pending: Number(r.pending) || 0,
      in_progress: Number(r.in_progress) || 0,
      overdue: Number(r.overdue) || 0,
      percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  },


  addCustomItem: async (eventId, data) => {
    const { task_title, category, due_date, priority, assigned_to, notes } = data;
    const [result] = await db.query(
      `INSERT INTO checklist_items
        (event_id, task_title, category, days_before_event, due_date,
         status, priority, assigned_to, notes, is_custom)
       VALUES (?, ?, ?, NULL, ?, 'pending', ?, ?, ?, TRUE)`,
      [
        eventId,
        task_title.trim(),
        category,
        due_date,
        VALID_PRIORITIES.includes(priority) ? priority : 'medium',
        assigned_to ? assigned_to.trim() : null,
        notes ? notes.trim() : null,
      ]
    );
    return result.insertId;
  },

  updateItem: async (id, data) => {
    const allowed = ['task_title', 'category', 'due_date', 'priority', 'assigned_to', 'notes', 'status'];
    const fields = [];
    const params = [];

    allowed.forEach((key) => {
      if (data[key] === undefined) return;
      if (key === 'status' && !VALID_STATUSES.includes(data.status)) return;
      if (key === 'priority' && !VALID_PRIORITIES.includes(data.priority)) return;
      fields.push(`${key} = ?`);
      params.push(data[key] === '' ? null : data[key]);
    });

    if (!fields.length) return 0;
    params.push(id);
    const [result] = await db.query(
      `UPDATE checklist_items SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    return result.affectedRows;
  },

  updateStatus: async (id, status) => {
    const [result] = await db.query(
      `UPDATE checklist_items SET status = ? WHERE id = ?`,
      [status, id]
    );
    return result.affectedRows;
  },

  deleteCustomItem: async (id) => {
    const [result] = await db.query(
      `DELETE FROM checklist_items WHERE id = ?`,
      [id]
    );
    return result.affectedRows;
  },

};

module.exports = ChecklistItem;
