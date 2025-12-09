const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const Assessment = require('../models/Assessment');
const AcademicYear = require('../models/AcademicYear');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and teacher role check to all routes
router.use(auth);
router.use(requireRole(['teacher']));

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
      const courses = await Course.find({ level, teacher: req.user._id }).lean();
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

    // Auto-enroll all students of this level
    try {
      const students = await User.find({ role: 'student', level }).lean();
      
      if (students.length > 0) {
        const studentIds = students.map(s => s._id);
        
        // Add students to course
        course.students = studentIds;
        await course.save();
        
        // Add course to students
        await User.updateMany(
          { _id: { $in: studentIds } },
          { $addToSet: { courses: course._id } }
        );
      }
    } catch (error) {
      console.error('Error auto-enrolling students to new course:', error);
      // Continue even if auto-enrollment fails
    }

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
      .populate('assessments')
      .lean();

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
      .populate('students', 'firstName lastName email _id')
      .populate({
        path: 'assessments',
        populate: {
          path: 'marks.student',
          select: '_id'
        }
      });
    
    // Verify authorization
    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this course' });
    }
    
    // Ensure arrays exist
    course.students = course.students || [];
    course.assessments = course.assessments || [];

    // Calculate average marks for each student
    const studentsWithPerformance = course.students.map(student => {
      let totalObtainedMarks = 0;
      let totalMaxMarks = 0;
      let totalAssessments = 0;

      course.assessments.forEach(assessment => {
        if (!assessment.marks || assessment.marks.length === 0) {
          return;
        }
        
        const studentMark = assessment.marks.find(mark => {
          // mark.student could be an ObjectId or an object with _id field
          const markStudentId = mark.student._id 
            ? mark.student._id.toString() 
            : mark.student.toString();
          const currentStudentId = student._id.toString();
          return markStudentId === currentStudentId;
        });
        
        if (studentMark) {
          totalObtainedMarks += studentMark.score;
          totalMaxMarks += assessment.maxMarks;
          totalAssessments++;
        }
      });

      const average = totalMaxMarks > 0 ? (totalObtainedMarks / totalMaxMarks) * 100 : 0;
      
      // Determine color based on average
      let color = 'red'; // Below 60%
      if (average >= 70) color = 'green'; // 70% and above
      else if (average >= 60) color = 'yellow'; // 60-69.9%

      const studentData = student.toObject ? student.toObject() : student;
      return {
        ...studentData,
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
