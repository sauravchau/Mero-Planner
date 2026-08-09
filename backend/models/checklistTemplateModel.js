const db = require('../config/db');

const ChecklistTemplate = {

  getAll: async () => {
    const [rows] = await db.query(
      `SELECT id, task_title, category, days_before_event, priority
       FROM checklist_templates
       ORDER BY days_before_event DESC, id ASC`
    );
    return rows;
  },

  getCategories: async () => {
    const [rows] = await db.query(
      `SELECT DISTINCT category FROM checklist_templates ORDER BY category ASC`
    );
    return rows.map(r => r.category);
  },

};

module.exports = ChecklistTemplate;
