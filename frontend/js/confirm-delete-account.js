const alertBox = document.getElementById('alert');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
}

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (!token) {
  showAlert('This link is missing a token. Please request account deletion again from Account Settings.', 'error');
  document.getElementById('formBody').style.display = 'none';
}

async function handleConfirmDeletion() {
  const btn = document.getElementById('confirmBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting…';

  try {
    const res = await fetch('/api/auth/confirm-account-deletion', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    });
    const data = await res.json();

    if (res.ok) {
      showAlert(data.message || 'Your account has been deleted.', 'success');
      document.getElementById('formBody').style.display = 'none';
      setTimeout(() => window.location.href = '/login', 2000);
    } else {
      showAlert(data.message || 'This link is invalid or has expired.', 'error');
      btn.disabled = false;
      btn.textContent = 'Yes, permanently delete my account';
    }
  } catch (err) {
    console.error('handleConfirmDeletion error:', err);
    showAlert('Network error. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Yes, permanently delete my account';
  }
}
