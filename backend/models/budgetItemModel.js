const db = require('../config/db');

const BudgetItem = {

  create: async (data) => {
    const { event_id, category_id, expense_name, estimated_amount, notes, receipt_path } = data;
    const [result] = await db.query(
      `INSERT INTO budget_items
        (event_id, category_id, expense_name, estimated_amount, paid_amount, pending_amount, status, notes, receipt_path)
       VALUES (?, ?, ?, ?, 0, ?, 'Pending', ?, ?)`,
      [event_id, category_id, expense_name, estimated_amount, estimated_amount, notes || null, receipt_path || null]
    );
    return result.insertId;
  },

  findAllByEvent: async (eventId) => {
    const [rows] = await db.query(
      `SELECT bi.*, bc.name AS category_name
       FROM budget_items bi
       JOIN budget_categories bc ON bi.category_id = bc.id
       WHERE bi.event_id = ?
       ORDER BY bi.created_at DESC`,
      [eventId]
    );
    return rows;
  },

  
  findAllByUser: async (userId) => {
    const [rows] = await db.query(
      `SELECT bi.*, bc.name AS category_name, e.event_name
       FROM budget_items bi
       JOIN budget_categories bc ON bi.category_id = bc.id
       JOIN events e ON bi.event_id = e.id
       WHERE e.user_id = ?
       ORDER BY bi.created_at DESC`,
      [userId]
    );
    return rows;
  },

  findByIdAndUser: async (id, userId) => {
    const [rows] = await db.query(
      `SELECT bi.*, bc.name AS category_name, e.event_name, e.id AS event_id
       FROM budget_items bi
       JOIN budget_categories bc ON bi.category_id = bc.id
       JOIN events e ON bi.event_id = e.id
       WHERE bi.id = ? AND e.user_id = ?`,
      [id, userId]
    );
    return rows[0];
  },

  eventBelongsToUser: async (eventId, userId) => {
    const [rows] = await db.query(`SELECT id FROM events WHERE id = ? AND user_id = ?`, [eventId, userId]);
    return rows.length > 0;
  },

  update: async (id, data) => {
    const { expense_name, category_id, estimated_amount, notes, receipt_path } = data;
    
    const [result] = await db.query(
      `UPDATE budget_items
       SET expense_name = ?, category_id = ?, estimated_amount = ?,
           pending_amount = GREATEST(? - paid_amount, 0),
           status = CASE WHEN paid_amount >= ? THEN 'Fully Paid' ELSE 'Pending' END,
           notes = ?, receipt_path = COALESCE(?, receipt_path)
       WHERE id = ?`,
      [expense_name, category_id, estimated_amount, estimated_amount, estimated_amount, notes || null, receipt_path || null, id]
    );
    return result.affectedRows;
  },

  remove: async (id) => {
    const [result] = await db.query(`DELETE FROM budget_items WHERE id = ?`, [id]);
    return result.affectedRows;
  },

  
  recalculate: async (itemId) => {
    const [[{ estimated_amount }]] = await db.query(
      `SELECT estimated_amount FROM budget_items WHERE id = ?`, [itemId]
    );
    const [[{ total_paid }]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE budget_item_id = ?`, [itemId]
    );
    const paid = Number(total_paid);
    const pending = Math.max(Number(estimated_amount) - paid, 0);
    const status = paid >= Number(estimated_amount) ? 'Fully Paid' : 'Pending';
    await db.query(
      `UPDATE budget_items SET paid_amount = ?, pending_amount = ?, status = ? WHERE id = ?`,
      [paid, pending, status, itemId]
    );
    return { paid_amount: paid, pending_amount: pending, status };
  },

  
  getEventTotals: async (eventId) => {
    const [rows] = await db.query(
      `SELECT
         COALESCE(SUM(estimated_amount), 0) AS total_estimated,
         COALESCE(SUM(paid_amount), 0)      AS total_paid,
         COALESCE(SUM(pending_amount), 0)   AS total_pending
       FROM budget_items WHERE event_id = ?`,
      [eventId]
    );
    return rows[0];
  },

  
  getCategoryTotals: async (eventId) => {
    const [rows] = await db.query(
      `SELECT bi.category_id, bc.name AS category_name,
              COALESCE(SUM(bi.estimated_amount), 0) AS total_estimated,
              COALESCE(SUM(bi.paid_amount), 0)      AS total_paid,
              COALESCE(SUM(bi.pending_amount), 0)   AS total_pending
       FROM budget_items bi
       JOIN budget_categories bc ON bi.category_id = bc.id
       WHERE bi.event_id = ?
       GROUP BY bi.category_id, bc.name`,
      [eventId]
    );
    return rows;
  },

  
  getUserTotals: async (userId) => {
    const [rows] = await db.query(
      `SELECT
         COALESCE(SUM(bi.estimated_amount), 0) AS total_estimated,
         COALESCE(SUM(bi.paid_amount), 0)      AS total_paid,
         COALESCE(SUM(bi.pending_amount), 0)   AS total_pending
       FROM budget_items bi
       JOIN events e ON bi.event_id = e.id
       WHERE e.user_id = ?`,
      [userId]
    );
    return rows[0];
  },

  
  getUserCategoryTotals: async (userId) => {
    const [rows] = await db.query(
      `SELECT bc.name AS category_name, COALESCE(SUM(bi.paid_amount), 0) AS total_paid
       FROM budget_items bi
       JOIN budget_categories bc ON bi.category_id = bc.id
       JOIN events e ON bi.event_id = e.id
       WHERE e.user_id = ?
       GROUP BY bc.name
       ORDER BY total_paid DESC`,
      [userId]
    );
    return rows;
  },

};

module.exports = BudgetItem;
