const path = require('path');
const ChecklistItem = require('../models/checklistItemModel');
const ChecklistTemplate = require('../models/checklistTemplateModel');
const Event = require('../models/eventModel');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');
const VALID_STATUSES = ['pending', 'in_progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

exports.showChecklistPage = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'checklist.html'));
};

exports.generateChecklist = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { eventId } = req.params;

    const event = await Event.findByIdAndUser(eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const inserted = await ChecklistItem.generateForEvent(eventId, event.event_date);
    const items = await ChecklistItem.findByEvent(eventId, {});
    const summary = await ChecklistItem.getSummary(eventId);

    res.status(201).json({
      message: `Checklist generated (${inserted} tasks).`,
      items,
      summary,
    });
  } catch (err) {
    console.error('generateChecklist error:', err);
    res.status(500).json({ message: 'Server error while generating checklist.' });
  }
};

exports.getChecklist = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { eventId } = req.params;
    const { category, status, search, sortBy } = req.query;

    const event = await Event.findByIdAndUser(eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const items = await ChecklistItem.findByEvent(eventId, { category, status, search, sortBy });
    const summary = await ChecklistItem.getSummary(eventId); // always reflects the FULL list, not the filtered view
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

    const event = await Event.findByIdAndUser(event_id, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

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

    const affected = await ChecklistItem.deleteCustomItem(id);
    if (!affected) return res.status(404).json({ message: 'Task not found.' });

    res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error('deleteTask error:', err);
    res.status(500).json({ message: 'Server error while deleting task.' });
  }
};
