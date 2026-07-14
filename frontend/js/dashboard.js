function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function formatMoney(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const alertBox = document.getElementById('alertBox');
function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.className = `alert-msg show ${type}`;
}

async function loadUser() {
  try {
    const res = await fetch('/api/auth/user');
    const data = await res.json();
    if (!res.ok || !data.user) { window.location.href = '/login'; return; }
    document.getElementById('welcomeName').textContent = data.user.full_name.split(' ')[0];
  } catch (err) {
    console.error('Failed to load user:', err);
    window.location.href = '/login';
  }
}

const CATEGORY_COLORS = ['#c0392b', '#e67e22', '#f1c40f', '#16a34a', '#2563eb', '#8e44ad', '#ecdcc8'];
const STATUS_CLASS = { Upcoming: 'upcoming', 'In Progress': 'inprogress', Completed: 'completed', Cancelled: 'cancelled' };

async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard/summary');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const d = await res.json();
    if (!res.ok) { showAlert(d.message || 'Failed to load dashboard data.'); return; }

    
    document.getElementById('upcomingCountText').textContent = d.upcoming_events;
    document.getElementById('guestsConfirmedStat').textContent = d.confirmed_guests;
    document.getElementById('tasksDonePct').textContent = `${d.budget_utilization_percent}%`;
    document.getElementById('totalEventsStat').textContent = d.total_events;

    
    document.getElementById('statTotalBudget').textContent = formatMoney(d.total_budget);
    document.getElementById('statSpent').textContent = formatMoney(d.total_paid);
    document.getElementById('statGuests').textContent = `${d.confirmed_guests} / ${d.total_guests}`;
    document.getElementById('statEvents').textContent = d.total_events;

    
    const preview = document.getElementById('eventsPreview');
    const previewEmpty = document.getElementById('eventsPreviewEmpty');
    if (!d.recent_events.length) {
      preview.innerHTML = '';
      previewEmpty.style.display = 'block';
    } else {
      previewEmpty.style.display = 'none';
      preview.innerHTML = d.recent_events.map(ev => `
        <div class="event-item">
          <div class="event-date"><span class="month">${formatDate(ev.event_date).split(' ')[0].toUpperCase()}</span><span class="day">${formatDate(ev.event_date).split(' ')[1]}</span></div>
          <div class="event-info">
            <div class="event-name">${escapeHtml(ev.event_name)}</div>
            <div class="event-meta">📍 ${escapeHtml(ev.location)} &nbsp; 👥 ${ev.expected_guests} guests</div>
            <span class="status-tag ${STATUS_CLASS[ev.status] || 'upcoming'}">${ev.status}</span>
          </div>
        </div>
      `).join('');
    }

    // Budget overview donut 
    document.getElementById('budgetTotalText').innerHTML =
      `${formatMoney(d.total_paid)}<span>spent of ${formatMoney(d.total_budget)} total</span>`;
    document.getElementById('budgetDonut').style.background =
      `conic-gradient(#c0392b 0% ${Math.min(d.budget_utilization_percent, 100)}%, #f0e8da ${Math.min(d.budget_utilization_percent, 100)}% 100%)`;
    document.getElementById('budgetDonutLabel').innerHTML = `${d.budget_utilization_percent}%<br/><small>used</small>`;

    const catList = document.getElementById('budgetCategoriesList');
    if (!d.category_breakdown.length) {
      catList.innerHTML = `<div style="font-size:12px;color:#999;">No expenses recorded yet.</div>`;
    } else {
      catList.innerHTML = d.category_breakdown.slice(0, 5).map((c, i) => `
        <div class="bcat"><span class="dot" style="background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}"></span>${escapeHtml(c.name)} <strong>${formatMoney(c.paid)}</strong></div>
      `).join('');
    }

    // Guest summary
    document.getElementById('guestTotalNum').textContent = d.total_guests;
    document.getElementById('guestInvitedNum').textContent = d.invited_guests;
    document.getElementById('guestConfirmedNum').textContent = d.confirmed_guests;
    document.getElementById('guestPendingNum').textContent = d.pending_invitations;

    
    document.getElementById('statUpcoming').textContent = d.upcoming_events;
    document.getElementById('statInProgress').textContent = d.inprogress_events;
    document.getElementById('statCompleted').textContent = d.completed_events;
    document.getElementById('statCancelled').textContent = d.cancelled_events;

    document.getElementById('navEventCount').textContent = d.total_events;
  } catch (err) {
    console.error('loadDashboard error:', err);
    showAlert('Network error while loading the dashboard.');
  }
}

document.getElementById('dashboardSearch').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    window.location.href = `/my-events.html?search=${encodeURIComponent(e.target.value.trim())}`;
  }
});

loadUser();
loadDashboard();
