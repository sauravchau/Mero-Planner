const db = require('../config/db');

const Payment = {

  create: async (budgetItemId, amount, paymentDate) => {
    const [result] = await db.query(
      `INSERT INTO payments (budget_item_id, amount, payment_date) VALUES (?, ?, ?)`,
      [budgetItemId, amount, paymentDate]
    );
    return result.insertId;
  },

  findByItem: async (budgetItemId) => {
    const [rows] = await db.query(
      `SELECT * FROM payments WHERE budget_item_id = ? ORDER BY payment_date DESC, id DESC`,
      [budgetItemId]
    );
    return rows;
  },

  findByIdAndOwnership: async (paymentId, userId) => {
    const [rows] = await db.query(
      `SELECT p.* FROM payments p
       JOIN budget_items bi ON p.budget_item_id = bi.id
       JOIN events e ON bi.event_id = e.id
       WHERE p.id = ? AND e.user_id = ?`,
      [paymentId, userId]
    );
    return rows[0];
  },

  itemBelongsToUser: async (budgetItemId, userId) => {
    const [rows] = await db.query(
      `SELECT bi.id, bi.estimated_amount FROM budget_items bi
       JOIN events e ON bi.event_id = e.id
       WHERE bi.id = ? AND e.user_id = ?`,
      [budgetItemId, userId]
    );
    return rows[0];
  },

  update: async (paymentId, amount, paymentDate) => {
    const [result] = await db.query(
      `UPDATE payments SET amount = ?, payment_date = ? WHERE id = ?`,
      [amount, paymentDate, paymentId]
    );
    return result.affectedRows;
  },

  remove: async (paymentId) => {
    const [result] = await db.query(`DELETE FROM payments WHERE id = ?`, [paymentId]);
    return result.affectedRows;
  },

  totalPaidForItem: async (budgetItemId) => {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE budget_item_id = ?`,
      [budgetItemId]
    );
    return Number(rows[0].total);
  },

};

module.exports = Payment;
