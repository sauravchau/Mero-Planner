const path = require('path');
const BudgetCategory   = require('../models/budgetCategoryModel');
const BudgetAllocation = require('../models/budgetAllocationModel');
const BudgetItem       = require('../models/budgetItemModel');
const Event            = require('../models/eventModel');
const { isPositiveNumber, isNonNegativeNumber } = require('../utils/validators');
const { round2 } = require('../utils/budgetAnalysis');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');

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

exports.showBudgetPage = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'budget.html'));
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await BudgetCategory.findAll();
    res.json({ categories });
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ message: 'Server error while fetching budget categories.' });
  }
};

exports.allocateBudget = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { event_id, category_id, allocation_type, value } = req.body;

    if (!event_id || !category_id) return res.status(400).json({ message: 'Event and Category are required.' });
    if (!['percentage', 'fixed'].includes(allocation_type)) return res.status(400).json({ message: 'Allocation type must be percentage or fixed.' });
    if (!isNonNegativeNumber(value)) return res.status(400).json({ message: 'Allocation value cannot be negative.' });

    const event = await Event.findByIdForMember(event_id, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (!(await assertCanEdit(event_id, userId, res))) return;

    const totalBudget = Number(event.estimated_budget);
    let percentage, allocatedAmount;

    if (allocation_type === 'percentage') {
      percentage = Number(value);
      if (percentage > 100) return res.status(400).json({ message: 'Percentage cannot exceed 100%.' });
      allocatedAmount = round2((percentage / 100) * totalBudget);
    } else {
      allocatedAmount = Number(value);
      percentage = totalBudget > 0 ? round2((allocatedAmount / totalBudget) * 100) : 0;
    }

    const alreadyAllocated = await BudgetAllocation.totalAllocated(event_id, category_id);
    if (round2(alreadyAllocated + allocatedAmount) > totalBudget) {
      return res.status(400).json({
        message: `Total allocated amount (Rs ${round2(alreadyAllocated + allocatedAmount)}) would exceed the total event budget (Rs ${totalBudget}).`,
      });
    }

    await BudgetAllocation.upsert(event_id, category_id, allocation_type, percentage, allocatedAmount);
    const allocations = await BudgetAllocation.findByEvent(event_id);
    res.status(201).json({ message: 'Budget allocated successfully.', allocations });
  } catch (err) {
    console.error('allocateBudget error:', err);
    res.status(500).json({ message: 'Server error while allocating budget.' });
  }
};

exports.getAllocations = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const event = await Event.findByIdForMember(req.params.eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    const allocations = await BudgetAllocation.findByEvent(req.params.eventId);
    res.json({ allocations, total_budget: Number(event.estimated_budget) });
  } catch (err) {
    console.error('getAllocations error:', err);
    res.status(500).json({ message: 'Server error while fetching allocations.' });
  }
};

function validateItemPayload(body) {
  const errors = [];
  const { expense_name, category_id, estimated_amount, event_id } = body;
  if (!event_id) errors.push('Event is required.');
  if (!expense_name || !expense_name.trim()) errors.push('Expense Name is required.');
  if (!category_id) errors.push('Budget Category is required.');
  if (!isPositiveNumber(estimated_amount)) errors.push('Estimated Amount must be greater than zero.');
  return errors;
}

exports.createBudgetItem = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const errors = validateItemPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const owns = await BudgetItem.eventBelongsToUser(req.body.event_id, userId);
    if (!owns) return res.status(400).json({ message: 'Invalid Event selected.' });
    if (!(await assertCanEdit(req.body.event_id, userId, res))) return;

    const insertId = await BudgetItem.create(req.body);
    const item = await BudgetItem.findByIdAndUser(insertId, userId);
    res.status(201).json({ message: 'Expense added successfully.', item });
  } catch (err) {
    console.error('createBudgetItem error:', err);
    res.status(500).json({ message: 'Server error while adding the expense.' });
  }
};

exports.getBudgetItems = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { event_id } = req.query;
    const items = event_id
      ? await BudgetItem.findAllByEvent(event_id)
      : await BudgetItem.findAllByUser(userId);
    res.json({ items });
  } catch (err) {
    console.error('getBudgetItems error:', err);
    res.status(500).json({ message: 'Server error while fetching expenses.' });
  }
};

exports.getBudgetItemById = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const item = await BudgetItem.findByIdAndUser(req.params.id, userId);
    if (!item) return res.status(404).json({ message: 'Expense not found.' });
    const Payment = require('../models/paymentModel');
    const payments = await Payment.findByItem(item.id);
    res.json({ item, payments });
  } catch (err) {
    console.error('getBudgetItemById error:', err);
    res.status(500).json({ message: 'Server error while fetching the expense.' });
  }
};

exports.updateBudgetItem = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const existing = await BudgetItem.findByIdAndUser(req.params.id, userId);
    if (!existing) return res.status(404).json({ message: 'Expense not found.' });
    if (!(await assertCanEdit(existing.event_id, userId, res))) return;

    const errors = validateItemPayload({ ...req.body, event_id: existing.event_id });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    await BudgetItem.update(req.params.id, req.body);
    const updated = await BudgetItem.findByIdAndUser(req.params.id, userId);
    res.json({ message: 'Expense updated successfully.', item: updated });
  } catch (err) {
    console.error('updateBudgetItem error:', err);
    res.status(500).json({ message: 'Server error while updating the expense.' });
  }
};

exports.deleteBudgetItem = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const existing = await BudgetItem.findByIdAndUser(req.params.id, userId);
    if (!existing) return res.status(404).json({ message: 'Expense not found.' });
    if (!(await assertCanEdit(existing.event_id, userId, res))) return;

    await BudgetItem.remove(req.params.id); // payments cascade via FK
    res.json({ message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('deleteBudgetItem error:', err);
    res.status(500).json({ message: 'Server error while deleting the expense.' });
  }
};
  

