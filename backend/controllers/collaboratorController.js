const Event = require('../models/eventModel');
const Collaborator = require('../models/collaboratorModel');
const User = require('../models/userModel');
const { sendCollaborationInviteEmail } = require('../utils/mailer');


exports.getCollaborators = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { eventId } = req.params;

    const event = await Event.findByIdForMember(eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const collaborators = await Collaborator.findByEvent(eventId, userId);
    res.json({
      collaborators,
      event: { id: event.id, event_name: event.event_name, is_owner: !!event.is_owner, my_role: event.my_role },
    });
  } catch (err) {
    console.error('getCollaborators error:', err);
    res.status(500).json({ message: 'Server error while fetching collaborators.' });
  }
};

exports.inviteCollaborator = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { eventId } = req.params;
    const { email, role } = req.body;

    if (!email || !email.trim()) return res.status(400).json({ message: 'Email is required.' });
    if (!Collaborator.VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role must be editor or viewer.' });
    }

    const event = await Event.findByIdAndUser(eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const invitee = await User.findByEmail(email.trim().toLowerCase());
    if (!invitee) {
      return res.status(404).json({ message: 'No registered Mero Planner user found with that email.' });
    }
    if (invitee.id === userId) {
      return res.status(400).json({ message: "You can't invite yourself — you're already the owner." });
    }

    const existing = await Collaborator.findByEventAndUser(eventId, invitee.id);
    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({ message: 'This user already has a pending invitation for this event.' });
      }
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: 'This user is already a collaborator on this event.' });
      }
    }

    const insertId = await Collaborator.invite(eventId, invitee.id, userId, role);

   
    sendCollaborationInviteEmail(invitee.email, invitee.full_name, event.event_name, req.session.user.full_name)
      .catch((e) => console.error('sendCollaborationInviteEmail failed:', e.message));

    const collaborators = await Collaborator.findByEvent(eventId, userId);
    res.status(201).json({ message: `Invitation sent to ${invitee.full_name}.`, id: insertId, collaborators });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'This user already has an invitation for this event.' });
    }
    console.error('inviteCollaborator error:', err);
    res.status(500).json({ message: 'Server error while sending the invitation.' });
  }
};


exports.updateCollaboratorRole = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { eventId, collabId } = req.params;
    const { role } = req.body;

    if (!Collaborator.VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role must be editor or viewer.' });
    }

    const event = await Event.findByIdAndUser(eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const affected = await Collaborator.updateRole(collabId, eventId, role);
    if (!affected) return res.status(404).json({ message: 'Collaborator not found.' });

    const collaborators = await Collaborator.findByEvent(eventId, userId);
    res.json({ message: 'Role updated.', collaborators });
  } catch (err) {
    console.error('updateCollaboratorRole error:', err);
    res.status(500).json({ message: 'Server error while updating the role.' });
  }
};


exports.removeCollaborator = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { eventId, collabId } = req.params;

    const event = await Event.findByIdForMember(eventId, userId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const collab = await Collaborator.findById(collabId);
    if (!collab || String(collab.event_id) !== String(eventId)) {
      return res.status(404).json({ message: 'Collaborator not found.' });
    }

    const isOwner = !!event.is_owner;
    const isSelf = collab.user_id === userId;
    if (!isOwner && !isSelf) {
      return res.status(403).json({ message: 'Only the event owner can remove other collaborators.' });
    }

    await Collaborator.remove(collabId, eventId);
    res.json({ message: isSelf && !isOwner ? 'You have left the event.' : 'Collaborator removed.' });
  } catch (err) {
    console.error('removeCollaborator error:', err);
    res.status(500).json({ message: 'Server error while removing the collaborator.' });
  }
};


exports.getMyInvitations = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const invitations = await Collaborator.findPendingForUser(userId);
    res.json({ invitations });
  } catch (err) {
    console.error('getMyInvitations error:', err);
    res.status(500).json({ message: 'Server error while fetching invitations.' });
  }
};

exports.acceptInvitation = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const affected = await Collaborator.respond(req.params.id, userId, 'accepted');
    if (!affected) return res.status(404).json({ message: 'Invitation not found.' });
    res.json({ message: 'Invitation accepted.' });
  } catch (err) {
    console.error('acceptInvitation error:', err);
    res.status(500).json({ message: 'Server error while accepting the invitation.' });
  }
};


exports.declineInvitation = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const affected = await Collaborator.respond(req.params.id, userId, 'declined');
    if (!affected) return res.status(404).json({ message: 'Invitation not found.' });
    res.json({ message: 'Invitation declined.' });
  } catch (err) {
    console.error('declineInvitation error:', err);
    res.status(500).json({ message: 'Server error while declining the invitation.' });
  }
};
