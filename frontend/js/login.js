let activeRole = 'Event Organizer';
// Switch role tab (Event Organizer / Vendor / Admin)

document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
function setRole(btn) {
  btn.classList.add('active');
  activeRole = btn.textContent.trim();
}

const alert = document.getElementById('alert');
function showAlert(message, type) {
  alert.textContent = message;
  alert.className = `alert ${type}`;
}

function setLoading(loading) {
  const btn = document.getElementById('loginBtn');
  btn.disabled = loading;
  btn.textContent = loading ? 'Signing in…' : 'Login to Mero Planner';
}

async function handleLogin() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email)                      { showAlert('Please enter your email.', 'error'); return; }
  if (!/\S+@\S+\.\S+/.test(email)) { showAlert('Please enter a valid email.', 'error'); return; }
  if (!password)                   { showAlert('Please enter your password.', 'error'); return; }

  setLoading(true);

  try {
    const res = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, role: activeRole }),
    });
    const data = await res.json();

    if (res.ok) {
      showAlert('Login successful! Redirecting…', 'success');
      setTimeout(() => window.location.href = '/dashboard', 800);
    } else {
      showAlert(data.message || 'Login failed.', 'error');
      setLoading(false);
    }
  } catch (err) {
    showAlert('Server error. Please try again.', 'error');
    setLoading(false);
  }
}

function handleGoogle() {
  showAlert('Google login not yet configured.', 'error');
}

document.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
