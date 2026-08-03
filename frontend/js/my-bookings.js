const alertBox = document.getElementById('alertBox');
const bookingsBody = document.getElementById('bookingsBody');
const emptyState = document.getElementById('emptyState');

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

const STATUS_CLASS = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Confirmed', cancelled: 'Declined' };

(async function init() {
  await loadBookings();
})();

async function loadBookings() {
  try {
    const res = await fetch('/api/bookings/mine');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load bookings.', 'error'); return; }
    renderBookings(data.bookings);
  } catch (err) {
    console.error('loadBookings error:', err);
    showAlert('Network error while loading your bookings.', 'error');
  }
}

function renderBookings(bookings) {
  if (!bookings.length) {
    bookingsBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  bookingsBody.innerHTML = bookings.map((b) => {
    const canRate = ['confirmed', 'completed'].includes(b.status) && !b.already_rated;
    const ratedLabel = b.already_rated ? '✅ Rated' : (['confirmed', 'completed'].includes(b.status) ? '—' : 'Available once confirmed');
    return `
      <tr>
        <td>${escapeHtml(b.vendor_name)}</td>
        <td>${escapeHtml(b.category)}</td>
        <td>${formatDate(b.event_date)}</td>
        <td><span class="rsvp-tag ${STATUS_CLASS[b.status] || ''}">${escapeHtml(b.status)}</span></td>
        <td>${ratedLabel}</td>
        <td>${canRate ? `<button class="btn-icon-sm" onclick="openRateModal(${b.id}, '${escapeHtml(b.vendor_name).replace(/'/g, "&#39;")}')">⭐ Rate</button>` : ''}</td>
      </tr>
    `;
  }).join('');
}


function openRateModal(bookingId, vendorName) {
  document.getElementById('rate_booking_id').value = bookingId;
  document.getElementById('rateTitle').textContent = `Rate ${vendorName}`;
  document.getElementById('rate_value').value = '';
  document.getElementById('rate_comment').value = '';
  document.getElementById('rateModal').classList.add('show');
}
function closeRateModal() {
  document.getElementById('rateModal').classList.remove('show');
}

document.getElementById('rateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const bookingId = document.getElementById('rate_booking_id').value;
  const rating = document.getElementById('rate_value').value;
  const comment = document.getElementById('rate_comment').value.trim();

  if (!rating) { showAlert('Please select a rating.', 'error'); return; }

  try {
    const res = await fetch(`/api/bookings/${bookingId}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment }),
    });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to submit rating.', 'error'); return; }

    closeRateModal();
    showAlert('Thanks for your feedback!', 'success');
    await loadBookings();
  } catch (err) {
    console.error('rating error:', err);
    showAlert('Network error while submitting your rating.', 'error');
  }
});
