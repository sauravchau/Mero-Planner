function showAlert(message, type) {
  const alert = document.getElementById('alert');
  alert.textContent = message;
  alert.className = `alert ${type}`;
}

function setLoading(loading) {
  const btn = document.getElementById('registerBtn');
  btn.disabled = loading;
  btn.textContent = loading ? 'Creating account…' : 'Create Account';
}

async function handleRegister() {
  const full_name        = document.getElementById('full_name').value.trim();
  const email            = document.getElementById('email').value.trim();
  const password         = document.getElementById('password').value;
  const confirm_password = document.getElementById('confirm_password').value;

  if (!full_name)                            { showAlert('Full name is required.', 'error'); return; }
  if (!email || !/\S+@\S+\.\S+/.test(email)) { showAlert('Enter a valid email.', 'error'); return; }
  if (password.length < 6)                   { showAlert('Password must be at least 6 characters.', 'error'); return; }
  if (password !== confirm_password)         { showAlert('Passwords do not match.', 'error'); return; }

  setLoading(true);

  try {
    const res = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ full_name, email, password, confirm_password }),
    });
    const data = await res.json();

    if (res.ok) {
      showAlert('Account created! Redirecting to login…', 'success');
      setTimeout(() => window.location.href = '/login', 1200);
    } else {
      showAlert(data.message || 'Registration failed.', 'error');
      setLoading(false);
    }
  } catch (err) {
    showAlert('Server error. Please try again.', 'error');
    setLoading(false);
  }
}

document.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });
