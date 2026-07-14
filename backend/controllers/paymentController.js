const Payment    = require('../models/paymentModel');
const BudgetItem = require('../models/budgetItemModel');
const { isPositiveNumber } = require('../utils/validators');

exports.addPayment = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { budget_item_id, amount, payment_date } = req.body;

    if (!budget_item_id) return res.status(400).json({ message: 'Budget Item is required.' });
    if (!isPositiveNumber(amount)) return res.status(400).json({ message: 'Payment amount must be greater than zero.' });
    if (!payment_date) return res.status(400).json({ message: 'Payment Date is required.' });

    const item = await Payment.itemBelongsToUser(budget_item_id, userId);
    if (!item) return res.status(404).json({ message: 'Budget item not found.' });

    const alreadyPaid = await Payment.totalPaidForItem(budget_item_id);
    const willExceedEstimate = Number(amount) + alreadyPaid > Number(item.estimated_amount) + 0.01;

    await Payment.create(budget_item_id, amount, payment_date);
    const recalculated = await BudgetItem.recalculate(budget_item_id);
    const payments = await Payment.findByItem(budget_item_id);

    res.status(201).json({
      message: willExceedEstimate
        ? 'Payment recorded successfully. Note: total paid now exceeds this expense\'s original estimated amount.'
        : 'Payment recorded successfully.',
      exceeds_estimate: willExceedEstimate,
      payments,
      item: recalculated,
    });
  } catch (err) {
    console.error('addPayment error:', err);
    res.status(500).json({ message: 'Server error while recording the payment.' });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const item = await Payment.itemBelongsToUser(req.params.itemId, userId);
    if (!item) return res.status(404).json({ message: 'Budget item not found.' });
    const payments = await Payment.findByItem(req.params.itemId);
    res.json({ payments });
  } catch (err) {
    console.error('getPaymentHistory error:', err);
    res.status(500).json({ message: 'Server error while fetching payment history.' });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const existing = await Payment.findByIdAndOwnership(req.params.id, userId);
    if (!existing) return res.status(404).json({ message: 'Payment not found.' });

    const { amount, payment_date } = req.body;
    if (!isPositiveNumber(amount)) return res.status(400).json({ message: 'Payment amount must be greater than zero.' });
    if (!payment_date) return res.status(400).json({ message: 'Payment Date is required.' });

  
    await Payment.update(req.params.id, amount, payment_date);
    const recalculated = await BudgetItem.recalculate(existing.budget_item_id);
    const payments = await Payment.findByItem(existing.budget_item_id);
    res.json({ message: 'Payment updated successfully.', payments, item: recalculated });
  } catch (err) {
    console.error('updatePayment error:', err);
    res.status(500).json({ message: 'Server error while updating the payment.' });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const existing = await Payment.findByIdAndOwnership(req.params.id, userId);
    if (!existing) return res.status(404).json({ message: 'Payment not found.' });

    await Payment.remove(req.params.id);
    const recalculated = await BudgetItem.recalculate(existing.budget_item_id);
    const payments = await Payment.findByItem(existing.budget_item_id);
    res.json({ message: 'Payment deleted successfully.', payments, item: recalculated });
  } catch (err) {
    console.error('deletePayment error:', err);
    res.status(500).json({ message: 'Server error while deleting the payment.' });
  }
};
