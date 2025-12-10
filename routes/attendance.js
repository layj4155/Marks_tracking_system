const express = require('express');
const { body, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Load students for attendance by level
router.get('/students', requireRole(['teacher']), async (req, res) => {
  try {
    const { level, date } = req.query;

    if (!level) {
      return res.status(400).json({ message: 'Level is required' });
    }

    const User = require('../models/User');
    const students = await User.find({ 
      role: 'student', 
      level 
    }).select('_id firstName lastName').lean();

    res.json(students);
  } catch (error) {
    console.error('Error loading students:', error);
    res.status(500).json({ message: 'Error loading students' });
  }
});

// Record attendance (simple format)
router.post('/', requireRole(['teacher']), async (req, res) => {
  try {
    const { level, date, presentStudents, academicYear, term } = req.body;

    if (!level || !date || !academicYear || !term) {
      return res.status(400).json({ message: 'Level, date, academic year, and term are required' });
    }

    const User = require('../models/User');
    const allStudents = await User.find({ 
      role: 'student', 
      level 
    }).select('_id').lean();

    const attendanceRecords = allStudents.map(student => ({
      student: student._id,
      status: presentStudents.includes(student._id.toString()) ? 'present' : 'absent',
      note: ''
    }));

    // Create attendance record for all levels (without specific course)
    const attendance = new Attendance({
      date: new Date(date),
      academicYear,
      term,
      recordedBy: req.user._id,
      records: attendanceRecords,
      levelAttendance: level
    });

    await attendance.save();

    res.json({
      message: 'Attendance recorded successfully',
      attendance
    });
  } catch (error) {
    console.error('Attendance recording error:', error);
    res.status(500).json({ message: 'Error recording attendance' });
  }
});

// Record attendance for a course (teacher only)
router.post('/course/:courseId', requireRole(['teacher']), [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('academicYear').notEmpty().withMessage('Academic year is required'),
  body('term').isIn(['1st Term', '2nd Term', '3rd Term']).withMessage('Valid term is required'),
  body('records').isArray().withMessage('Records must be an array'),
  body('records.*.studentId').isMongoId().withMessage('Valid student ID required'),
  body('records.*.status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId } = req.params;
    const { date, academicYear, term, records } = req.body;

    // Verify course ownership
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this course' });
    }

    // Check for existing attendance record
    let attendance = await Attendance.findOne({ course: courseId, date: new Date(date) });

    if (attendance) {
      // Update existing
      attendance.records = records.map(r => ({
        student: r.studentId,
        status: r.status,
        note: r.note || ''
      }));
      attendance.recordedBy = req.user._id;
      await attendance.save();
    } else {
      // Create new
      attendance = new Attendance({
        course: courseId,
        date: new Date(date),
        academicYear,
        term,
        recordedBy: req.user._id,
        records: records.map(r => ({
          student: r.studentId,
          status: r.status,
          note: r.note || ''
        }))
      });
      await attendance.save();
    }

    res.json({
      message: 'Attendance recorded successfully',
      attendance
    });
  } catch (error) {
    console.error('Attendance recording error:', error);
    res.status(500).json({ message: 'Error recording attendance' });
  }
});

// Get attendance for a course on a specific date
router.get('/course/:courseId/date/:date', requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { courseId, date } = req.params;

    const course = await Course.findById(courseId)
      .populate('students', 'firstName lastName')
      .lean();

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (req.user.role === 'teacher' && course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this course' });
    }

    const attendance = await Attendance.findOne({ 
      course: courseId, 
      date: new Date(date) 
    }).populate('records.student', 'firstName lastName').lean();

    res.json({
      course: { id: course._id, name: course.name },
      date,
      students: course.students,
      attendance: attendance ? attendance.records : []
    });
  } catch (error) {
    console.error('Fetch attendance error:', error);
    res.status(500).json({ message: 'Error fetching attendance' });
  }
});

// Get attendance summary for a course
router.get('/course/:courseId/summary', requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const course = await Course.findById(courseId)
      .populate('students', 'firstName lastName')
      .lean();

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (req.user.role === 'teacher' && course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this course' });
    }

    const attendanceRecords = await Attendance.find({
      course: courseId,
      academicYear,
      term
    }).lean();

    // Calculate summary per student
    const studentSummary = course.students.map(student => {
      let present = 0, absent = 0, late = 0, excused = 0;

      attendanceRecords.forEach(record => {
        const studentRecord = record.records.find(r => 
          r.student.toString() === student._id.toString()
        );
        if (studentRecord) {
          switch (studentRecord.status) {
            case 'present': present++; break;
            case 'absent': absent++; break;
            case 'late': late++; break;
            case 'excused': excused++; break;
          }
        }
      });

      const total = present + absent + late + excused;
      const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;

      return {
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`
        },
        present,
        absent,
        late,
        excused,
        total,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      };
    });

    // Overall stats
    const totalClasses = attendanceRecords.length;
    const avgAttendance = studentSummary.length > 0
      ? studentSummary.reduce((sum, s) => sum + s.attendanceRate, 0) / studentSummary.length
      : 0;

    res.json({
      course: { id: course._id, name: course.name, level: course.level },
      academicYear,
      term,
      summary: {
        totalClasses,
        totalStudents: course.students.length,
        averageAttendanceRate: Math.round(avgAttendance * 100) / 100
      },
      studentSummary: studentSummary.sort((a, b) => b.attendanceRate - a.attendanceRate)
    });
  } catch (error) {
    console.error('Attendance summary error:', error);
    res.status(500).json({ message: 'Error fetching attendance summary' });
  }
});

// Get student's own attendance
router.get('/student/me', requireRole(['student']), async (req, res) => {
  try {
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const courses = await Course.find({ students: req.user._id }).lean();

    const attendanceData = await Promise.all(courses.map(async (course) => {
      const records = await Attendance.find({
        course: course._id,
        academicYear,
        term
      }).lean();

      let present = 0, absent = 0, late = 0, excused = 0;

      records.forEach(record => {
        const myRecord = record.records.find(r => 
          r.student.toString() === req.user._id.toString()
        );
        if (myRecord) {
          switch (myRecord.status) {
            case 'present': present++; break;
            case 'absent': absent++; break;
            case 'late': late++; break;
            case 'excused': excused++; break;
          }
        }
      });

      const total = present + absent + late + excused;
      const rate = total > 0 ? ((present + late) / total) * 100 : 0;

      return {
        course: { id: course._id, name: course.name },
        present,
        absent,
        late,
        excused,
        total,
        attendanceRate: Math.round(rate * 100) / 100
      };
    }));

    const overallRate = attendanceData.length > 0
      ? attendanceData.reduce((sum, a) => sum + a.attendanceRate, 0) / attendanceData.length
      : 0;

    res.json({
      academicYear,
      term,
      overallAttendanceRate: Math.round(overallRate * 100) / 100,
      courses: attendanceData
    });
  } catch (error) {
    console.error('Student attendance error:', error);
    res.status(500).json({ message: 'Error fetching attendance' });
  }
});

// Delete attendance record
router.delete('/:attendanceId', requireRole(['teacher']), async (req, res) => {
  try {
    const { attendanceId } = req.params;

    const attendance = await Attendance.findById(attendanceId).populate('course');
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    if (attendance.course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Attendance.findByIdAndDelete(attendanceId);

    res.json({ message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ message: 'Error deleting attendance' });
  }
});

module.exports = router;
