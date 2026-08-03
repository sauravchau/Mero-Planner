function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

async function loadNavEventCount() {
  const el = document.getElementById('navEventCount');
  if (!el) return;
  try {
    const res = await fetch('/api/events/stats');
    if (!res.ok) return;
    const data = await res.json();
    el.textContent = data.stats.total_events || 0;
  } catch (err) {
    console.error('Failed to load nav event count:', err);
  }
}


function escapeHtmlNav(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function buildInviteBell() {
  const topbar = document.querySelector('.topbar');
  if (!topbar || document.getElementById('inviteBellWrap')) return null;

  const wrap = document.createElement('div');
  wrap.id = 'inviteBellWrap';
  wrap.style.position = 'relative';
  wrap.style.marginLeft = 'auto';
  wrap.innerHTML = `
    <button class="icon-btn" id="inviteBellBtn" title="Collaboration invitations">
      🔔<span class="badge" id="inviteBellBadge" style="display:none;">0</span>
    </button>
    <div id="inviteDropdown" class="invite-dropdown"></div>
  `;
  topbar.appendChild(wrap);

  document.getElementById('inviteBellBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('inviteDropdown').classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('inviteDropdown');
    if (dd && !wrap.contains(e.target)) dd.classList.remove('open');
  });

  return wrap;
}

function renderInvitations(invitations) {
  const dropdown = document.getElementById('inviteDropdown');
  const badge = document.getElementById('inviteBellBadge');
  if (!dropdown || !badge) return;

  if (!invitations.length) {
    badge.style.display = 'none';
    dropdown.innerHTML = `<div class="invite-empty">No pending invitations.</div>`;
    return;
  }

  badge.style.display = 'flex';
  badge.textContent = invitations.length;

  dropdown.innerHTML = `<div class="invite-dropdown-title">Collaboration invitations</div>` +
    invitations.map((inv) => `
      <div class="invite-item" data-id="${inv.id}">
        <div class="invite-item-text">
          You've been invited to collaborate on
          <strong>"${escapeHtmlNav(inv.event_name)}"</strong>
          by ${escapeHtmlNav(inv.owner_name)} as <em>${inv.role}</em>.
        </div>
        <div class="invite-item-actions">
          <button class="btn-primary-sm" onclick="respondToInvitation(${inv.id}, 'accept')">Accept</button>
          <button class="btn-secondary-sm" onclick="respondToInvitation(${inv.id}, 'decline')">Decline</button>
        </div>
      </div>
    `).join('');
}

async function loadInvitations() {
  try {
    const res = await fetch('/api/collaborations/invitations');
    if (!res.ok) return;
    const data = await res.json();
    if (!document.getElementById('inviteBellWrap')) buildInviteBell();
    renderInvitations(data.invitations || []);
  } catch (err) {
    console.error('Failed to load invitations:', err);
  }
}

async function respondToInvitation(id, action) {
  try {
    const res = await fetch(`/api/collaborations/invitations/${id}/${action}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { alert(data.message || 'Something went wrong.'); return; }
    await loadInvitations();
    if (action === 'accept') {
      await loadNavEventCount();
      if (typeof loadEvents === 'function') loadEvents();
    }
  } catch (err) {
    console.error('respondToInvitation error:', err);
    alert('Network error while responding to the invitation.');
  }
}

loadNavEventCount();
loadInvitations();

