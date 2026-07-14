const db = require('../config/db');

const BudgetCategory = {

  findAll: async () => {
    const [rows] = await db.query(`SELECT * FROM budget_categories ORDER BY name ASC`);
    return rows;
  },

  findById: async (id) => {
    const [rows] = await db.query(`SELECT * FROM budget_categories WHERE id = ?`, [id]);
    return rows[0];
  },

};

module.exports = BudgetCategory;
