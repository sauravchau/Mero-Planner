const alertBox = document.getElementById('alertBox');
let currentVendor = null;

function showAlert(message, type = 'success') {
  alertBox.textContent = message;
  alertBox.className = `alert-msg show ${type}`;
  setTimeout(() => alertBox.classList.remove('show'), 4500);
}
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function formatDate(d) { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function switchTab(e, tab) {
  if (e) e.preventDefault();
  document.querySelectorAll('.nav-item[data-tab]').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((el) => (el.style.display = 'none'));
  document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).style.display = 'block';
  if (tab === 'bookings') loadBookings();
  if (tab === 'reviews') loadReviews();
}

(async function init() {
  await loadProfile();
})();

async function loadProfile() {
  try {
    const res = await fetch('/api/vendor/me');
    if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load your profile.', 'error'); return; }

    currentVendor = data.vendor;
    renderStatusBanner(currentVendor.status, currentVendor.rejection_reason);

    document.getElementById('p_vendor_name').value = currentVendor.vendor_name || '';
    document.getElementById('p_category').value = currentVendor.category || '';
    document.getElementById('p_location').value = currentVendor.location || '';
    document.getElementById('p_price_npr').value = currentVendor.price_npr || '';
    document.getElementById('p_guest_capacity').value = currentVendor.guest_capacity || '';
    document.getElementById('p_experience_years').value = currentVendor.experience_years || '';
    document.getElementById('p_contact_phone').value = currentVendor.contact_phone || '';
    document.getElementById('p_description').value = currentVendor.description || '';
    document.getElementById('p_rating').value = `${Number(currentVendor.rating || 0).toFixed(1)} ⭐`;
  } catch (err) {
    console.error('loadProfile error:', err);
    showAlert('Network error while loading your profile.', 'error');
  }
}

function renderStatusBanner(status, reason) {
  const banner = document.getElementById('statusBanner');
  if (status === 'pending') {
    banner.style.display = 'block';
    banner.className = 'alert-msg show';
    banner.style.background = '#fef6e7';
    banner.style.color = '#d68910';
    banner.textContent = '⏳ Your listing is pending admin approval and is not yet visible to customers.';
  } else if (status === 'rejected') {
    banner.style.display = 'block';
    banner.className = 'alert-msg show error';
    banner.textContent = `❌ Your listing was rejected.${reason ? ' Reason: ' + reason : ''} Update your details and contact support.`;
  } else {
    banner.style.display = 'none';
  }
}

async function saveProfile() {
  const payload = {
    vendor_name: document.getElementById('p_vendor_name').value.trim(),
    category: document.getElementById('p_category').value.trim(),
    location: document.getElementById('p_location').value.trim(),
    price_npr: document.getElementById('p_price_npr').value,
    guest_capacity: document.getElementById('p_guest_capacity').value,
    experience_years: document.getElementById('p_experience_years').value,
    contact_phone: document.getElementById('p_contact_phone').value.trim(),
    description: document.getElementById('p_description').value.trim(),
  };
  try {
    const res = await fetch('/api/vendor/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to save changes.', 'error'); return; }
    showAlert('Profile updated.', 'success');
    currentVendor = data.vendor;
  } catch (err) {
    console.error('saveProfile error:', err);
    showAlert('Network error while saving your profile.', 'error');
  }
}


const STATUS_CLASS = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Confirmed', cancelled: 'Declined' };

async function loadBookings() {
  try {
    const res = await fetch('/api/vendor/bookings');
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load bookings.', 'error'); return; }

    const body = document.getElementById('bookingsBody');
    const empty = document.getElementById('bookingsEmpty');
    if (!data.bookings.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    body.innerHTML = data.bookings.map((b) => `
      <tr>
        <td>${escapeHtml(b.full_name)}<br/><span style="color:#999;font-size:11px;">${escapeHtml(b.email)}</span></td>
        <td>${formatDate(b.event_date)}</td>
        <td>${escapeHtml(b.message || '—')}</td>
        <td><span class="rsvp-tag ${STATUS_CLASS[b.status] || ''}">${escapeHtml(b.status)}</span></td>
        <td>${renderBookingActions(b)}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('loadBookings error:', err);
    showAlert('Network error while loading bookings.', 'error');
  }
}

function renderBookingActions(b) {
  if (b.status === 'pending') {
    return `<button class="btn-icon-sm" onclick="updateBooking(${b.id},'confirmed')">✅ Confirm</button>
            <button class="btn-danger" onclick="updateBooking(${b.id},'cancelled')">✕ Decline</button>`;
  }
  if (b.status === 'confirmed') {
    return `<button class="btn-icon-sm" onclick="updateBooking(${b.id},'completed')">🏁 Mark Completed</button>`;
  }
  return '—';
}

async function updateBooking(id, status) {
  try {
    const res = await fetch(`/api/vendor/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to update booking.', 'error'); return; }
    showAlert('Booking updated.', 'success');
    loadBookings();
  } catch (err) {
    console.error('updateBooking error:', err);
    showAlert('Network error while updating the booking.', 'error');
  }
}


async function loadReviews() {
  if (!currentVendor) return;
  try {
    const res = await fetch(`/api/vendors/${currentVendor.id}/ratings`);
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load reviews.', 'error'); return; }

    document.getElementById('reviewAvg').textContent = `${data.average.toFixed(1)} ⭐`;
    document.getElementById('reviewTotal').textContent = data.total;

    document.getElementById('reviewsList').innerHTML = data.ratings.map((r) => `
      <div class="entity-card" style="margin-bottom:10px;">
        <div class="ec-top">
          <div class="ec-title">${escapeHtml(r.full_name)}</div>
          <span class="similarity-badge">${Number(r.rating).toFixed(1)} ⭐</span>
        </div>
        ${r.comment ? `<div class="ec-desc">${escapeHtml(r.comment)}</div>` : ''}
      </div>
    `).join('') || '<div class="empty-state">No reviews yet.</div>';
  } catch (err) {
    console.error('loadReviews error:', err);
    showAlert('Network error while loading reviews.', 'error');
  }
}
