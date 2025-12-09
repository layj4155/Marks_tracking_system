const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { sendInvitationEmail } = require('../services/email');
const { logInvitationSent } = require('../services/auditLog');
const config = require('../config');

const router = express.Router();

// Send invitation (admin only)
router.post('/', auth, requireRole(['admin']), [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').isIn(['teacher', 'admin', 'parent']).withMessage('Role must be teacher, admin, or parent')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check for pending invitation
    const pendingInvite = await Invitation.findOne({ 
      email, 
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });
    if (pendingInvite) {
      return res.status(400).json({ message: 'A pending invitation already exists for this email' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    const invitation = new Invitation({
      email,
      role,
      invitedBy: req.user._id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await invitation.save();

    // Send email
    const inviterName = `${req.user.firstName} ${req.user.lastName}`;
    const emailResult = await sendInvitationEmail(email, token, role, inviterName);

    if (!emailResult.success && config.nodeEnv === 'development') {
      console.log(`[DEV] Invitation token for ${email}: ${token}`);
    }

    // Audit log
    logInvitationSent(req.user, email, role, req);

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({ message: 'Error sending invitation' });
  }
});

// Get all invitations (admin only)
router.get('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }

    const invitations = await Invitation.find(query)
      .populate('invitedBy', 'firstName lastName')
      .populate('acceptedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    res.json(invitations);
  } catch (error) {
    console.error('Fetch invitations error:', error);
    res.status(500).json({ message: 'Error fetching invitations' });
  }
});

// Verify invitation token (public)
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({ token }).lean();

    if (!invitation) {
      return res.status(404).json({ message: 'Invalid invitation' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `Invitation has been ${invitation.status}` });
    }

    if (new Date() > invitation.expiresAt) {
      await Invitation.findByIdAndUpdate(invitation._id, { status: 'expired' });
      return res.status(400).json({ message: 'Invitation has expired' });
    }

    res.json({
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt
    });
  } catch (error) {
    console.error('Verify invitation error:', error);
    res.status(500).json({ message: 'Error verifying invitation' });
  }
});

// Accept invitation and create account (public)
router.post('/accept', [
  body('token').notEmpty().withMessage('Token is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, firstName, lastName, password } = req.body;

    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({ message: 'Invalid invitation' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `Invitation has been ${invitation.status}` });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(400).json({ message: 'Invitation has expired' });
    }

    // Check if user was created in the meantime
    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      invitation.status = 'accepted';
      invitation.acceptedBy = existingUser._id;
      invitation.acceptedAt = new Date();
      await invitation.save();
      return res.status(400).json({ message: 'Account already exists for this email' });
    }

    // Create user
    const user = new User({
      firstName,
      lastName,
      email: invitation.email,
      password,
      role: invitation.role,
      isEmailVerified: true // Already verified via invitation
    });

    await user.save();

    // Update invitation
    invitation.status = 'accepted';
    invitation.acceptedBy = user._id;
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Generate JWT
    const jwt = require('jsonwebtoken');
    const jwtToken = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token: jwtToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ message: 'Error accepting invitation' });
  }
});

// Cancel invitation (admin only)
router.delete('/:invitationId', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { invitationId } = req.params;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Can only cancel pending invitations' });
    }

    invitation.status = 'cancelled';
    await invitation.save();

    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ message: 'Error cancelling invitation' });
  }
});

// Resend invitation (admin only)
router.post('/:invitationId/resend', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { invitationId } = req.params;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Can only resend pending invitations' });
    }

    // Generate new token and extend expiry
    invitation.token = crypto.randomBytes(32).toString('hex');
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invitation.save();

    // Send email
    const inviterName = `${req.user.firstName} ${req.user.lastName}`;
    await sendInvitationEmail(invitation.email, invitation.token, invitation.role, inviterName);

    res.json({ message: 'Invitation resent successfully' });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({ message: 'Error resending invitation' });
  }
});

module.exports = router;
