const express = require('express');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const AcademicYear = require('../models/AcademicYear');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and student role check to all routes
router.use(auth);
router.use(requireRole(['student']));

// Get available academic years and terms
router.get('/academic-info', async (req, res) => {
  try {
    // Get all academic years from database (sorted ascending)
    const academicYears = await AcademicYear.find().sort({ year: 1 }).lean();
    const activeYear = academicYears.find(y => y.isActive);

    // If no academic years in database, return error
    if (academicYears.length === 0) {
      return res.status(400).json({ 
        message: 'No academic years configured. Please contact administrator.',
        academicYears: [],
        currentAcademicYear: null,
        currentTerm: null
      });
    }

    // Use active year if exists, otherwise use the most recent year
    const defaultYear = activeYear || academicYears[academicYears.length - 1];

    res.json({
      currentAcademicYear: defaultYear.year,
      currentTerm: defaultYear.currentTerm || '1st Term',
      academicYears: academicYears.map(y => y.year),
      terms: ['1st Term', '2nd Term', '3rd Term'],
      isActiveYear: activeYear ? true : false
    });
  } catch (error) {
    console.error('Academic info error:', error);
    res.status(500).json({ message: 'Error fetching academic information' });
  }
});

// Get student dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    
    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const courses = await Course.find({ students: req.user._id })
      .populate('assessments')
      .lean();

    const coursesWithPerformance = await Promise.all(courses.map(async (course) => {
      // Get assessments for specific academic year and term
      const assessments = await Assessment.find({ 
        course: course._id,
        academicYear: academicYear,
        term: term
      }).populate('marks.student', 'firstName lastName').lean();

      // Calculate student's performance in this course
      let totalMarks = 0;
      let totalMaxMarks = 0;
      const studentAssessments = [];

      assessments.forEach(assessment => {
        const studentMark = assessment.marks.find(mark => 
          mark.student._id.toString() === req.user._id.toString()
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

      // Calculate percentage average
      const average = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
      
      // Determine color based on average
      let color = 'red'; // Below 60%
      if (average >= 70) color = 'green'; // 70% and above
      else if (average >= 60) color = 'yellow'; // 60-69.9%

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

    res.json(coursesWithPerformance);
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

// Get detailed course performance
router.get('/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if student is enrolled in this course
    if (!course.students.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    const assessments = await Assessment.find({ course: courseId })
      .populate('marks.student', 'firstName lastName')
      .lean();

    // Calculate student's performance
    let totalMarks = 0;
    let totalAssessments = 0;
    const studentAssessments = [];

    assessments.forEach(assessment => {
      const studentMark = assessment.marks.find(mark => 
        mark.student._id.toString() === req.user._id.toString()
      );
      
      if (studentMark) {
        totalMarks += studentMark.score;
        totalAssessments++;
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

    const average = totalAssessments > 0 ? totalMarks / totalAssessments : 0;
    
    // Determine color based on average
    let color = 'red'; // Below 60%
    if (average >= 70) color = 'green'; // 70% and above
    else if (average >= 60) color = 'yellow'; // 60-69.9%

    res.json({
      course: {
        id: course._id,
        name: course.name,
        level: course.level
      },
      average: Math.round(average * 100) / 100,
      color,
      totalAssessments,
      assessments: studentAssessments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    console.error('Course performance error:', error);
    res.status(500).json({ message: 'Error fetching course performance' });
  }
});

module.exports = router;
