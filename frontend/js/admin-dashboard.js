const alertBox = document.getElementById('alertBox');
let vendorStatusFilter = 'pending';

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
function formatDate(d) { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function switchTab(e, tab) {
  if (e) e.preventDefault();
  document.querySelectorAll('.nav-item[data-tab]').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((el) => (el.style.display = 'none'));
  document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).style.display = 'block';
  if (tab === 'vendors') loadVendors();
  if (tab === 'users') loadUsers();
}

(async function init() {
  await loadVendors();
})();


function filterVendors(btn, status) {
  document.querySelectorAll('.category-tab').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  vendorStatusFilter = status;
  loadVendors();
}

async function loadVendors() {
  try {
    const url = vendorStatusFilter ? `/api/admin/vendors?status=${vendorStatusFilter}` : '/api/admin/vendors';
    const res = await fetch(url);
    if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load vendors.', 'error'); return; }

    const body = document.getElementById('vendorsBody');
    const empty = document.getElementById('vendorsEmpty');
    if (!data.vendors.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    body.innerHTML = data.vendors.map((v) => `
      <tr>
        <td>${escapeHtml(v.vendor_name)}</td>
        <td>${escapeHtml(v.category)}</td>
        <td>${escapeHtml(v.location)}</td>
        <td>${formatMoney(v.price_npr)}</td>
        <td>${escapeHtml(v.owner_email || '—')}</td>
        <td><span class="status-tag ${v.status === 'approved' ? 'completed' : v.status === 'rejected' ? 'cancelled' : ''}">${escapeHtml(v.status)}</span></td>
        <td>${renderVendorActions(v)}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('loadVendors error:', err);
    showAlert('Network error while loading vendors.', 'error');
  }
}

function renderVendorActions(v) {
  if (v.status === 'pending') {
    return `<button class="btn-icon-sm" onclick="approveVendor(${v.id})">✅ Approve</button>
            <button class="btn-danger" onclick="rejectVendor(${v.id})">✕ Reject</button>`;
  }
  if (v.status === 'rejected') {
    return `<button class="btn-icon-sm" onclick="approveVendor(${v.id})">✅ Approve</button>`;
  }
  return `<button class="btn-danger" onclick="rejectVendor(${v.id})">✕ Revoke</button>`;
}

async function approveVendor(id) {
  try {
    const res = await fetch(`/api/admin/vendors/${id}/approve`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to approve vendor.', 'error'); return; }
    showAlert('Vendor approved.', 'success');
    loadVendors();
  } catch (err) {
    console.error('approveVendor error:', err);
    showAlert('Network error while approving the vendor.', 'error');
  }
}

async function rejectVendor(id) {
  const reason = window.prompt('Reason for rejecting this vendor (optional):') || null;
  try {
    const res = await fetch(`/api/admin/vendors/${id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to reject vendor.', 'error'); return; }
    showAlert('Vendor rejected.', 'success');
    loadVendors();
  } catch (err) {
    console.error('rejectVendor error:', err);
    showAlert('Network error while rejecting the vendor.', 'error');
  }
}


async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to load users.', 'error'); return; }

    document.getElementById('usersBody').innerHTML = data.users.map((u) => `
      <tr>
        <td>${escapeHtml(u.full_name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>
          <select onchange="changeRole(${u.id}, this.value)" class="btn-icon-sm" style="cursor:pointer;">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
            <option value="vendor" ${u.role === 'vendor' ? 'selected' : ''}>vendor</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
          </select>
        </td>
        <td>${formatDate(u.created_at)}</td>
        <td><button class="btn-danger" onclick="deleteUser(${u.id})">✕ Remove</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('loadUsers error:', err);
    showAlert('Network error while loading users.', 'error');
  }
}

async function changeRole(id, role) {
  try {
    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to update role.', 'error'); loadUsers(); return; }
    showAlert('Role updated.', 'success');
  } catch (err) {
    console.error('changeRole error:', err);
    showAlert('Network error while updating the role.', 'error');
  }
}

async function deleteUser(id) {
  if (!window.confirm('Remove this user? This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showAlert(data.message || 'Failed to remove user.', 'error'); return; }
    showAlert('User removed.', 'success');
    loadUsers();
  } catch (err) {
    console.error('deleteUser error:', err);
    showAlert('Network error while removing the user.', 'error');
  }
}
