const alertBox = document.getElementById('alertBox');
const eventSelect = document.getElementById('eventSelect');
const noEventState = document.getElementById('noEventState');
const budgetContent = document.getElementById('budgetContent');

let currentEventId = null;
let categories = [];
let categoryAnalysis = [];
let expenseItems = [];
let activeCategoryFilter = null;
let pieChart, barChart;

function showAlert(message, type = 'success') {
  alertBox.textContent = message;
  alertBox.className = `alert-msg show ${type}`;
  setTimeout(() => alertBox.classList.remove('show'), 4500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function formatMoney(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }


(async function init() {
  await loadCategories();
  await loadEventsDropdown();
})();

async function loadCategories() {
  try {
    const res = await fetch('/api/budget/categories');
    const data = await res.json();
    if (!res.ok) return;
    categories = data.categories;
    const opts = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    document.getElementById('allocCategory').innerHTML = opts;
    document.getElementById('expense_category_id').innerHTML = opts;
  } catch (err) {
    console.error('loadCategories error:', err);
  }
}

async function loadEventsDropdown() {
  try {
    const res = await fetch('/api/events');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load events.', 'error'); return; }

    eventSelect.innerHTML = '<option value="">Select an event…</option>' +
      data.events.map(e => `<option value="${e.id}">${escapeHtml(e.event_name)}</option>`).join('');

    if (data.events.length) {
      currentEventId = data.events[0].id;
      eventSelect.value = currentEventId;
      await loadEventBudget();
    } else {
      noEventState.style.display = 'block';
      budgetContent.style.display = 'none';
    }
  } catch (err) {
    console.error('loadEventsDropdown error:', err);
    showAlert('Network error while loading events.', 'error');
  }
}

eventSelect.addEventListener('change', async () => {
  currentEventId = eventSelect.value || null;
  activeCategoryFilter = null;
  if (currentEventId) await loadEventBudget();
  else {
    noEventState.style.display = 'block';
    budgetContent.style.display = 'none';
  }
});

async function loadEventBudget() {
  noEventState.style.display = 'none';
  budgetContent.style.display = 'block';

  await loadCategoryAnalysis();
  await Promise.all([
    loadSummary(),
    loadExpenses(),
  ]);
  await loadRecommendations();
}

async function loadSummary() {
  try {
    const res = await fetch(`/api/analysis/summary/${currentEventId}`);
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load budget summary.', 'error'); return; }

    document.getElementById('statTotalBudget').textContent = formatMoney(data.event.total_budget);
    document.getElementById('statEstimated').textContent = formatMoney(data.total_estimated);
    document.getElementById('statPaid').textContent = formatMoney(data.total_paid);
    document.getElementById('statRemaining').textContent = formatMoney(data.remaining_budget);
    document.getElementById('utilizationPct').textContent = `${data.budget_utilization_percent}%`;
    document.getElementById('utilizationBar').style.width = `${Math.min(data.budget_utilization_percent, 100)}%`;
  } catch (err) {
    console.error('loadSummary error:', err);
  }
}

async function loadCategoryAnalysis() {
  try {
    const res = await fetch(`/api/analysis/category-summary/${currentEventId}`);
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load category summary.', 'error'); return; }
    categoryAnalysis = data.categories;
    renderCharts();
    renderCategoryTabs();
  } catch (err) {
    console.error('loadCategoryAnalysis error:', err);
  }
}

function renderCharts() {
  const withSpend = categoryAnalysis.filter(c => c.paid_amount > 0 || c.allocated_budget > 0);
  const labels = withSpend.map(c => c.category_name);
  const paidData = withSpend.map(c => c.paid_amount);
  const allocatedData = withSpend.map(c => c.allocated_budget);
  const colors = ['#c0392b','#e67e22','#f1c40f','#16a34a','#2563eb','#8e44ad','#e74c3c','#d68910','#27ae60','#2980b9','#a93226','#f39c12','#7f8c8d','#ecdcc8','#34495e'];

  if (pieChart) pieChart.destroy();
  if (barChart) barChart.destroy();

  const pieCtx = document.getElementById('pieChart');
  pieChart = new Chart(pieCtx, {
    type: 'pie',
    data: { labels, datasets: [{ data: paidData, backgroundColor: colors }] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } },
  });

  const barCtx = document.getElementById('barChart');
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Allocated', data: allocatedData, backgroundColor: '#f0e8da' },
        { label: 'Paid', data: paidData, backgroundColor: '#c0392b' },
      ],
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { ticks: { font: { size: 9 } } } } },
  });
}

function renderCategoryTabs() {
  const tabsEl = document.getElementById('categoryTabs');
  tabsEl.innerHTML = `<button class="category-tab ${activeCategoryFilter === null ? 'active' : ''}" onclick="setCategoryFilter(null)">All</button>` +
    categoryAnalysis.map(c => `<button class="category-tab ${activeCategoryFilter === c.category_id ? 'active' : ''}" onclick="setCategoryFilter(${c.category_id})">${escapeHtml(c.category_name)}</button>`).join('');
}

