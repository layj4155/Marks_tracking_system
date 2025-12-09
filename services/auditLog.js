const AuditLog = require('../models/AuditLog');

const log = async ({ user, action, targetType, targetId, details, req }) => {
  try {
    const logEntry = new AuditLog({
      user: user._id || user,
      action,
      targetType,
      targetId,
      details,
      ipAddress: req ? (req.ip || req.connection?.remoteAddress) : null,
      userAgent: req ? req.get('User-Agent') : null
    });
    
    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Audit log error:', error);
    return null;
  }
};

const logUserCreated = (adminUser, newUser, req) => {
  return log({
    user: adminUser,
    action: 'user_created',
    targetType: 'user',
    targetId: newUser._id,
    details: {
      email: newUser.email,
      role: newUser.role,
      level: newUser.level
    },
    req
  });
};

const logUserDeleted = (adminUser, deletedUser, req) => {
  return log({
    user: adminUser,
    action: 'user_deleted',
    targetType: 'user',
    targetId: deletedUser._id,
    details: {
      email: deletedUser.email,
      role: deletedUser.role
    },
    req
  });
};

const logPasswordChanged = (user, req) => {
  return log({
    user: user,
    action: 'password_changed',
    targetType: 'user',
    targetId: user._id,
    details: {},
    req
  });
};

const logPasswordReset = (adminUser, targetUser, req) => {
  return log({
    user: adminUser,
    action: 'password_reset',
    targetType: 'user',
    targetId: targetUser._id,
    details: { email: targetUser.email },
    req
  });
};

const logRoleChanged = (adminUser, targetUser, oldRole, newRole, req) => {
  return log({
    user: adminUser,
    action: 'role_changed',
    targetType: 'user',
    targetId: targetUser._id,
    details: { oldRole, newRole, email: targetUser.email },
    req
  });
};

const logLogin = (user, success, req, reason = null) => {
  return log({
    user: user,
    action: success ? 'login_success' : 'login_failed',
    targetType: 'user',
    targetId: user._id,
    details: { reason },
    req
  });
};

const logCourseCreated = (teacher, course, req) => {
  return log({
    user: teacher,
    action: 'course_created',
    targetType: 'course',
    targetId: course._id,
    details: { name: course.name, level: course.level },
    req
  });
};

const logCourseDeleted = (user, course, req) => {
  return log({
    user: user,
    action: 'course_deleted',
    targetType: 'course',
    targetId: course._id,
    details: { name: course.name, level: course.level },
    req
  });
};

const logAssessmentCreated = (teacher, assessment, course, req) => {
  return log({
    user: teacher,
    action: 'assessment_created',
    targetType: 'assessment',
    targetId: assessment._id,
    details: { 
      name: assessment.name, 
      type: assessment.type,
      courseName: course.name,
      maxMarks: assessment.maxMarks 
    },
    req
  });
};

const logMarksUpdated = (teacher, assessment, studentCount, req) => {
  return log({
    user: teacher,
    action: 'marks_updated',
    targetType: 'assessment',
    targetId: assessment._id,
    details: { 
      assessmentName: assessment.name,
      studentCount 
    },
    req
  });
};

const logBulkImport = (adminUser, type, successCount, errorCount, req) => {
  return log({
    user: adminUser,
    action: 'bulk_import',
    targetType: 'system',
    details: { type, successCount, errorCount },
    req
  });
};

const logDataExport = (adminUser, exportType, req) => {
  return log({
    user: adminUser,
    action: 'data_export',
    targetType: 'system',
    details: { exportType },
    req
  });
};

const logInvitationSent = (adminUser, email, role, req) => {
  return log({
    user: adminUser,
    action: 'invitation_sent',
    targetType: 'invitation',
    details: { email, role },
    req
  });
};

module.exports = {
  log,
  logUserCreated,
  logUserDeleted,
  logPasswordChanged,
  logPasswordReset,
  logRoleChanged,
  logLogin,
  logCourseCreated,
  logCourseDeleted,
  logAssessmentCreated,
  logMarksUpdated,
  logBulkImport,
  logDataExport,
  logInvitationSent
};
