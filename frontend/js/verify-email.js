const alertBox  = document.getElementById('alert');
const heading   = document.getElementById('heading');
const subtitle  = document.getElementById('subtitle');
const resendBox = document.getElementById('resendBox');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
}

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

async function verify() {
  if (!token) {
    heading.textContent  = 'Verify your email';
    subtitle.textContent = "Didn't get the link, or did it expire? Request a new one below.";
    resendBox.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/auth/verify-email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    });
    const data = await res.json();

    if (res.ok) {
      heading.textContent  = 'Email verified!';
      subtitle.textContent = 'Redirecting you to login…';
      showAlert(data.message || 'Email verified.', 'success');
      setTimeout(() => window.location.href = '/login', 1500);
    } else {
      heading.textContent  = 'Verification failed';
      subtitle.textContent = 'This link may have expired. Request a new one below.';
      showAlert(data.message || 'Verification failed.', 'error');
      resendBox.style.display = 'block';
    }
  } catch (err) {
    heading.textContent  = 'Something went wrong';
    subtitle.textContent = 'Please try again, or request a new link below.';
    showAlert('Server error. Please try again.', 'error');
    resendBox.style.display = 'block';
  }
}

async function handleResend() {
  const email = document.getElementById('resendEmail').value.trim();
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    showAlert('Please enter a valid email.', 'error');
    return;
  }

  const btn = document.getElementById('resendBtn');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/auth/resend-verification', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();
    showAlert(data.message || 'If that email is registered and unverified, a new link has been sent.', 'success');
  } catch (err) {
    showAlert('Server error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Resend Verification Link';
  }
}

verify();