function setCategoryFilter(catId) {
  activeCategoryFilter = catId;
  renderCategoryTabs();
  renderExpenseTable();
}


async function allocateBudget() {
  const category_id = document.getElementById('allocCategory').value;
  const allocation_type = document.getElementById('allocType').value;
  const value = document.getElementById('allocValue').value;

  if (!value || Number(value) < 0) { showAlert('Please enter a valid allocation value.', 'error'); return; }

  try {
    const res = await fetch('/api/budget/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: currentEventId, category_id, allocation_type, value }),
    });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to allocate budget.', 'error'); return; }
    document.getElementById('allocValue').value = '';
   document.getElementById('allocValue').value = '';
    showAlert('Budget allocated successfully.');
    await loadCategoryAnalysis();
    renderExpenseTable(); // refresh the Allocated column now that categoryAnalysis changed
    await loadRecommendations();
  } catch (err) {
    console.error('allocateBudget error:', err);
    showAlert('Network error while allocating budget.', 'error');
  }
}


async function loadExpenses() {
  try {
    const res = await fetch(`/api/budget/items?event_id=${currentEventId}`);
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load expenses.', 'error'); return; }
    expenseItems = data.items;
    renderExpenseTable();
  } catch (err) {
    console.error('loadExpenses error:', err);
  }
}

