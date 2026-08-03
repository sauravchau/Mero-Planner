const alertBox = document.getElementById('alert');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
}

async function handleForgotPassword() {
  const email = document.getElementById('email').value.trim();

  if (!email)                      { showAlert('Please enter your email.', 'error'); return; }
  if (!/\S+@\S+\.\S+/.test(email)) { showAlert('Please enter a valid email.', 'error'); return; }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();

    showAlert(data.message || 'If that email is registered, a reset link has been sent.', 'success');
  } catch (err) {
    showAlert('Server error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Reset Link';
  }
}

document.addEventListener('keydown', e => { if (e.key === 'Enter') handleForgotPassword(); });
