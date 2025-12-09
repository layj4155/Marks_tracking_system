const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const Attendance = require('../models/Attendance');
const AcademicYear = require('../models/AcademicYear');
const AuditLog = require('../models/AuditLog');
const { auth, requireRole } = require('../middleware/auth');
const { logDataExport } = require('../services/auditLog');

const router = express.Router();

router.use(auth);
router.use(requireRole(['admin']));

// Export all data as JSON
router.get('/export/json', async (req, res) => {
  try {
    const [users, courses, assessments, attendance, academicYears] = await Promise.all([
      User.find().select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires').lean(),
      Course.find().lean(),
      Assessment.find().lean(),
      Attendance.find().lean(),
      AcademicYear.find().lean()
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        users,
        courses,
        assessments,
        attendance,
        academicYears
      },
      statistics: {
        totalUsers: users.length,
        totalCourses: courses.length,
        totalAssessments: assessments.length,
        totalAttendanceRecords: attendance.length
      }
    };

    logDataExport(req.user, 'full_json', req);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="marks_system_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('JSON export error:', error);
    res.status(500).json({ message: 'Error exporting data' });
  }
});

// Export users as CSV
router.get('/export/users/csv', async (req, res) => {
  try {
    const users = await User.find()
      .select('firstName lastName email role level isEmailVerified createdAt')
      .lean();

    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Level', 'Email Verified', 'Created At'];
    const rows = users.map(u => [
      u._id.toString(),
      u.firstName,
      u.lastName,
      u.email,
      u.role,
      u.level || '',
      u.isEmailVerified ? 'Yes' : 'No',
      new Date(u.createdAt).toISOString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    logDataExport(req.user, 'users_csv', req);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Users CSV export error:', error);
    res.status(500).json({ message: 'Error exporting users' });
  }
});

// Export marks as CSV
router.get('/export/marks/csv', async (req, res) => {
  try {
    const { academicYear, term } = req.query;

    const query = {};
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;

    const assessments = await Assessment.find(query)
      .populate('course', 'name level')
      .populate('marks.student', 'firstName lastName email')
      .lean();

    const headers = ['Course', 'Level', 'Assessment', 'Type', 'Max Marks', 'Academic Year', 'Term', 'Student Name', 'Student Email', 'Score', 'Percentage'];
    const rows = [];

    assessments.forEach(a => {
      a.marks.forEach(m => {
        const percentage = ((m.score / a.maxMarks) * 100).toFixed(2);
        rows.push([
          a.course.name,
          a.course.level,
          a.name,
          a.type,
          a.maxMarks,
          a.academicYear,
          a.term,
          `${m.student.firstName} ${m.student.lastName}`,
          m.student.email,
          m.score,
          percentage
        ]);
      });
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    logDataExport(req.user, 'marks_csv', req);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="marks_${academicYear || 'all'}_${term || 'all'}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Marks CSV export error:', error);
    res.status(500).json({ message: 'Error exporting marks' });
  }
});

// Export attendance as CSV
router.get('/export/attendance/csv', async (req, res) => {
  try {
    const { academicYear, term } = req.query;

    const query = {};
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;

    const attendanceRecords = await Attendance.find(query)
      .populate('course', 'name level')
      .populate('records.student', 'firstName lastName email')
      .lean();

    const headers = ['Course', 'Level', 'Date', 'Academic Year', 'Term', 'Student Name', 'Student Email', 'Status', 'Note'];
    const rows = [];

    attendanceRecords.forEach(a => {
      a.records.forEach(r => {
        rows.push([
          a.course.name,
          a.course.level,
          new Date(a.date).toISOString().split('T')[0],
          a.academicYear,
          a.term,
          `${r.student.firstName} ${r.student.lastName}`,
          r.student.email,
          r.status,
          r.note || ''
        ]);
      });
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    logDataExport(req.user, 'attendance_csv', req);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Attendance CSV export error:', error);
    res.status(500).json({ message: 'Error exporting attendance' });
  }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;

    const query = {};
    if (action) query.action = action;
    if (userId) query.user = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});

// Get audit log actions list
router.get('/audit-logs/actions', async (req, res) => {
  try {
    const actions = await AuditLog.distinct('action');
    res.json(actions);
  } catch (error) {
    console.error('Audit actions fetch error:', error);
    res.status(500).json({ message: 'Error fetching audit actions' });
  }
});

// Export audit logs as CSV
router.get('/audit-logs/export', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Target Type', 'Target ID', 'Details', 'IP Address'];
    const rows = logs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
      log.user?.email || '',
      log.action,
      log.targetType,
      log.targetId?.toString() || '',
      JSON.stringify(log.details || {}),
      log.ipAddress || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Audit logs export error:', error);
    res.status(500).json({ message: 'Error exporting audit logs' });
  }
});

module.exports = router;
