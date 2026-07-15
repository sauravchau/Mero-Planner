const alertBox = document.getElementById('alertBox');
const tableBody = document.getElementById('guestTableBody');
const emptyState = document.getElementById('emptyState');
const searchName = document.getElementById('searchName');
const filterEvent = document.getElementById('filterEvent');
const filterCategory = document.getElementById('filterCategory');

let sortBy = 'guest_name';
let sortDir = 'asc';
let eventsList = [];

function showAlert(message, type = 'success') {
  alertBox.textContent = message;
  alertBox.className = `alert-msg show ${type}`;
  setTimeout(() => alertBox.classList.remove('show'), 4000);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}


async function loadEventsDropdown() {
  try {
    const res = await fetch('/api/events');
    const data = await res.json();
    if (!res.ok) return;
    eventsList = data.events;

    filterEvent.innerHTML = '<option value="">All Events</option>' +
      eventsList.map(e => `<option value="${e.id}">${escapeHtml(e.event_name)}</option>`).join('');

    document.getElementById('event_id').innerHTML = '<option value="">Select event…</option>' +
      eventsList.map(e => `<option value="${e.id}">${escapeHtml(e.event_name)}</option>`).join('');
  } catch (err) {
    console.error('loadEventsDropdown error:', err);
  }
}

// ---- Load summary stats ----
async function loadStats() {
  try {
    const res = await fetch('/api/guests/stats');
    const data = await res.json();
    if (!res.ok) return;
    document.getElementById('statTotal').textContent = data.stats.total_guests || 0;
    document.getElementById('statInvited').textContent = data.stats.invited_guests || 0;
    document.getElementById('statConfirmed').textContent = data.stats.confirmed_guests || 0;
    document.getElementById('statPending').textContent = data.stats.pending_invitations || 0;
  } catch (err) {
    console.error('loadStats error:', err);
  }
}

// ---- Load & render guest table ----
let allGuests = [];

async function loadGuests() {
  try {
    const params = new URLSearchParams();
    if (searchName.value.trim()) params.set('search', searchName.value.trim());
    if (filterEvent.value) params.set('event_id', filterEvent.value);
    if (filterCategory.value) params.set('category', filterCategory.value);
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);

    const res = await fetch(`/api/guests?${params.toString()}`);
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load guests.', 'error'); return; }

    allGuests = data.guests;
    renderGuests(allGuests);
  } catch (err) {
    console.error('loadGuests error:', err);
    showAlert('Network error while loading guests.', 'error');
  }
}

function renderGuests(guests) {
  tableBody.innerHTML = '';
  if (!guests.length) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  guests.forEach((g) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(g.guest_name)}</td>
      <td>${escapeHtml(g.phone)}</td>
      <td>${escapeHtml(g.category)}</td>
      <td>${escapeHtml(g.event_name)}</td>
      <td>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" class="invite-check" ${g.invitation_sent ? 'checked' : ''} onchange="toggleInvitation(${g.id}, this.checked)"/>
          <span>${g.invitation_sent ? 'Sent' : 'Not Sent'}</span>
        </label>
      </td>
      <td>
        <select onchange="changeRsvp(${g.id}, this.value)" style="border:none;background:transparent;font-weight:600;cursor:pointer;">
          <option value="Pending" ${g.rsvp_status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Confirmed" ${g.rsvp_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="Declined" ${g.rsvp_status === 'Declined' ? 'selected' : ''}>Declined</option>
        </select>
      </td>
      <td>
        <button class="btn-icon-sm" onclick="openEditModal(${g.id})">✏️ Edit</button>
        <button class="btn-danger" onclick="deleteGuest(${g.id})">🗑 Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

async function toggleInvitation(id, sent) {
  try {
    const res = await fetch(`/api/guests/${id}/invitation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sent }),
    });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to update invitation status.', 'error'); return; }
    loadGuests();
    loadStats();
  } catch (err) {
    console.error('toggleInvitation error:', err);
    showAlert('Network error while updating invitation status.', 'error');
  }
}

async function changeRsvp(id, status) {
  try {
    const res = await fetch(`/api/guests/${id}/rsvp`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to update RSVP status.', 'error'); return; }
    loadStats();
  } catch (err) {
    console.error('changeRsvp error:', err);
    showAlert('Network error while updating RSVP status.', 'error');
  }
}

async function deleteGuest(id) {
  if (!confirm('Are you sure you want to delete this guest?')) return;
  try {
    const res = await fetch(`/api/guests/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to delete guest.', 'error'); return; }
    showAlert('Guest deleted successfully.');
    loadGuests();
    loadStats();
  } catch (err) {
    console.error('deleteGuest error:', err);
    showAlert('Network error while deleting the guest.', 'error');
  }
}

// ---- Add / Edit modal ----
const guestModal = document.getElementById('guestModal');
const guestForm = document.getElementById('guestForm');
const guestAlertBox = document.getElementById('guestAlertBox');
const guestModalTitle = document.getElementById('guestModalTitle');
const guestSubmitBtn = document.getElementById('guestSubmitBtn');

function openAddModal() {
  guestModalTitle.textContent = 'Add Guest';
  guestForm.reset();
  document.getElementById('guest_id').value = '';
  guestAlertBox.classList.remove('show');
  guestModal.classList.add('show');
}

function openEditModal(id) {
  const g = allGuests.find(x => x.id === id);
  if (!g) return;
  guestModalTitle.textContent = 'Edit Guest';
  document.getElementById('guest_id').value = g.id;
  document.getElementById('guest_name').value = g.guest_name;
  document.getElementById('phone').value = g.phone;
  document.getElementById('email').value = g.email || '';
  document.getElementById('event_id').value = g.event_id;
  document.getElementById('category').value = g.category;
  guestAlertBox.classList.remove('show');
  guestModal.classList.add('show');
}

function closeGuestModal() {
  guestModal.classList.remove('show');
}

guestForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('guest_id').value;
  const payload = {
    guest_name: document.getElementById('guest_name').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    event_id: document.getElementById('event_id').value,
    category: document.getElementById('category').value,
  };

  guestSubmitBtn.disabled = true;
  try {
    const url = id ? `/api/guests/${id}` : '/api/guests';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      guestAlertBox.textContent = data.message || 'Failed to save guest.';
      guestAlertBox.className = 'alert-msg show error';
      guestSubmitBtn.disabled = false;
      return;
    }
    closeGuestModal();
    showAlert(id ? 'Guest updated successfully.' : 'Guest added successfully.');
    loadGuests();
    loadStats();
  } catch (err) {
    console.error('save guest error:', err);
    guestAlertBox.textContent = 'Network error while saving the guest.';
    guestAlertBox.className = 'alert-msg show error';
  } finally {
    guestSubmitBtn.disabled = false;
  }
});

// ---- Sorting ----
document.querySelectorAll('[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.getAttribute('data-sort');
    if (sortBy === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = col;
      sortDir = 'asc';
    }
    loadGuests();
  });
});

// ---- Search / filters (debounced) ----
let searchTimer;
searchName.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadGuests, 300);
});
filterEvent.addEventListener('change', loadGuests);
filterCategory.addEventListener('change', loadGuests);

// ---- Init ----
(async function init() {
  await loadEventsDropdown();
  await loadGuests();
  await loadStats();
})();
