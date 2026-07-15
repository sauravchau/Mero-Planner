const alertBox = document.getElementById('alertBox');
const resultsGrid = document.getElementById('resultsGrid');
const resultsHeader = document.getElementById('resultsHeader');
const emptyResults = document.getElementById('emptyResults');
const prefForm = document.getElementById('prefForm');

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

// ---- Init ----
(async function init() {
  await loadFilters();
})();

async function loadFilters() {
  try {
    const res = await fetch('/api/vendors/filters');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!res.ok) return;

    document.getElementById('locationList').innerHTML =
      data.locations.map((l) => `<option value="${escapeHtml(l)}"></option>`).join('');

    const categorySelect = document.getElementById('pref_category');
    categorySelect.innerHTML = '<option value="">All Categories</option>' +
      data.categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  } catch (err) {
    console.error('loadFilters error:', err);
  }
}

// ---- Recommendation ----
prefForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    location: document.getElementById('pref_location').value.trim(),
    budget: document.getElementById('pref_budget').value,
    guest_capacity: document.getElementById('pref_guests').value || 0,
    rating: document.getElementById('pref_rating').value || 0,
    category: document.getElementById('pref_category').value || undefined,
  };

  if (!payload.budget) {
    showAlert('Please enter your maximum budget.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/vendors/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to get recommendations.', 'error'); return; }

    renderRecommendations(data.recommendations, payload);
  } catch (err) {
    console.error('recommend error:', err);
    showAlert('Network error while fetching recommendations.', 'error');
  }
});

function renderRecommendations(recs, prefs) {
  if (!recs.length) {
    resultsGrid.innerHTML = '';
    resultsHeader.style.display = 'none';
    emptyResults.style.display = 'block';
    emptyResults.innerHTML = 'No vendors matched your guest capacity or minimum rating. Try relaxing your filters.';
    return;
  }

  emptyResults.style.display = 'none';
  resultsHeader.style.display = 'block';
  resultsHeader.innerHTML = `Top ${recs.length} vendor${recs.length > 1 ? 's' : ''} matching your preferences` +
    (prefs.location ? ` near <strong>${escapeHtml(prefs.location)}</strong>` : '') + `:`;

  resultsGrid.innerHTML = recs.map((v) => `
    <div class="entity-card">
      <div class="ec-top">
        <div>
          <div class="ec-title">${escapeHtml(v.vendor_name)}</div>
          <div class="ec-cat">${escapeHtml(v.category)}</div>
        </div>
        <span class="similarity-badge">${v.similarity}% match</span>
      </div>
      <div class="ec-meta">
        ⭐ ${Number(v.rating).toFixed(1)} rating &nbsp;•&nbsp; 💰 ${formatMoney(v.price_npr)}${v.within_budget ? '' : ' <span style="color:#c0392b;">(over budget)</span>'}<br/>
        📍 ${escapeHtml(v.location)} ${v.location_match === 'exact' ? '(exact match)' : v.location_match === 'nearby' ? '(nearby)' : ''}<br/>
        ${v.experience_years ? `🏆 ${v.experience_years} years experience<br/>` : ''}
        ${v.guest_capacity ? `👥 Up to ${v.guest_capacity} guests` : '👥 Service vendor (no capacity limit)'}
      </div>
      <div class="ec-desc">${escapeHtml(v.description || '')}</div>
      <div class="ec-actions">
        <button class="btn-secondary" onclick='showVendorDetails(${JSON.stringify(v).replace(/'/g, "&#39;")})'>View Details</button>
        <button class="btn-primary" onclick="showAlert('Booking requests are coming soon!', 'success')">Book Now</button>
      </div>
    </div>
  `).join('');
}

function showVendorDetails(v) {
  document.getElementById('detailsTitle').textContent = v.vendor_name;
  document.getElementById('detailsBody').innerHTML = `
    <p><strong>Match Score:</strong> ${v.similarity}%</p>
    <p><strong>Category:</strong> ${escapeHtml(v.category)}</p>
    <p><strong>Location:</strong> ${escapeHtml(v.location)}</p>
    <p><strong>Price:</strong> ${formatMoney(v.price_npr)}</p>
    <p><strong>Rating:</strong> ${Number(v.rating).toFixed(1)} ⭐</p>
    <p><strong>Experience:</strong> ${v.experience_years ? v.experience_years + ' years' : 'Not listed'}</p>
    <p><strong>Guest Capacity:</strong> ${v.guest_capacity ? v.guest_capacity : 'N/A'}</p>
    <p><strong>Contact:</strong> ${escapeHtml(v.contact_phone || 'Not listed')}</p>
    <p><strong>Description:</strong> ${escapeHtml(v.description || 'No description available.')}</p>
  `;
  document.getElementById('detailsModal').classList.add('show');
}
function closeDetailsModal() {
  document.getElementById('detailsModal').classList.remove('show');
}
