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
    const isOwner = ev.is_owner === undefined ? true : !!Number(ev.is_owner);
    const myRole = ev.my_role || 'owner';
    const canEdit = isOwner || myRole === 'editor';

    const card = document.createElement('div');
    card.className = 'entity-card';
    card.innerHTML = `
      <div class="ec-top">
        <div>
          <div class="ec-title">${escapeHtml(ev.event_name)}${!isOwner ? `<span class="ec-shared-badge">Shared · ${escapeHtml(myRole)}</span>` : ''}</div>
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
        ${canEdit ? `<button class="btn-icon-sm" onclick="openCollabModal(${ev.id})">🤝 Collaborate</button>` : ''}
        ${isOwner ? `<button class="btn-icon-sm" onclick="openEditModal(${ev.id})">✏️ Edit</button>` : ''}
        ${isOwner
          ? `<button class="btn-danger" onclick="deleteEvent(${ev.id})">🗑 Delete</button>`
          : `<button class="btn-danger" onclick="leaveEvent(${ev.id})">🚪 Leave</button>`}
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

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadEvents(searchInput.value.trim()), 300);
});

if (sessionStorage.getItem('eventCreated')) {
  sessionStorage.removeItem('eventCreated');
  showAlert('Event created successfully!');
}

const urlParams = new URLSearchParams(window.location.search);
const initialSearch = urlParams.get('search') || '';
if (initialSearch) searchInput.value = initialSearch;

loadEvents(initialSearch);


async function leaveEvent(eventId) {
  if (!confirm('Leave this event? You will lose access to it unless invited again.')) return;
  try {
    const collabRes = await fetch(`/api/events/${eventId}/collaborators`);
    const collabData = await collabRes.json();
    if (!collabRes.ok) { showAlert(collabData.message || 'Failed to leave event.', 'error'); return; }

    const mine = collabData.collaborators.find(c => c.is_me);
    if (!mine) { showAlert('Could not find your collaborator record.', 'error'); return; }

    const res = await fetch(`/api/events/${eventId}/collaborators/${mine.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to leave event.', 'error'); return; }
    showAlert('You have left the event.');
    loadEvents(searchInput.value.trim());
  } catch (err) {
    console.error('leaveEvent error:', err);
    showAlert('Network error while leaving the event.', 'error');
  }
}

const collabModal = document.getElementById('collabModal');
const collabAlertBox = document.getElementById('collabAlertBox');
const collabInviteForm = document.getElementById('collabInviteForm');
const collabList = document.getElementById('collabList');
let currentCollabEventId = null;

function showCollabAlert(message, type = 'error') {
  collabAlertBox.textContent = message;
  collabAlertBox.className = `alert-msg show ${type}`;
  setTimeout(() => collabAlertBox.classList.remove('show'), 4000);
}

async function openCollabModal(eventId) {
  currentCollabEventId = eventId;
  const ev = allEvents.find(e => e.id === eventId);
  document.getElementById('collabEventName').textContent = ev ? ev.event_name : '';
  collabAlertBox.classList.remove('show');
  collabModal.classList.add('show');
  await loadCollaborators();
}

function closeCollabModal() {
  collabModal.classList.remove('show');
  currentCollabEventId = null;
}

async function loadCollaborators() {
  if (!currentCollabEventId) return;
  try {
    const res = await fetch(`/api/events/${currentCollabEventId}/collaborators`);
    const data = await res.json();
    if (!res.ok) { showCollabAlert(data.message || 'Failed to load collaborators.'); return; }

    const isOwner = !!data.event.is_owner;
    collabInviteForm.style.display = isOwner ? 'flex' : 'none';

    if (!data.collaborators.length) {
      collabList.innerHTML = `<div class="empty-state" style="padding:16px;">No collaborators yet. ${isOwner ? 'Invite someone above!' : ''}</div>`;
      return;
    }

    collabList.innerHTML = data.collaborators.map((c) => `
      <div class="collab-row">
        <div class="collab-row-info">
          <div class="collab-row-name">
            ${escapeHtml(c.full_name)}
            <span class="collab-status-tag ${c.status}">${c.status}</span>
          </div>
          <div class="collab-row-email">${escapeHtml(c.email)} · invited by ${escapeHtml(c.invited_by_name)}</div>
        </div>
        <div class="collab-row-actions">
          ${isOwner
            ? `<select class="collab-role-select" onchange="changeCollabRole(${c.id}, this.value)">
                 <option value="editor" ${c.role === 'editor' ? 'selected' : ''}>Editor</option>
                 <option value="viewer" ${c.role === 'viewer' ? 'selected' : ''}>Viewer</option>
               </select>
               <button class="btn-danger" onclick="removeCollabRow(${c.id})">Remove</button>`
            : `<span class="role-badge ${c.role}">${c.role}</span>`}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('loadCollaborators error:', err);
    showCollabAlert('Network error while loading collaborators.');
  }
}

collabInviteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentCollabEventId) return;
  const email = document.getElementById('collab_email').value.trim();
  const role = document.getElementById('collab_role').value;

  try {
    const res = await fetch(`/api/events/${currentCollabEventId}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) { showCollabAlert(data.message || 'Failed to send invitation.'); return; }
    showCollabAlert(data.message, 'success');
    document.getElementById('collab_email').value = '';
    await loadCollaborators();
  } catch (err) {
    console.error('invite collaborator error:', err);
    showCollabAlert('Network error while sending the invitation.');
  }
});

async function changeCollabRole(collabId, role) {
  try {
    const res = await fetch(`/api/events/${currentCollabEventId}/collaborators/${collabId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) { showCollabAlert(data.message || 'Failed to update role.'); return; }
    showCollabAlert('Role updated.', 'success');
    await loadCollaborators();
  } catch (err) {
    console.error('changeCollabRole error:', err);
    showCollabAlert('Network error while updating the role.');
  }
}

async function removeCollabRow(collabId) {
  if (!confirm('Remove this collaborator from the event?')) return;
  try {
    const res = await fetch(`/api/events/${currentCollabEventId}/collaborators/${collabId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showCollabAlert(data.message || 'Failed to remove collaborator.'); return; }
    showCollabAlert('Collaborator removed.', 'success');
    await loadCollaborators();
  } catch (err) {
    console.error('removeCollabRow error:', err);
    showCollabAlert('Network error while removing the collaborator.');
  }
}
