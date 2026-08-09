const Event            = require('../models/eventModel');
const BudgetItem        = require('../models/budgetItemModel');
const BudgetAllocation  = require('../models/budgetAllocationModel');
const {
  buildCategoryAnalysis,
  mergeCategoryAnalysis,
  generateRecommendations,
  generateReallocationSuggestions,
  budgetHealthScore,
  costPerGuest,
  round2,
} = require('../utils/budgetAnalysis');
exports.getEventBudgetSummary = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const event = await Event.findByIdAndUser(req.params.eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const totalBudget = Number(event.estimated_budget);
    const totals = await BudgetItem.getEventTotals(event.id);
    const remainingBudget = round2(totalBudget - Number(totals.total_paid));
    const utilization = totalBudget > 0 ? round2((Number(totals.total_paid) / totalBudget) * 100) : 0;

    res.json({
      event: { id: event.id, event_name: event.event_name, total_budget: totalBudget, expected_guests: event.expected_guests },
      total_estimated: Number(totals.total_estimated),
      total_paid: Number(totals.total_paid),
      total_pending: Number(totals.total_pending),
      remaining_budget: remainingBudget,
      budget_utilization_percent: utilization,
      cost_per_guest: costPerGuest(totals.total_estimated, event.expected_guests),
    });
  } catch (err) {
    console.error('getEventBudgetSummary error:', err);
    res.status(500).json({ message: 'Server error while building the budget summary.' });
  }
};

exports.getCategorySummary = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const event = await Event.findByIdAndUser(req.params.eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const totalBudget = Number(event.estimated_budget);
    const categoryTotals = await BudgetItem.getCategoryTotals(event.id);
    const allocations = await BudgetAllocation.findByEvent(event.id);
    const analysis = mergeCategoryAnalysis(categoryTotals, allocations, totalBudget);
    const covered = new Set(analysis.map(a => a.category_id));
    allocations.forEach(a => {
      if (!covered.has(a.category_id)) {
        analysis.push({
          category_id: a.category_id,
          category_name: a.category_name,
          allocated_budget: Number(a.allocated_amount),
          estimated_expenses: 0,
          paid_amount: 0,
          pending_amount: 0,
          remaining_budget: Number(a.allocated_amount),
          utilization_percent: 0,
          variance: Number(a.allocated_amount),
          variance_percent: 100,
        });
      }
    });

    res.json({ categories: analysis });
  } catch (err) {
    console.error('getCategorySummary error:', err);
    res.status(500).json({ message: 'Server error while building the category summary.' });
  }
};

exports.getBudgetAnalysis = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const event = await Event.findByIdAndUser(req.params.eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const totalBudget = Number(event.estimated_budget);
    const eventTotals = await BudgetItem.getEventTotals(event.id);
    const categoryTotals = await BudgetItem.getCategoryTotals(event.id);
    const allocations = await BudgetAllocation.findByEvent(event.id);
   const categoryAnalysis = mergeCategoryAnalysis(categoryTotals, allocations, totalBudget);

    const health = budgetHealthScore(totalBudget, eventTotals.total_paid, eventTotals.total_estimated);

    res.json({
      total_budget: totalBudget,
      total_estimated_expenses: Number(eventTotals.total_estimated),
      total_paid: Number(eventTotals.total_paid),
      remaining_budget: round2(totalBudget - Number(eventTotals.total_paid)),
      cost_per_guest: costPerGuest(eventTotals.total_estimated, event.expected_guests),
      overall_budget_health_score: health,
      category_analysis: categoryAnalysis,
    });
  } catch (err) {
    console.error('getBudgetAnalysis error:', err);
    res.status(500).json({ message: 'Server error while running budget analysis.' });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const event = await Event.findByIdAndUser(req.params.eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const totalBudget = Number(event.estimated_budget);
    const eventTotals = await BudgetItem.getEventTotals(event.id);
    const categoryTotals = await BudgetItem.getCategoryTotals(event.id);
    const allocations = await BudgetAllocation.findByEvent(event.id);
    const categoryAnalysis = mergeCategoryAnalysis(categoryTotals, allocations, totalBudget);

    const recommendations = generateRecommendations(categoryAnalysis, eventTotals, totalBudget);
    const reallocation = generateReallocationSuggestions(categoryAnalysis);

    res.json({ recommendations, reallocation_suggestions: reallocation });
  } catch (err) {
    console.error('getRecommendations error:', err);
    res.status(500).json({ message: 'Server error while generating recommendations.' });
  }
};
