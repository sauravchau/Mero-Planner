const alertBox = document.getElementById('alertBox');
const eventSelect = document.getElementById('eventSelect');
const noEventState = document.getElementById('noEventState');
const checklistContent = document.getElementById('checklistContent');
const taskGrid = document.getElementById('taskGrid');
const noResultsState = document.getElementById('noResultsState');

const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const sortBySelect = document.getElementById('sortBy');

const taskModal = document.getElementById('taskModal');
const taskModalTitle = document.getElementById('taskModalTitle');
const taskFormError = document.getElementById('taskFormError');

let currentEventId = null;
let searchDebounce = null;


function showAlert(message, type = 'success') {
  alertBox.textContent = message;
  alertBox.className = `alert-msg show ${type}`;
  setTimeout(() => alertBox.classList.remove('show'), 4500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function statusLabel(status) {
  return { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }[status] || status;
}

function daysRemainingLabel(item) {
  if (item.status === 'completed') return { text: 'Completed', cls: 'ok' };
  if (item.days_remaining === null || item.days_remaining === undefined) return { text: 'No due date', cls: 'ok' };
  const n = item.days_remaining;
  if (n < 0) return { text: `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} overdue`, cls: 'overdue' };
  if (n === 0) return { text: 'Due today', cls: 'soon' };
  if (n <= 7) return { text: `${n} day${n === 1 ? '' : 's'} left`, cls: 'soon' };
  return { text: `${n} days left`, cls: 'ok' };
}



(async function init() {
  await loadEventsDropdown();
  bindStaticEvents();
})();

function bindStaticEvents() {
  eventSelect.addEventListener('change', async () => {
    currentEventId = eventSelect.value || null;
    if (currentEventId) {
      await loadChecklist();
    } else {
      noEventState.style.display = 'block';
      checklistContent.style.display = 'none';
    }
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(loadChecklist, 300);
  });
  categoryFilter.addEventListener('change', loadChecklist);
  statusFilter.addEventListener('change', loadChecklist);
  sortBySelect.addEventListener('change', loadChecklist);

  document.getElementById('regenerateBtn').addEventListener('click', regenerateChecklist);
  document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal());
  document.getElementById('taskCancelBtn').addEventListener('click', closeTaskModal);
  document.getElementById('taskModalCloseBtn').addEventListener('click', closeTaskModal);
  document.getElementById('taskSaveBtn').addEventListener('click', saveTask);
  taskModal.addEventListener('click', (e) => { if (e.target === taskModal) closeTaskModal(); });
}


async function loadEventsDropdown() {
  try {
    const res = await fetch('/api/events');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load events.', 'error'); return; }

    eventSelect.innerHTML = '<option value="">Select an event…</option>' +
      data.events.map(e => `<option value="${e.id}">${escapeHtml(e.event_name)} — ${formatDate(String(e.event_date).slice(0, 10))}</option>`).join('');

    if (data.events.length) {
      currentEventId = data.events[0].id;
      eventSelect.value = currentEventId;
      await loadChecklist();
    } else {
      noEventState.textContent = 'Create an event first — its checklist will generate automatically.';
      noEventState.style.display = 'block';
      checklistContent.style.display = 'none';
    }
  } catch (err) {
    console.error('loadEventsDropdown error:', err);
    showAlert('Network error while loading events.', 'error');
  }
}


async function loadChecklist() {
  if (!currentEventId) return;
  try {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (categoryFilter.value) params.set('category', categoryFilter.value);
    if (statusFilter.value) params.set('status', statusFilter.value);
    if (sortBySelect.value) params.set('sortBy', sortBySelect.value);

    const res = await fetch(`/api/checklist/${currentEventId}?${params.toString()}`);
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load checklist.', 'error'); return; }

    noEventState.style.display = 'none';
    checklistContent.style.display = 'block';

    populateCategoryFilter(data.categories, data.items);
    renderProgress(data.summary);
    renderTasks(data.items);
  } catch (err) {
    console.error('loadChecklist error:', err);
    showAlert('Network error while loading checklist.', 'error');
  }
}

function populateCategoryFilter(templateCategories, items) {
 
  const set = new Set(templateCategories || []);
  (items || []).forEach(i => set.add(i.category));
  const current = categoryFilter.value;
  const options = Array.from(set).sort();
  categoryFilter.innerHTML = '<option value="">All Categories</option>' +
    options.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  categoryFilter.value = current;

  // Also refresh the datalist used by the add/edit task modal.
  const datalist = document.getElementById('categoryOptions');
  datalist.innerHTML = options.map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
}

function renderProgress(summary) {
  document.getElementById('progressBar').style.width = `${summary.percentComplete}%`;
  document.getElementById('progressText').textContent = `${summary.percentComplete}% complete`;

  document.getElementById('summaryPills').innerHTML = `
    <span class="summary-pill completed">✓ Completed: ${summary.completed}</span>
    <span class="summary-pill pending">⏳ Pending: ${summary.pending}</span>
    <span class="summary-pill progress">🔄 In Progress: ${summary.in_progress}</span>
    ${summary.overdue > 0 ? `<span class="summary-pill overdue">⚠ Overdue: ${summary.overdue}</span>` : ''}
  `;
}

function renderTasks(items) {
  taskGrid.innerHTML = '';
  if (!items.length) {
    noResultsState.style.display = 'block';
    return;
  }
  noResultsState.style.display = 'none';

  items.forEach(item => {
    const remaining = daysRemainingLabel(item);
    const card = document.createElement('div');
    card.className = `task-card priority-${item.priority}` +
      (item.status === 'completed' ? ' is-completed' : '') +
      (item.is_overdue ? ' is-overdue' : '');

    card.innerHTML = `
      <div class="task-card-top">
        <input type="checkbox" class="task-check" ${item.status === 'completed' ? 'checked' : ''} title="Mark complete"/>
        <div class="task-title-block">
          <div class="task-title ${item.status === 'completed' ? 'is-done' : ''}">${escapeHtml(item.task_title)}</div>
          <div class="task-category">${escapeHtml(item.category)}</div>
        </div>
      </div>

      <div class="task-badges">
        <span class="badge-pill priority-${item.priority}">${item.priority}</span>
        <span class="badge-pill status-${item.status}">${statusLabel(item.status)}</span>
        ${item.is_custom ? '<span class="badge-pill custom-tag">Custom</span>' : ''}
        ${item.is_overdue ? '<span class="badge-pill overdue-tag">Overdue</span>' : ''}
      </div>

      <div class="task-meta-row">
        <span class="task-due">📅 ${formatDate(item.due_date)}</span>
        <span class="task-days-remaining ${remaining.cls}">${remaining.text}</span>
      </div>

      ${item.assigned_to ? `<div class="task-assigned">👤 <strong>Assigned:</strong> ${escapeHtml(item.assigned_to)}</div>` : ''}
      ${item.notes ? `<div class="task-notes">📝 ${escapeHtml(item.notes)}</div>` : ''}

      <div class="task-actions">
        <button class="btn-icon-sm btn-edit">Edit</button>
        <button class="btn-icon-sm btn-complete" ${item.status === 'completed' ? 'disabled' : ''}>Complete</button>
        <button class="btn-danger btn-delete">Delete</button>
      </div>
    `;

    card.querySelector('.task-check').addEventListener('change', (e) => {
      quickStatusUpdate(item.id, e.target.checked ? 'completed' : 'pending');
    });
    card.querySelector('.btn-edit').addEventListener('click', () => openTaskModal(item));
    card.querySelector('.btn-complete').addEventListener('click', () => quickStatusUpdate(item.id, 'completed'));
    const delBtn = card.querySelector('.btn-delete');
    if (delBtn) delBtn.addEventListener('click', () => deleteTask(item.id));

    taskGrid.appendChild(card);
  });
}

// ---- status toggle -----------------------------------------------------------

async function quickStatusUpdate(itemId, status) {
  try {
    const res = await fetch(`/api/checklist/${itemId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to update status.', 'error'); return; }
    await loadChecklist();
  } catch (err) {
    console.error('quickStatusUpdate error:', err);
    showAlert('Network error while updating status.', 'error');
  }
}

// ---- delete (custom tasks only) ------------------------------------------------

async function deleteTask(itemId) {
  if (!confirm('Delete this custom task? This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/checklist/${itemId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to delete task.', 'error'); return; }
    showAlert('Task deleted.');
    await loadChecklist();
  } catch (err) {
    console.error('deleteTask error:', err);
    showAlert('Network error while deleting task.', 'error');
  }
}

// ---- regenerate ----------------------------------------------------------------

async function regenerateChecklist() {
  if (!currentEventId) { showAlert('Please select an event first.', 'error'); return; }
  if (!confirm('Regenerate the auto-generated tasks for this event? Your custom tasks will be kept.')) return;
  try {
    const res = await fetch(`/api/checklist/generate/${currentEventId}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to regenerate checklist.', 'error'); return; }
    showAlert(data.message || 'Checklist regenerated.');
    await loadChecklist();
  } catch (err) {
    console.error('regenerateChecklist error:', err);
    showAlert('Network error while regenerating checklist.', 'error');
  }
}

// ---- add / edit modal ------------------------------------------------------------

function openTaskModal(item) {
  if (!currentEventId) { showAlert('Please select an event first.', 'error'); return; }
  taskFormError.textContent = '';

  document.getElementById('taskId').value = item ? item.id : '';
  document.getElementById('taskTitle').value = item ? item.task_title : '';
  document.getElementById('taskCategory').value = item ? item.category : '';
  document.getElementById('taskPriority').value = item ? item.priority : 'medium';
  document.getElementById('taskDueDate').value = item ? item.due_date : '';
  document.getElementById('taskStatus').value = item ? item.status : 'pending';
  document.getElementById('taskAssignedTo').value = item && item.assigned_to ? item.assigned_to : '';
  document.getElementById('taskNotes').value = item && item.notes ? item.notes : '';

  taskModalTitle.textContent = item ? 'Edit Task' : 'Add Task';
  taskModal.classList.add('show');
}

function closeTaskModal() {
  taskModal.classList.remove('show');
}

async function saveTask() {
  const id = document.getElementById('taskId').value;
  const task_title = document.getElementById('taskTitle').value.trim();
  const category = document.getElementById('taskCategory').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const due_date = document.getElementById('taskDueDate').value;
  const status = document.getElementById('taskStatus').value;
  const assigned_to = document.getElementById('taskAssignedTo').value.trim();
  const notes = document.getElementById('taskNotes').value.trim();

  if (!task_title) { taskFormError.textContent = 'Task title is required.'; return; }
  if (!category) { taskFormError.textContent = 'Category is required.'; return; }
  if (!due_date) { taskFormError.textContent = 'Due date is required.'; return; }
  taskFormError.textContent = '';

  const payload = { task_title, category, priority, due_date, status, assigned_to, notes };

  try {
    let res, data;
    if (id) {
      // Editing an existing task (generated or custom)
      res = await fetch(`/api/checklist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      // Adding a brand-new custom task
      res = await fetch('/api/checklist/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: currentEventId, ...payload }),
      });
    }
    data = await res.json();
    if (!res.ok) { taskFormError.textContent = data.message || 'Failed to save task.'; return; }

    showAlert(id ? 'Task updated.' : 'Task added.');
    closeTaskModal();
    await loadChecklist();
  } catch (err) {
    console.error('saveTask error:', err);
    taskFormError.textContent = 'Network error while saving task.';
  }
}
