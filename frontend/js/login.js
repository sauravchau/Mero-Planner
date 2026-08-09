const alert = document.getElementById('alert');
function showAlert(message, type) {
  alert.textContent = message;
  alert.className = `alert ${type}`;
}

function setLoading(loading) {
  const btn = document.getElementById('loginBtn');
  btn.disabled = loading;
  btn.textContent = loading ? 'Signing in…' : (selectedRole === 'vendor' ? 'Login to Vendor Panel' : 'Login to Mero Planner');
}

const ROLE_REDIRECT = {
  admin: '/admin-dashboard',
  vendor: '/vendor-dashboard',
  user: '/dashboard',
};

let selectedRole = 'user';

function switchRole(role) {
  selectedRole = role;
  document.getElementById('tabUser').classList.toggle('active', role === 'user');
  document.getElementById('tabVendor').classList.toggle('active', role === 'vendor');

  document.getElementById('userFeatures').style.display   = role === 'user'   ? 'flex' : 'none';
  document.getElementById('vendorFeatures').style.display = role === 'vendor' ? 'flex' : 'none';

  const brandIcon    = document.getElementById('brandIcon');
  const brandTagline = document.getElementById('brandTagline');
  const formTitle    = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');
  const signupPrimary   = document.getElementById('signupPrimary');
  const signupSecondary = document.getElementById('signupSecondary');
  const loginBtn = document.getElementById('loginBtn');

  if (role === 'vendor') {
    brandIcon.textContent    = '🏪';
    brandTagline.innerHTML   = "List your business and get discovered by couples and families planning events across Nepal.";
    formTitle.textContent    = 'Vendor login';
    formSubtitle.textContent = 'Login to manage your listing and bookings';
    signupPrimary.innerHTML   = 'New business? <a href="/vendor-register">Register your business</a>';
    signupSecondary.innerHTML = 'Are you a customer? <a href="/register">Create one free</a>';
    loginBtn.textContent = 'Login to Vendor Panel';
  } else {
    brandIcon.textContent    = '🗓️';
    brandTagline.innerHTML   = "Nepal's smart event planning platform<br>for weddings, bartabanda, engagements and celebrations.";
    formTitle.textContent    = 'Welcome back';
    formSubtitle.textContent = 'Login to continue planning your event';
    signupPrimary.innerHTML   = "Don't have an account? <a href=\"/register\">Create one free</a>";
    signupSecondary.innerHTML = 'Are you a vendor? <a href="/vendor-register">Register your business</a>';
    loginBtn.textContent = 'Login to Mero Planner';
  }

  alert.className = 'alert';
  alert.textContent = '';
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
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (res.ok) {
      if (selectedRole === 'vendor' && data.role !== 'vendor') {
        showAlert("This account isn't registered as a vendor. Switch to the Customer tab, or register a business first.", 'error');
        setLoading(false);
        return;
      }
      if (selectedRole === 'user' && data.role === 'vendor') {
        showAlert('This is a vendor account — switching you to the Vendor tab and your vendor panel…', 'success');
        setTimeout(() => window.location.href = ROLE_REDIRECT.vendor, 1000);
        return;
      }

      showAlert('Login successful! Redirecting…', 'success');
      const destination = ROLE_REDIRECT[data.role] || '/dashboard';
      setTimeout(() => window.location.href = destination, 800);
    } else {
      showAlert(data.message || 'Login failed.', 'error');
      setLoading(false);
    }
  } catch (err) {
    showAlert('Server error. Please try again.', 'error');
    setLoading(false);
  }
}

async function initGoogleSignIn() {
  try {
    const res = await fetch('/api/auth/google-client-id');
    const data = await res.json();

    if (!data.clientId || typeof google === 'undefined') {
    
      document.getElementById('googleButtonContainer').style.display = 'none';
      return;
    }

    google.accounts.id.initialize({
      client_id: data.clientId,
      callback:  handleGoogleCredentialResponse,
    });

    google.accounts.id.renderButton(
      document.getElementById('googleButtonContainer'),
      { theme: 'outline', size: 'large', width: 300, text: 'continue_with' }
    );
  } catch (err) {
    console.error('Google Sign-In init failed:', err);
    document.getElementById('googleButtonContainer').style.display = 'none';
  }
}

async function handleGoogleCredentialResponse(response) {
  try {
    const res = await fetch('/api/auth/google', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ credential: response.credential }),
    });
    const data = await res.json();

    if (res.ok) {
      if (selectedRole === 'vendor' && data.role !== 'vendor') {
        showAlert("This Google account isn't registered as a vendor. Switch to the Customer tab, or register a business first.", 'error');
        return;
      }
      if (selectedRole === 'user' && data.role === 'vendor') {
        showAlert('This is a vendor account — switching you to the Vendor tab and your vendor panel…', 'success');
        setTimeout(() => window.location.href = ROLE_REDIRECT.vendor, 1000);
        return;
      }

      showAlert('Signed in with Google! Redirecting…', 'success');
      const destination = ROLE_REDIRECT[data.role] || '/dashboard';
      setTimeout(() => window.location.href = destination, 800);
    } else {
      showAlert(data.message || 'Google sign-in failed.', 'error');
    }
  } catch (err) {
    showAlert('Server error during Google sign-in.', 'error');
  }
}

window.addEventListener('load', initGoogleSignIn);

document.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });