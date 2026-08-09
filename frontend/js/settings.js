const alertBox = document.getElementById('alertBox');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert-msg show ${type}`;
}

function toggleDeletePasswordVisibility() {
  const input = document.getElementById('deletePassword');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function resetDeleteForm() {
  document.getElementById('deleteStep1').style.display = 'block';
  document.getElementById('deleteStep2').style.display = 'none';
  document.getElementById('deletePassword').value = '';
  alertBox.className = 'alert-msg';
}

async function handleRequestDeletion() {
  const password = document.getElementById('deletePassword').value;

  if (!password) {
    showAlert('Please enter your password to continue.', 'error');
    return;
  }

  const btn = document.getElementById('requestDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/auth/request-account-deletion', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    });
    const data = await res.json();

    if (res.ok) {
      showAlert(data.message || 'Confirmation email sent.', 'success');
      document.getElementById('deleteStep1').style.display = 'none';
      document.getElementById('deleteStep2').style.display = 'block';
    } else {
      showAlert(data.message || 'Something went wrong.', 'error');
    }
  } catch (err) {
    console.error('handleRequestDeletion error:', err);
    showAlert('Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Deletion Confirmation Email';
  }
}

document.getElementById('deletePassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleRequestDeletion();
});
