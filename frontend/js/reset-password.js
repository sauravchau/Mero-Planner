const alertBox = document.getElementById('alert');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
}

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (!token) {
  showAlert('This link is missing a token. Please request a new one from the Forgot Password page.', 'error');
  document.getElementById('formBody').style.display = 'none';
}

async function handleResetPassword() {
  const password        = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!password || password.length < 6) { showAlert('Password must be at least 6 characters.', 'error'); return; }
  if (password !== confirmPassword)      { showAlert('Passwords do not match.', 'error'); return; }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Updating…';

  try {
    const res = await fetch('/api/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, password, confirm_password: confirmPassword }),
    });
    const data = await res.json();

    if (res.ok) {
      showAlert(data.message || 'Password updated. Redirecting to login…', 'success');
      document.getElementById('formBody').style.display = 'none';
      setTimeout(() => window.location.href = '/login', 1500);
    } else {
      showAlert(data.message || 'Reset failed.', 'error');
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  } catch (err) {
    showAlert('Server error. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Update Password';
  }
}

document.addEventListener('keydown', e => { if (e.key === 'Enter') handleResetPassword(); });
