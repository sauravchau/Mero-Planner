const path = require('path');
const Guest = require('../models/guestModel');
const { isValidPhone } = require('../utils/validators');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'frontend', 'views');

const VALID_CATEGORIES = [
  'Family', 'Friends', 'Colleagues', 'Neighbors', 'VIP Guests',
  'Relatives', 'Bride Side', 'Groom Side', 'Other',
];
const VALID_RSVP = ['Pending', 'Confirmed', 'Declined'];

exports.showGuestListPage = (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'guest-list.html'));
};

function validateGuestPayload(body) {
  const errors = [];
  const { guest_name, phone, event_id, category } = body;

  if (!guest_name || !guest_name.trim()) errors.push('Guest Name is required.');
  if (!phone || !phone.trim()) errors.push('Phone Number is required.');
  else if (!isValidPhone(phone)) errors.push('Please enter a valid phone number.');
  if (!event_id) errors.push('Event is required.');
  if (!category || !VALID_CATEGORIES.includes(category)) errors.push('A valid Category is required.');

  return errors;
}

//Create
exports.createGuest = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const errors = validateGuestPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const ownsEvent = await Guest.eventBelongsToUser(req.body.event_id, userId);
    if (!ownsEvent) return res.status(400).json({ message: 'Invalid Event selected.' });

    const insertId = await Guest.create(req.body);
    const guest = await Guest.findByIdAndUser(insertId, userId);
    res.status(201).json({ message: 'Guest added successfully.', guest });
  } catch (err) {
    console.error('createGuest error:', err);
    res.status(500).json({ message: 'Server error while adding the guest.' });
  }
};

exports.getGuests = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { event_id, category, search, sortBy, sortDir } = req.query;
    const guests = await Guest.findAllByUser(userId, { event_id, category, search, sortBy, sortDir });
    res.json({ guests });
  } catch (err) {
    console.error('getGuests error:', err);
    res.status(500).json({ message: 'Server error while fetching guests.' });
  }
};

exports.getGuestById = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const guest = await Guest.findByIdAndUser(req.params.id, userId);
    if (!guest) return res.status(404).json({ message: 'Guest not found.' });
    res.json({ guest });
  } catch (err) {
    console.error('getGuestById error:', err);
    res.status(500).json({ message: 'Server error while fetching the guest.' });
  }
};

//  Update
exports.updateGuest = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const existing = await Guest.findByIdAndUser(req.params.id, userId);
    if (!existing) return res.status(404).json({ message: 'Guest not found.' });

    const errors = validateGuestPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const ownsEvent = await Guest.eventBelongsToUser(req.body.event_id, userId);
    if (!ownsEvent) return res.status(400).json({ message: 'Invalid Event selected.' });

    await Guest.update(req.params.id, userId, req.body);
    const updated = await Guest.findByIdAndUser(req.params.id, userId);
    res.json({ message: 'Guest updated successfully.', guest: updated });
  } catch (err) {
    console.error('updateGuest error:', err);
    res.status(500).json({ message: 'Server error while updating the guest.' });
  }
};

//Delete
exports.deleteGuest = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const affected = await Guest.remove(req.params.id, userId);
    if (!affected) return res.status(404).json({ message: 'Guest not found.' });
    res.json({ message: 'Guest deleted successfully.' });
  } catch (err) {
    console.error('deleteGuest error:', err);
    res.status(500).json({ message: 'Server error while deleting the guest.' });
  }
};

//PATCH invitation sent
exports.setInvitation = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { sent } = req.body;
    const affected = await Guest.setInvitation(req.params.id, userId, !!sent);
    if (!affected) return res.status(404).json({ message: 'Guest not found.' });
    const guest = await Guest.findByIdAndUser(req.params.id, userId);
    res.json({ message: 'Invitation status updated.', guest });
  } catch (err) {
    console.error('setInvitation error:', err);
    res.status(500).json({ message: 'Server error while updating invitation status.' });
  }
};

//PATCH RSVP status
exports.setRsvp = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { status } = req.body;
    if (!VALID_RSVP.includes(status)) return res.status(400).json({ message: 'Invalid RSVP status.' });

    const affected = await Guest.setRsvp(req.params.id, userId, status);
    if (!affected) return res.status(404).json({ message: 'Guest not found.' });
    const guest = await Guest.findByIdAndUser(req.params.id, userId);
    res.json({ message: 'RSVP status updated.', guest });
  } catch (err) {
    console.error('setRsvp error:', err);
    res.status(500).json({ message: 'Server error while updating RSVP status.' });
  }
};

//Dashboard guest summary stats
exports.getGuestStats = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const stats = await Guest.getStats(userId);
    res.json({ stats });
  } catch (err) {
    console.error('getGuestStats error:', err);
    res.status(500).json({ message: 'Server error while fetching guest stats.' });
  }
};
