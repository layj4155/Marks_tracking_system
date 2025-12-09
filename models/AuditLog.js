const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: [
      'user_created',
      'user_updated',
      'user_deleted',
      'password_changed',
      'password_reset',
      'role_changed',
      'login_success',
      'login_failed',
      'course_created',
      'course_updated',
      'course_deleted',
      'assessment_created',
      'assessment_deleted',
      'marks_updated',
      'student_enrolled',
      'student_removed',
      'bulk_import',
      'data_export',
      'settings_changed',
      'invitation_sent'
    ],
    required: true
  },
  targetType: {
    type: String,
    enum: ['user', 'course', 'assessment', 'system', 'invitation'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

// Auto-delete logs older than 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
