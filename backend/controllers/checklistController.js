const path = require('path');
const ChecklistItem = require('../models/checklistItemModel');
const ChecklistTemplate = require('../models/checklistTemplateModel');
const Event = require('../models/eventModel');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');
const VALID_STATUSES = ['pending', 'in_progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];
 
async function assertCanEdit(eventId, userId, res) {
  const role = await Event.getRole(eventId, userId);
  if (!role) {
    res.status(404).json({ message: 'Event not found.' });
    return false;
  }
  if (role === 'viewer') {
    res.status(403).json({ message: 'You have view-only access to this event.' });
    return false;
  }
  return true;
}


exports.showChecklistPage = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'checklist.html'));
};

exports.getChecklist = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { eventId } = req.params;
    const { category, status, search, sortBy } = req.query;

    const event = await Event.findByIdForMember(eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const items = await ChecklistItem.findByEvent(eventId, { category, status, search, sortBy });
    const summary = await ChecklistItem.getSummary(eventId);
    const categories = await ChecklistTemplate.getCategories();

    res.json({ items, summary, categories, event });
  } catch (err) {
    console.error('getChecklist error:', err);
    res.status(500).json({ message: 'Server error while fetching checklist.' });
  }
};

exports.addCustomTask = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { event_id, task_title, category, due_date, priority, assigned_to, notes } = req.body;

    if (!event_id) return res.status(400).json({ message: 'event_id is required.' });

    const event = await Event.findByIdForMember(event_id, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (!(await assertCanEdit(event_id, userId, res))) return;

    if (!task_title || !task_title.trim()) return res.status(400).json({ message: 'Task title is required.' });
    if (!category || !category.trim()) return res.status(400).json({ message: 'Category is required.' });
    if (!due_date) return res.status(400).json({ message: 'Due date is required.' });
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: 'Priority must be low, medium, or high.' });
    }

    const insertId = await ChecklistItem.addCustomItem(event_id, {
      task_title, category, due_date, priority, assigned_to, notes,
    });
    const item = await ChecklistItem.findByIdForUser(insertId, userId);

    res.status(201).json({ message: 'Custom task added.', item });
  } catch (err) {
    console.error('addCustomTask error:', err);
    res.status(500).json({ message: 'Server error while adding custom task.' });
  }
};

exports.updateChecklistItem = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;

    const existing = await ChecklistItem.findByIdForUser(id, userId);
    if (!existing) return res.status(404).json({ message: 'Task not found.' });
    if (!(await assertCanEdit(existing.event_id, userId, res))) return;

    const { task_title, category, priority, status } = req.body;
    if (task_title !== undefined && !task_title.trim()) {
      return res.status(400).json({ message: 'Task title cannot be empty.' });
    }
    if (category !== undefined && !category.trim()) {
      return res.status(400).json({ message: 'Category cannot be empty.' });
    }
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: 'Priority must be low, medium, or high.' });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Status must be pending, in_progress, or completed.' });
    }

    const affected = await ChecklistItem.updateItem(id, req.body);
    if (!affected) return res.status(400).json({ message: 'No valid fields to update.' });

    const updated = await ChecklistItem.findByIdForUser(id, userId);
    res.json({ message: 'Task updated.', item: updated });
  } catch (err) {
    console.error('updateChecklistItem error:', err);
    res.status(500).json({ message: 'Server error while updating task.' });
  }
};


exports.updateTaskStatus = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Status must be pending, in_progress, or completed.' });
    }

    const existing = await ChecklistItem.findByIdForUser(id, userId);
    if (!existing) return res.status(404).json({ message: 'Task not found.' });
    if (!(await assertCanEdit(existing.event_id, userId, res))) return;

    await ChecklistItem.updateStatus(id, status);
    const updated = await ChecklistItem.findByIdForUser(id, userId);

    res.json({ message: 'Status updated.', item: updated });
  } catch (err) {
    console.error('updateTaskStatus error:', err);
    res.status(500).json({ message: 'Server error while updating status.' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { id } = req.params;

    const existing = await ChecklistItem.findByIdForUser(id, userId);
    if (!existing) return res.status(404).json({ message: 'Task not found.' });
    if (!(await assertCanEdit(existing.event_id, userId, res))) return;

    const affected = await ChecklistItem.deleteCustomItem(id);
    if (!affected) return res.status(404).json({ message: 'Task not found.' });

    res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error('deleteTask error:', err);
    res.status(500).json({ message: 'Server error while deleting task.' });
  }
};
