const express = require('express');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { generateStudentReport, generateClassReport } = require('../services/reportGenerator');

const router = express.Router();

router.use(auth);

// Student: Download own grade report
router.get('/student/my-report', requireRole(['student']), async (req, res) => {
  try {
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const student = req.user;

    const courses = await Course.find({ students: student._id }).lean();

    const coursesWithAssessments = await Promise.all(courses.map(async (course) => {
      const assessments = await Assessment.find({
        course: course._id,
        academicYear,
        term
      }).lean();

      const studentAssessments = assessments.map(assessment => {
        const mark = assessment.marks.find(m => 
          m.student.toString() === student._id.toString()
        );
        return {
          name: assessment.name,
          type: assessment.type,
          maxMarks: assessment.maxMarks,
          score: mark ? mark.score : 0,
          comment: mark ? mark.comment : ''
        };
      }).filter(a => a.score !== undefined);

      return {
        name: course.name,
        level: course.level,
        assessments: studentAssessments
      };
    }));

    const filteredCourses = coursesWithAssessments.filter(c => c.assessments.length > 0);

    if (filteredCourses.length === 0) {
      return res.status(404).json({ message: 'No assessment data found for this period' });
    }

    const pdfBuffer = await generateStudentReport(student, filteredCourses, academicYear, term);

    const filename = `Grade_Report_${student.lastName}_${student.firstName}_${academicYear}_${term.replace(/\s/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Student report generation error:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
});

// Teacher: Download class report for a course
router.get('/teacher/course/:courseId', requireRole(['teacher']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const course = await Course.findById(courseId)
      .populate('students', 'firstName lastName email')
      .lean();

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this course' });
    }

    const assessments = await Assessment.find({
      course: courseId,
      academicYear,
      term
    }).populate('marks.student', 'firstName lastName').lean();

    if (assessments.length === 0) {
      return res.status(404).json({ message: 'No assessments found for this period' });
    }

    const pdfBuffer = await generateClassReport(course, course.students, assessments, academicYear, term);

    const filename = `Class_Report_${course.name.replace(/\s/g, '_')}_${academicYear}_${term.replace(/\s/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Class report generation error:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
});

// Teacher: Download individual student report
router.get('/teacher/student/:studentId', requireRole(['teacher']), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const student = await User.findById(studentId).lean();
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get courses taught by this teacher that the student is enrolled in
    const teacherCourses = await Course.find({ 
      teacher: req.user._id,
      students: studentId 
    }).lean();

    if (teacherCourses.length === 0) {
      return res.status(404).json({ message: 'Student is not enrolled in any of your courses' });
    }

    const coursesWithAssessments = await Promise.all(teacherCourses.map(async (course) => {
      const assessments = await Assessment.find({
        course: course._id,
        academicYear,
        term
      }).lean();

      const studentAssessments = assessments.map(assessment => {
        const mark = assessment.marks.find(m => 
          m.student.toString() === studentId
        );
        return {
          name: assessment.name,
          type: assessment.type,
          maxMarks: assessment.maxMarks,
          score: mark ? mark.score : 0,
          comment: mark ? mark.comment : ''
        };
      });

      return {
        name: course.name,
        level: course.level,
        assessments: studentAssessments
      };
    }));

    const filteredCourses = coursesWithAssessments.filter(c => c.assessments.length > 0);

    if (filteredCourses.length === 0) {
      return res.status(404).json({ message: 'No assessment data found for this period' });
    }

    const pdfBuffer = await generateStudentReport(student, filteredCourses, academicYear, term);

    const filename = `Student_Report_${student.lastName}_${student.firstName}_${academicYear}_${term.replace(/\s/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Student report generation error:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
});

// Admin: Download any student's complete report (all courses)
router.get('/admin/student/:studentId', requireRole(['admin']), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const student = await User.findById(studentId).lean();
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    const courses = await Course.find({ students: studentId }).lean();

    const coursesWithAssessments = await Promise.all(courses.map(async (course) => {
      const assessments = await Assessment.find({
        course: course._id,
        academicYear,
        term
      }).lean();

      const studentAssessments = assessments.map(assessment => {
        const mark = assessment.marks.find(m => 
          m.student.toString() === studentId
        );
        return {
          name: assessment.name,
          type: assessment.type,
          maxMarks: assessment.maxMarks,
          score: mark ? mark.score : 0,
          comment: mark ? mark.comment : ''
        };
      });

      return {
        name: course.name,
        level: course.level,
        assessments: studentAssessments
      };
    }));

    const filteredCourses = coursesWithAssessments.filter(c => c.assessments.length > 0);

    if (filteredCourses.length === 0) {
      return res.status(404).json({ message: 'No assessment data found for this period' });
    }

    const pdfBuffer = await generateStudentReport(student, filteredCourses, academicYear, term);

    const filename = `Full_Report_${student.lastName}_${student.firstName}_${academicYear}_${term.replace(/\s/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Admin report generation error:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
});

module.exports = router;
