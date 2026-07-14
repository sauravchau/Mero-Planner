const Event      = require('../models/eventModel');
const Guest      = require('../models/guestModel');
const BudgetItem = require('../models/budgetItemModel');
const { round2 } = require('../utils/budgetAnalysis');

exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [eventStats, guestStats, budgetTotals, categoryTotals, recentEvents] = await Promise.all([
      Event.getStats(userId),
      Guest.getStats(userId),
      BudgetItem.getUserTotals(userId),
      BudgetItem.getUserCategoryTotals(userId),
      Event.findAllByUser(userId),
    ]);

    const totalBudget = Number(eventStats.total_budget) || 0;
    const totalPaid = Number(budgetTotals.total_paid) || 0;
    const utilization = totalBudget > 0 ? round2((totalPaid / totalBudget) * 100) : 0;

  
    const upcomingPreview = recentEvents
      .filter(e => e.status === 'Upcoming' || e.status === 'In Progress')
      .slice(0, 2);

    const STATUS_PROGRESS = { Upcoming: 15, 'In Progress': 55, Completed: 100, Cancelled: 0 };
    const eventsWithProgress = upcomingPreview.map(e => ({ ...e, progress: STATUS_PROGRESS[e.status] ?? 0 }));

    res.json({
      total_events: Number(eventStats.total_events) || 0,
      upcoming_events: Number(eventStats.upcoming_events) || 0,
      inprogress_events: Number(eventStats.inprogress_events) || 0,
      completed_events: Number(eventStats.completed_events) || 0,
      cancelled_events: Number(eventStats.cancelled_events) || 0,

      total_budget: totalBudget,
      total_paid: totalPaid,
      total_pending: Number(budgetTotals.total_pending) || 0,
      budget_utilization_percent: utilization,
      category_breakdown: categoryTotals.map(c => ({ name: c.category_name, paid: Number(c.total_paid) })),

      total_guests: Number(guestStats.total_guests) || 0,
      invited_guests: Number(guestStats.invited_guests) || 0,
      confirmed_guests: Number(guestStats.confirmed_guests) || 0,
      pending_invitations: Number(guestStats.pending_invitations) || 0,

      recent_events: eventsWithProgress,
    });
  } catch (err) {
    console.error('getDashboardSummary error:', err);
    res.status(500).json({ message: 'Server error while building the dashboard summary.' });
  }
};
