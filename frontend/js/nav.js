// Toggle sidebar on mobile
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Populate the "My Events" nav-count badge with the live total, if present on the page
async function loadNavEventCount() {
  const el = document.getElementById('navEventCount');
  if (!el) return;
  try {
    const res = await fetch('/api/events/stats');
    if (!res.ok) return;
    const data = await res.json();
    el.textContent = data.stats.total_events || 0;
  } catch (err) {
    // Non-critical — leave the badge as-is if this fails
    console.error('Failed to load nav event count:', err);
  }
}

loadNavEventCount();
