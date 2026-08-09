const db = require('../config/db');

const BudgetAllocation = {

  findByEvent: async (eventId) => {
    const [rows] = await db.query(
      `SELECT ba.*, bc.name AS category_name
       FROM budget_allocations ba
       JOIN budget_categories bc ON ba.category_id = bc.id
       WHERE ba.event_id = ?
       ORDER BY bc.name ASC`,
      [eventId]
    );
    return rows;
  },

  findOne: async (eventId, categoryId) => {
    const [rows] = await db.query(
      `SELECT * FROM budget_allocations WHERE event_id = ? AND category_id = ?`,
      [eventId, categoryId]
    );
    return rows[0];
  },

  totalAllocated: async (eventId, excludeCategoryId = null) => {
    let sql = `SELECT COALESCE(SUM(allocated_amount), 0) AS total FROM budget_allocations WHERE event_id = ?`;
    const params = [eventId];
    if (excludeCategoryId) {
      sql += ` AND category_id != ?`;
      params.push(excludeCategoryId);
    }
    const [rows] = await db.query(sql, params);
    return Number(rows[0].total);
  },

  upsert: async (eventId, categoryId, allocationType, percentage, allocatedAmount) => {
    const [result] = await db.query(
      `INSERT INTO budget_allocations (event_id, category_id, allocation_type, percentage, allocated_amount)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         allocation_type = VALUES(allocation_type),
         percentage = VALUES(percentage),
         allocated_amount = VALUES(allocated_amount)`,
      [eventId, categoryId, allocationType, percentage, allocatedAmount]
    );
    return result;
  },

  remove: async (eventId, categoryId) => {
    const [result] = await db.query(
      `DELETE FROM budget_allocations WHERE event_id = ? AND category_id = ?`,
      [eventId, categoryId]
    );
    return result.affectedRows;
  },

};

module.exports = BudgetAllocation;