function renderExpenseTable() {
  const tbody = document.getElementById('expenseTableBody');
  const empty = document.getElementById('emptyExpenses');
  const filtered = activeCategoryFilter ? expenseItems.filter(i => i.category_id === activeCategoryFilter) : expenseItems;

  tbody.innerHTML = '';
  if (!filtered.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  const allocatedByCategory = new Map(categoryAnalysis.map(c => [c.category_id, c.allocated_budget]));

  filtered.forEach((item) => {
    const tr = document.createElement('tr');
    const statusClass = item.status === 'Fully Paid' ? 'Confirmed' : 'Pending';
    const allocated = allocatedByCategory.get(item.category_id);
    tr.innerHTML = `
      <td>${escapeHtml(item.expense_name)}</td>
      <td>${escapeHtml(item.category_name)}</td>
      <td>${allocated ? formatMoney(allocated) : '—'}</td>
      <td>${formatMoney(item.estimated_amount)}</td>
      <td>${formatMoney(item.paid_amount)}</td>
      <td>${formatMoney(item.pending_amount)}</td>
      <td><span class="rsvp-tag ${statusClass}">${item.status}</span></td>
      <td>
        <button class="btn-icon-sm" onclick="openDetailsModal(${item.id})">💳 Payments</button>
        <button class="btn-icon-sm" onclick="openExpenseModal(${item.id})">✏️</button>
        <button class="btn-danger" onclick="deleteExpense(${item.id})">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

const expenseModal = document.getElementById('expenseModal');
const expenseForm = document.getElementById('expenseForm');
const expenseAlertBox = document.getElementById('expenseAlertBox');
const expenseModalTitle = document.getElementById('expenseModalTitle');

function openExpenseModal(id) {
  if (!currentEventId) { showAlert('Please select an event first.', 'error'); return; }
  expenseAlertBox.classList.remove('show');
  if (typeof id === 'number') {
    const item = expenseItems.find(i => i.id === id);
    if (!item) return;
    expenseModalTitle.textContent = 'Edit Expense';
    document.getElementById('expense_id').value = item.id;
    document.getElementById('expense_name').value = item.expense_name;
    document.getElementById('expense_category_id').value = item.category_id;
    document.getElementById('estimated_amount').value = item.estimated_amount;
    document.getElementById('notes').value = item.notes || '';
  } else {
    expenseModalTitle.textContent = 'Add Expense';
    expenseForm.reset();
    document.getElementById('expense_id').value = '';
  }
  expenseModal.classList.add('show');
}
function closeExpenseModal() { expenseModal.classList.remove('show'); }

expenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('expense_id').value;
  const payload = {
    event_id: currentEventId,
    expense_name: document.getElementById('expense_name').value,
    category_id: document.getElementById('expense_category_id').value,
    estimated_amount: document.getElementById('estimated_amount').value,
    notes: document.getElementById('notes').value,
  };

  try {
    const url = id ? `/api/budget/items/${id}` : '/api/budget/items';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) {
      expenseAlertBox.textContent = data.message || 'Failed to save expense.';
      expenseAlertBox.className = 'alert-msg show error';
      return;
    }
    closeExpenseModal();
    showAlert(id ? 'Expense updated successfully.' : 'Expense added successfully.');
    await loadEventBudget();
  } catch (err) {
    console.error('save expense error:', err);
    expenseAlertBox.textContent = 'Network error while saving the expense.';
    expenseAlertBox.className = 'alert-msg show error';
  }
});

async function deleteExpense(id) {
  if (!confirm('Delete this expense? All related payment records will be removed too.')) return;
  try {
    const res = await fetch(`/api/budget/items/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to delete expense.', 'error'); return; }
    showAlert('Expense deleted successfully.');
    await loadEventBudget();
  } catch (err) {
    console.error('deleteExpense error:', err);
    showAlert('Network error while deleting the expense.', 'error');
  }
}

const detailsModal = document.getElementById('detailsModal');
const paymentForm = document.getElementById('paymentForm');
const detailsAlertBox = document.getElementById('detailsAlertBox');
let currentDetailsItemId = null;

async function openDetailsModal(id) {
  currentDetailsItemId = id;
  document.getElementById('payment_item_id').value = id;
  document.getElementById('payment_date').valueAsDate = new Date();
  detailsAlertBox.classList.remove('show');

  try {
    const res = await fetch(`/api/budget/items/${id}`);
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load expense details.', 'error'); return; }

    const item = data.item;
    document.getElementById('detailsTitle').textContent = item.expense_name;
    document.getElementById('detailsSummary').innerHTML = `
      Category: <strong>${escapeHtml(item.category_name)}</strong><br/>
      Estimated: <strong>${formatMoney(item.estimated_amount)}</strong> &nbsp;
      Paid: <strong>${formatMoney(item.paid_amount)}</strong> &nbsp;
      Pending: <strong>${formatMoney(item.pending_amount)}</strong><br/>
      Status: <strong>${item.status}</strong>
      ${item.notes ? `<br/>Notes: ${escapeHtml(item.notes)}` : ''}
    `;
    renderPaymentHistory(data.payments);
    detailsModal.classList.add('show');
  } catch (err) {
    console.error('openDetailsModal error:', err);
    showAlert('Network error while loading expense details.', 'error');
  }
}
function closeDetailsModal() { detailsModal.classList.remove('show'); }

function renderPaymentHistory(payments) {
  const tbody = document.getElementById('paymentHistoryBody');
  if (!payments.length) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#999;">No payments recorded yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = payments.map(p => `
    <tr>
      <td>${formatMoney(p.amount)}</td>
      <td>${new Date(p.payment_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
      <td><button class="btn-danger" onclick="deletePayment(${p.id})">🗑 Remove</button></td>
    </tr>
  `).join('');
}

paymentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const budget_item_id = document.getElementById('payment_item_id').value;
  const amount = document.getElementById('payment_amount').value;
  const payment_date = document.getElementById('payment_date').value;

  try {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget_item_id, amount, payment_date }),
    });
    const data = await res.json();
    if (!res.ok) {
      detailsAlertBox.textContent = data.message || 'Failed to record payment.';
      detailsAlertBox.className = 'alert-msg show error';
      return;
    }
    document.getElementById('payment_amount').value = '';
    renderPaymentHistory(data.payments);
    showAlert('Payment recorded successfully.');
    await loadEventBudget();

    openDetailsModal(currentDetailsItemId);
  } catch (err) {
    console.error('add payment error:', err);
    detailsAlertBox.textContent = 'Network error while recording the payment.';
    detailsAlertBox.className = 'alert-msg show error';
  }
});

async function deletePayment(paymentId) {
  if (!confirm('Remove this payment record?')) return;
  try {
    const res = await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to delete payment.', 'error'); return; }
    renderPaymentHistory(data.payments);
    showAlert('Payment removed successfully.');
    await loadEventBudget();
  } catch (err) {
    console.error('deletePayment error:', err);
    showAlert('Network error while deleting the payment.', 'error');
  }
}

async function loadRecommendations() {
  try {
    const res = await fetch(`/api/analysis/recommendations/${currentEventId}`);
    const data = await res.json();
    if (!res.ok) return;

    const overall = data.recommendations.find(r => r.category === 'Overall');
    if (overall) {
      const scoreMatch = overall.decision_process.match(/Health Score = ([\d.]+)/) || overall.recommendation.match(/score (\d+(\.\d+)?)/);
      document.getElementById('healthScore').textContent = scoreMatch ? `Health Score: ${scoreMatch[1]}/100` : '';
    }

    document.getElementById('recommendationsList').innerHTML = data.recommendations.map(r => `
      <div class="rec-card ${r.priority}">
        <div class="rec-title">${escapeHtml(r.category)}<span class="priority-pill ${r.priority}">${r.priority}</span></div>
        <div>${escapeHtml(r.recommendation)}</div>
     </div>
    `).join('');

    document.getElementById('reallocationList').innerHTML = data.reallocation_suggestions.length
      ? data.reallocation_suggestions.map(s => `
          <div class="rec-card Medium">
            <div class="rec-title">Move ${formatMoney(s.suggested_transfer_amount)}: ${escapeHtml(s.give_from)} → ${escapeHtml(s.receive_to)}</div>
            <div>${escapeHtml(s.reason)}</div>
          </div>
        `).join('')
      : `<div class="empty-state">No reallocation needed right now — spending looks balanced across categories.</div>`;
  } catch (err) {
    console.error('loadRecommendations error:', err);
  }
}
 

