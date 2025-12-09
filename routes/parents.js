const express = require('express');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const { auth, requireRole } = require('../middleware/auth');
const { generateStudentReport } = require('../services/reportGenerator');

const router = express.Router();

router.use(auth);
router.use(requireRole(['parent']));

// Get linked children
router.get('/children', async (req, res) => {
  try {
    const parent = await User.findById(req.user._id)
      .populate('children', 'firstName lastName email level')
      .lean();

    res.json(parent.children || []);
  } catch (error) {
    console.error('Fetch children error:', error);
    res.status(500).json({ message: 'Error fetching children' });
  }
});

// Get academic info
router.get('/academic-info', async (req, res) => {
  try {
    const academicYears = await AcademicYear.find().sort({ year: 1 }).lean();
    const activeYear = academicYears.find(y => y.isActive);

    if (academicYears.length === 0) {
      return res.status(400).json({ 
        message: 'No academic years configured',
        academicYears: [],
        currentAcademicYear: null,
        currentTerm: null
      });
    }

    const defaultYear = activeYear || academicYears[academicYears.length - 1];

    res.json({
      currentAcademicYear: defaultYear.year,
      currentTerm: defaultYear.currentTerm || '1st Term',
      academicYears: academicYears.map(y => y.year),
      terms: ['1st Term', '2nd Term', '3rd Term']
    });
  } catch (error) {
    console.error('Academic info error:', error);
    res.status(500).json({ message: 'Error fetching academic information' });
  }
});

// Get child's dashboard (read-only view of student dashboard)
router.get('/children/:childId/dashboard', async (req, res) => {
  try {
    const { childId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    // Verify this is parent's child
    const parent = await User.findById(req.user._id).lean();
    if (!parent.children || !parent.children.some(c => c.toString() === childId)) {
      return res.status(403).json({ message: 'Not authorized to view this student' });
    }

    const child = await User.findById(childId).lean();
    if (!child || child.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    const courses = await Course.find({ students: childId }).lean();

    const coursesWithPerformance = await Promise.all(courses.map(async (course) => {
      const assessments = await Assessment.find({
        course: course._id,
        academicYear,
        term
      }).lean();

      let totalMarks = 0;
      let totalMaxMarks = 0;
      const studentAssessments = [];

      assessments.forEach(assessment => {
        const studentMark = assessment.marks.find(mark => 
          mark.student.toString() === childId
        );
        
        if (studentMark) {
          totalMarks += studentMark.score;
          totalMaxMarks += assessment.maxMarks;
          studentAssessments.push({
            id: assessment._id,
            name: assessment.name,
            type: assessment.type,
            maxMarks: assessment.maxMarks,
            score: studentMark.score,
            comment: studentMark.comment,
            createdAt: assessment.createdAt
          });
        }
      });

      const average = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
      
      let color = 'red';
      if (average >= 70) color = 'green';
      else if (average >= 60) color = 'yellow';

      return {
        id: course._id,
        name: course.name,
        level: course.level,
        average: Math.round(average * 100) / 100,
        color,
        totalAssessments: studentAssessments.length,
        assessments: studentAssessments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      };
    }));

    res.json({
      child: {
        id: child._id,
        firstName: child.firstName,
        lastName: child.lastName,
        level: child.level
      },
      courses: coursesWithPerformance
    });
  } catch (error) {
    console.error('Child dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

// Download child's grade report
router.get('/children/:childId/report', async (req, res) => {
  try {
    const { childId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    // Verify this is parent's child
    const parent = await User.findById(req.user._id).lean();
    if (!parent.children || !parent.children.some(c => c.toString() === childId)) {
      return res.status(403).json({ message: 'Not authorized to view this student' });
    }

    const child = await User.findById(childId).lean();
    if (!child || child.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    const courses = await Course.find({ students: childId }).lean();

    const coursesWithAssessments = await Promise.all(courses.map(async (course) => {
      const assessments = await Assessment.find({
        course: course._id,
        academicYear,
        term
      }).lean();

      const studentAssessments = assessments.map(assessment => {
        const mark = assessment.marks.find(m => 
          m.student.toString() === childId
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

    const pdfBuffer = await generateStudentReport(child, filteredCourses, academicYear, term);

    const filename = `Grade_Report_${child.lastName}_${child.firstName}_${academicYear}_${term.replace(/\s/g, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
});

module.exports = router;
