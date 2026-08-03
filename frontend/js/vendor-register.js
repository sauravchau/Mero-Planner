function showAlert(message, type) {
  const alert = document.getElementById('alert');
  alert.textContent = message;
  alert.className = `alert ${type}`;
}

function setLoading(loading) {
  const btn = document.getElementById('registerBtn');
  btn.disabled = loading;
  btn.textContent = loading ? 'Submitting…' : 'Submit for Approval';
}

async function handleVendorRegister() {
  const full_name        = document.getElementById('full_name').value.trim();
  const email             = document.getElementById('email').value.trim();
  const password          = document.getElementById('password').value;
  const confirm_password  = document.getElementById('confirm_password').value;
  const vendor_name       = document.getElementById('vendor_name').value.trim();
  const category          = document.getElementById('category').value;
  const location           = document.getElementById('location').value.trim();
  const price_npr         = document.getElementById('price_npr').value;
  const contact_phone     = document.getElementById('contact_phone').value.trim();
  const description       = document.getElementById('description').value.trim();

  if (!full_name)                            { showAlert('Your name is required.', 'error'); return; }
  if (!email || !/\S+@\S+\.\S+/.test(email)) { showAlert('Enter a valid email.', 'error'); return; }
  if (password.length < 6)                   { showAlert('Password must be at least 6 characters.', 'error'); return; }
  if (password !== confirm_password)         { showAlert('Passwords do not match.', 'error'); return; }
  if (!vendor_name)                          { showAlert('Business name is required.', 'error'); return; }
  if (!location)                              { showAlert('Location is required.', 'error'); return; }
  if (!price_npr || Number(price_npr) <= 0)  { showAlert('Enter a valid starting price.', 'error'); return; }

  setLoading(true);

  try {
    const res = await fetch('/api/vendor/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name, email, password, confirm_password,
        vendor_name, category, location, price_npr,
        contact_phone, description,
      }),
    });
    const data = await res.json();

    if (res.ok) {
      showAlert(data.message || 'Registration submitted!', 'success');
      setTimeout(() => window.location.href = '/login', 1800);
    } else {
      showAlert(data.message || 'Registration failed.', 'error');
      setLoading(false);
    }
  } catch (err) {
    showAlert('Server error. Please try again.', 'error');
    setLoading(false);
  }
}
