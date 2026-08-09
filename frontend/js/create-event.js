const form = document.getElementById('createEventForm');
const alertBox = document.getElementById('alertBox');
const submitBtn = document.getElementById('submitBtn');


const dateInput = document.getElementById('event_date');
const today = new Date().toISOString().split('T')[0];
dateInput.setAttribute('min', today);

function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.className = `alert-msg show ${type}`;
}

function clearFieldErrors() {
  document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
}

function setFieldError(field, message) {
  const el = document.querySelector(`[data-error-for="${field}"]`);
  if (el) el.textContent = message;
}

function validateClientSide(data) {
  const errors = {};
  if (!data.event_name.trim()) errors.event_name = 'Event Name is required.';
  if (!data.category) errors.category = 'Please select a category.';
  if (!data.location.trim()) errors.location = 'Event Location is required.';
  if (!data.event_date) errors.event_date = 'Event Date is required.';
  else if (data.event_date < today) errors.event_date = 'Event Date cannot be in the past.';
  if (!data.event_time) errors.event_time = 'Event Time is required.';
  if (data.estimated_budget === '' || Number(data.estimated_budget) < 0) errors.estimated_budget = 'Budget cannot be negative.';
  if (data.expected_guests === '' || Number(data.expected_guests) <= 0) errors.expected_guests = 'Expected guests must be greater than zero.';
  return errors;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors();
  alertBox.classList.remove('show');

  const data = {
    event_name: form.event_name.value,
    category: form.category.value,
    location: form.location.value,
    event_date: form.event_date.value,
    event_time: form.event_time.value,
    estimated_budget: form.estimated_budget.value,
    expected_guests: form.expected_guests.value,
    description: form.description.value,
  };

  const errors = validateClientSide(data);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([field, msg]) => setFieldError(field, msg));
    showAlert('Please fix the highlighted fields.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating…';

  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();

    if (!res.ok) {
      showAlert(result.message || 'Failed to create event.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Event';
      return;
    }

    
    sessionStorage.setItem('eventCreated', '1');
    window.location.href = '/my-events.html';
  } catch (err) {
    console.error('Create event error:', err);
    showAlert('Network error. Please check your connection and try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Event';
  }
});
