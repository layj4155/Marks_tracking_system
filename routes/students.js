const express = require('express');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and student role check to all routes
router.use(auth);
router.use(requireRole(['student']));

// Get student dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user._id })
      .populate('assessments');

    const coursesWithPerformance = await Promise.all(courses.map(async (course) => {
      const assessments = await Assessment.find({ course: course._id })
        .populate('marks.student', 'firstName lastName');

      // Calculate student's performance in this course
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

      return {
        id: course._id,
        name: course.name,
        level: course.level,
        average: Math.round(average * 100) / 100,
        color,
        totalAssessments,
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

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if student is enrolled in this course
    if (!course.students.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    const assessments = await Assessment.find({ course: courseId })
      .populate('marks.student', 'firstName lastName');

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
