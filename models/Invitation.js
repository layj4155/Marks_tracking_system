const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['teacher', 'admin', 'parent'],
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending'
  },
  acceptedAt: {
    type: Date
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ token: 1 });
invitationSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
