const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const Assessment = require('../models/Assessment');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and teacher role check to all routes
router.use(auth);
router.use(requireRole(['teacher']));

// Get available academic years and terms
router.get('/academic-info', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Determine current academic year
    let academicYear;
    if (currentMonth >= 9) {
      academicYear = `${currentYear}-${currentYear + 1}`;
    } else {
      academicYear = `${currentYear - 1}-${currentYear}`;
    }

    // Determine current term based on month
    let currentTerm;
    if (currentMonth >= 9 && currentMonth <= 12) {
      currentTerm = '1st Term';
    } else if (currentMonth >= 1 && currentMonth <= 3) {
      currentTerm = '2nd Term';
    } else if (currentMonth >= 4 && currentMonth <= 7) {
      currentTerm = '3rd Term';
    } else {
      currentTerm = '1st Term'; // Default for August
    }

    res.json({
      currentAcademicYear: academicYear,
      currentTerm: currentTerm,
      academicYears: [
        `${currentYear - 1}-${currentYear}`,
        `${currentYear}-${currentYear + 1}`,
        `${currentYear + 1}-${currentYear + 2}`
      ],
      terms: ['1st Term', '2nd Term', '3rd Term']
    });
  } catch (error) {
    console.error('Academic info error:', error);
    res.status(500).json({ message: 'Error fetching academic information' });
  }
});

// Get teacher dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    
    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const levels = ['Level 3', 'Level 4', 'Level 5'];
    const dashboardData = {};

    for (const level of levels) {
      const courses = await Course.find({ level, teacher: req.user._id });
      const totalStudents = await User.countDocuments({ 
        role: 'student', 
        level,
        courses: { $in: courses.map(c => c._id) }
      });

      dashboardData[level] = {
        courseCount: courses.length,
        studentCount: totalStudents,
        courses: courses.map(course => ({
          id: course._id,
          name: course.name,
          studentCount: course.students.length
        }))
      };
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

// Create a new course
router.post('/courses', [
  body('name').trim().notEmpty().withMessage('Course name is required'),
  body('level').isIn(['Level 3', 'Level 4', 'Level 5']).withMessage('Invalid level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, level } = req.body;

    const course = new Course({
      name,
      level,
      teacher: req.user._id,
      students: [],
      assessments: []
    });

    await course.save();
    res.status(201).json(course);
  } catch (error) {
    console.error('Course creation error:', error);
    res.status(500).json({ message: 'Error creating course' });
  }
});

// Get courses for a specific level
router.get('/courses/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const courses = await Course.find({ level, teacher: req.user._id })
      .populate('students', 'firstName lastName email')
      .populate('assessments');

    res.json(courses);
  } catch (error) {
    console.error('Courses fetch error:', error);
    res.status(500).json({ message: 'Error fetching courses' });
  }
});

// Add student to course
router.post('/courses/:courseId/students', [
  body('studentId').isMongoId().withMessage('Valid student ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId } = req.params;
    const { studentId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this course' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!course.students.includes(studentId)) {
      course.students.push(studentId);
      await course.save();

      // Add course to student's courses
      if (!student.courses.includes(courseId)) {
        student.courses.push(courseId);
        await student.save();
      }
    }

    res.json({ message: 'Student added to course successfully' });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({ message: 'Error adding student to course' });
  }
});

// Remove student from course
router.delete('/courses/:courseId/students/:studentId', async (req, res) => {
  try {
    const { courseId, studentId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this course' });
    }

    course.students = course.students.filter(id => id.toString() !== studentId);
    await course.save();

    // Remove course from student's courses
    const student = await User.findById(studentId);
    if (student) {
      student.courses = student.courses.filter(id => id.toString() !== courseId);
      await student.save();
    }

    res.json({ message: 'Student removed from course successfully' });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ message: 'Error removing student from course' });
  }
});

// Get students for a course with their performance data
router.get('/courses/:courseId/students', async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate('students', 'firstName lastName email')
      .populate({
        path: 'assessments',
        populate: {
          path: 'marks.student',
          select: 'firstName lastName'
        }
      });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this course' });
    }

    // Calculate average marks for each student
    const studentsWithPerformance = course.students.map(student => {
      let totalMarks = 0;
      let totalAssessments = 0;

      course.assessments.forEach(assessment => {
        const studentMark = assessment.marks.find(mark => 
          mark.student._id.toString() === student._id.toString()
        );
        if (studentMark) {
          totalMarks += studentMark.score;
          totalAssessments++;
        }
      });

      const average = totalAssessments > 0 ? totalMarks / totalAssessments : 0;
      
      // Determine color based on average
      let color = 'red'; // Below 60%
      if (average >= 70) color = 'green'; // 70% and above
      else if (average >= 60) color = 'yellow'; // 60-69.9%

      return {
        ...student.toObject(),
        average: Math.round(average * 100) / 100,
        color,
        totalAssessments
      };
    });

    res.json(studentsWithPerformance);
  } catch (error) {
    console.error('Students fetch error:', error);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

module.exports = router;
