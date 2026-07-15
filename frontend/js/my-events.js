const eventsGrid = document.getElementById('eventsGrid');
const emptyState = document.getElementById('emptyState');
const alertBox = document.getElementById('alertBox');
const searchInput = document.getElementById('searchInput');

const STATUS_CLASS = { Upcoming: 'upcoming', 'In Progress': 'inprogress', Completed: 'completed', Cancelled: 'cancelled' };

function showAlert(message, type = 'success') {
  alertBox.textContent = message;
  alertBox.className = `alert-msg show ${type}`;
  setTimeout(() => alertBox.classList.remove('show'), 4000);
}

function formatMoney(n) {
  return 'Rs ' + Number(n).toLocaleString('en-IN');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderEvents(events) {
  eventsGrid.innerHTML = '';
  if (!events.length) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  events.forEach((ev) => {
    const statusClass = STATUS_CLASS[ev.status] || 'upcoming';

    const card = document.createElement('div');
    card.className = 'entity-card';
    card.innerHTML = `
      <div class="ec-top">
        <div>
          <div class="ec-title">${escapeHtml(ev.event_name)}</div>
          <div class="ec-cat">${escapeHtml(ev.category)}</div>
        </div>
        <span class="status-tag ${statusClass}">${ev.status}</span>
      </div>
      <div class="ec-meta">
        📅 ${formatDate(ev.event_date)} &nbsp; 🕒 ${ev.event_time?.slice(0,5) || ''}<br/>
        📍 ${escapeHtml(ev.location)} &nbsp; 👥 ${ev.guest_count ?? 0} guests<br/>
        💰 ${formatMoney(ev.estimated_budget)} budget &nbsp; 🎟️ ${ev.expected_guests} expected
      </div>
      ${ev.description ? `<div class="ec-desc">${escapeHtml(ev.description)}</div>` : ''}
      <div class="ec-actions">
        <button class="btn-icon-sm" onclick="viewEvent(${ev.id})">👁 View</button>
        <button class="btn-icon-sm" onclick="openEditModal(${ev.id})">✏️ Edit</button>
        <button class="btn-danger" onclick="deleteEvent(${ev.id})">🗑 Delete</button>
      </div>
    `;
    eventsGrid.appendChild(card);
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

let allEvents = [];

async function loadEvents(search = '') {
  try {
    const url = search ? `/api/events?search=${encodeURIComponent(search)}` : '/api/events';
    const res = await fetch(url);
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load events.', 'error'); return; }
    allEvents = data.events;
    renderEvents(allEvents);
    document.getElementById('navEventCount').textContent = allEvents.length;
  } catch (err) {
    console.error('loadEvents error:', err);
    showAlert('Network error while loading events.', 'error');
  }
}

// View — simple detail alert for now (guest list & budget pages are the deep-dive views)
function viewEvent(id) {
  const ev = allEvents.find(e => e.id === id);
  if (!ev) return;
  alert(
    `${ev.event_name}\n\nCategory: ${ev.category}\nDate: ${formatDate(ev.event_date)} at ${ev.event_time}\nLocation: ${ev.location}\nBudget: ${formatMoney(ev.estimated_budget)}\nExpected Guests: ${ev.expected_guests}\nStatus: ${ev.status}\n\n${ev.description || ''}`
  );
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event? This will also remove its guests and budget data.')) return;
  try {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to delete event.', 'error'); return; }
    showAlert('Event deleted successfully.');
    loadEvents(searchInput.value.trim());
  } catch (err) {
    console.error('deleteEvent error:', err);
    showAlert('Network error while deleting the event.', 'error');
  }
}

// ---- Edit modal ----
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editEventForm');
const editAlertBox = document.getElementById('editAlertBox');

function openEditModal(id) {
  const ev = allEvents.find(e => e.id === id);
  if (!ev) return;
  document.getElementById('edit_id').value = ev.id;
  document.getElementById('edit_event_name').value = ev.event_name;
  document.getElementById('edit_category').value = ev.category;
  document.getElementById('edit_location').value = ev.location;
  document.getElementById('edit_event_date').value = ev.event_date?.split('T')[0] || ev.event_date;
  document.getElementById('edit_event_time').value = ev.event_time?.slice(0,5) || '';
  document.getElementById('edit_estimated_budget').value = ev.estimated_budget;
  document.getElementById('edit_expected_guests').value = ev.expected_guests;
  document.getElementById('edit_status').value = ev.status;
  document.getElementById('edit_description').value = ev.description || '';
  editAlertBox.classList.remove('show');
  editModal.classList.add('show');
}

function closeEditModal() {
  editModal.classList.remove('show');
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit_id').value;
  const payload = {
    event_name: document.getElementById('edit_event_name').value,
    category: document.getElementById('edit_category').value,
    location: document.getElementById('edit_location').value,
    event_date: document.getElementById('edit_event_date').value,
    event_time: document.getElementById('edit_event_time').value,
    estimated_budget: document.getElementById('edit_estimated_budget').value,
    expected_guests: document.getElementById('edit_expected_guests').value,
    status: document.getElementById('edit_status').value,
    description: document.getElementById('edit_description').value,
  };

  try {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      editAlertBox.textContent = data.message || 'Failed to update event.';
      editAlertBox.className = 'alert-msg show error';
      return;
    }
    closeEditModal();
    showAlert('Event updated successfully.');
    loadEvents(searchInput.value.trim());
  } catch (err) {
    console.error('update event error:', err);
    editAlertBox.textContent = 'Network error while updating the event.';
    editAlertBox.className = 'alert-msg show error';
  }
});

// ---- Search (debounced) ----
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadEvents(searchInput.value.trim()), 300);
});

// ---- Success banner right after redirect from create-event.html ----
if (sessionStorage.getItem('eventCreated')) {
  sessionStorage.removeItem('eventCreated');
  showAlert('Event created successfully!');
}

// ---- Pick up a ?search= query param (e.g. from the Dashboard search box) ----
const urlParams = new URLSearchParams(window.location.search);
const initialSearch = urlParams.get('search') || '';
if (initialSearch) searchInput.value = initialSearch;

loadEvents(initialSearch);
