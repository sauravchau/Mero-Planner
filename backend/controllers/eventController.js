const path = require('path');
const Event = require('../models/eventModel');
const Guest = require('../models/guestModel');
const ChecklistItem = require('../models/checklistItemModel');
const { isNotPastDate, isPositiveNumber, isNonNegativeNumber } = require('../utils/validators');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');

const VALID_CATEGORIES = [
  'Wedding', 'Engagement', 'Mehendi', 'Sangeet', 'Reception', 'Anniversary',
  'Birthday', 'Baby Shower', 'Corporate Event', 'Post-Wedding Party', 'Other',
];
const VALID_STATUSES = ['Upcoming', 'In Progress', 'Completed', 'Cancelled'];

exports.showCreateEventPage = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'create-event.html'));
};

exports.showMyEventsPage = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'my-events.html'));
};

function validateEventPayload(body, { partial = false } = {}) {
  const errors = [];
  const {
    event_name, category, event_date, event_time,
    location, estimated_budget, expected_guests,
  } = body;

  if (!partial || event_name !== undefined) {
    if (!event_name || !event_name.trim()) errors.push('Event Name is required.');
  }
  if (!partial || category !== undefined) {
    if (!category || !VALID_CATEGORIES.includes(category)) errors.push('A valid Event Category is required.');
  }
  if (!partial || event_date !== undefined) {
    if (!event_date) errors.push('Event Date is required.');
    else if (!isNotPastDate(event_date)) errors.push('Event Date cannot be in the past.');
  }
  if (!partial || event_time !== undefined) {
    if (!event_time) errors.push('Event Time is required.');
  }
  if (!partial || location !== undefined) {
    if (!location || !location.trim()) errors.push('Event Location is required.');
  }
  if (!partial || estimated_budget !== undefined) {
    if (estimated_budget === undefined || estimated_budget === '' || !isNonNegativeNumber(estimated_budget)) {
      errors.push('Estimated Budget cannot be negative.');
    }
  }
  if (!partial || expected_guests !== undefined) {
    if (expected_guests === undefined || expected_guests === '' || !isPositiveNumber(expected_guests)) {
      errors.push('Expected Guests must be greater than zero.');
    }
  }

  return errors;
}

exports.createEvent = async (req, res) => {
  try {
    const errors = validateEventPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const userId = req.session.user.id;
    const insertId = await Event.create(userId, req.body);
    const event = await Event.findByIdAndUser(insertId, userId);
    try {
     
      await ChecklistItem.generateForEvent(insertId, event.event_date);
    } catch (checklistErr) {
      console.error('Checklist seeding failed for event', insertId, checklistErr);
    }
    res.status(201).json({ message: 'Event created successfully.', event });
  } catch (err) {
    console.error('createEvent error:', err);
    res.status(500).json({ message: 'Server error while creating the event.' });
  }
};


exports.getEvents = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { search } = req.query;
    const events = search && search.trim()
      ? await Event.search(userId, search.trim())
      : await Event.findAllByUser(userId);

    const withGuestCounts = await Promise.all(events.map(async (ev) => {
      const guest_count = await Guest.countByEvent(ev.id);
      return { ...ev, guest_count };
    }));

    res.json({ events: withGuestCounts });
  } catch (err) {
    console.error('getEvents error:', err);
    res.status(500).json({ message: 'Server error while fetching events.' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const event = await Event.findByIdAndUser(req.params.id, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    const guest_count = await Guest.countByEvent(event.id);
    res.json({ event: { ...event, guest_count } });
  } catch (err) {
    console.error('getEventById error:', err);
    res.status(500).json({ message: 'Server error while fetching the event.' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const existing = await Event.findByIdAndUser(req.params.id, userId);
    if (!existing) return res.status(404).json({ message: 'Event not found.' });

    if (req.body.status && !VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const errors = validateEventPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    await Event.update(req.params.id, userId, req.body);
    const updated = await Event.findByIdAndUser(req.params.id, userId);
    try {
      const oldDate = existing.event_date instanceof Date
        ? existing.event_date.toISOString().slice(0, 10)
        : String(existing.event_date).slice(0, 10);
      const newDate = updated.event_date instanceof Date
        ? updated.event_date.toISOString().slice(0, 10)
        : String(updated.event_date).slice(0, 10);

      if (oldDate !== newDate) {
        await ChecklistItem.recalculateDueDates(req.params.id, updated.event_date);
      }
    } catch (recalcErr) {
      console.error('Checklist due-date recalculation failed for event', req.params.id, recalcErr);
    }

    res.json({ message: 'Event updated successfully.', event: updated });
  } catch (err) {
    console.error('updateEvent error:', err);
    res.status(500).json({ message: 'Server error while updating the event.' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const affected = await Event.remove(req.params.id, userId);
    if (!affected) return res.status(404).json({ message: 'Event not found.' });
    res.json({ message: 'Event deleted successfully.' });
  } catch (err) {
    console.error('deleteEvent error:', err);
    res.status(500).json({ message: 'Server error while deleting the event.' });
  }
};

exports.getEventStats = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const stats = await Event.getStats(userId);
    res.json({ stats });
  } catch (err) {
    console.error('getEventStats error:', err);
    res.status(500).json({ message: 'Server error while fetching event stats.' });
  }
};
