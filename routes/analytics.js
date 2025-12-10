const express = require('express');
const Course = require('../models/Course');
const { auth, requireRole } = require('../middleware/auth');
const { 
  getCourseAnalytics, 
  getStudentAnalytics, 
  getLevelAnalytics,
  getStudentTrends,
  getTeacherPerformance,
  getAllTeachersPerformance
} = require('../services/analytics');

const router = express.Router();

router.use(auth);

// Teacher: Get analytics for a specific course
router.get('/course/:courseId', requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    // Verify ownership (teachers only)
    if (req.user.role === 'teacher') {
      const course = await Course.findById(courseId).lean();
      if (!course || course.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this course analytics' });
      }
    }

    const analytics = await getCourseAnalytics(courseId, academicYear, term);
    
    if (!analytics) {
      return res.status(404).json({ message: 'No data found for this course and period' });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Course analytics error:', error);
    res.status(500).json({ message: 'Error fetching course analytics' });
  }
});

// Student: Get own analytics
router.get('/student/me', requireRole(['student']), async (req, res) => {
  try {
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const analytics = await getStudentAnalytics(req.user._id, academicYear, term);
    
    if (!analytics) {
      return res.status(404).json({ message: 'No data found for this period' });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Student analytics error:', error);
    res.status(500).json({ message: 'Error fetching student analytics' });
  }
});

// Teacher/Admin: Get analytics for a specific student
router.get('/student/:studentId', requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    // For teachers, verify the student is in one of their courses
    if (req.user.role === 'teacher') {
      const teacherCourses = await Course.find({ 
        teacher: req.user._id, 
        students: studentId 
      }).lean();
      
      if (teacherCourses.length === 0) {
        return res.status(403).json({ message: 'Student is not in your courses' });
      }
    }

    const analytics = await getStudentAnalytics(studentId, academicYear, term);
    
    if (!analytics) {
      return res.status(404).json({ message: 'No data found for this student and period' });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Student analytics error:', error);
    res.status(500).json({ message: 'Error fetching student analytics' });
  }
});

// Admin: Get level-wide analytics
router.get('/level/:level', requireRole(['admin']), async (req, res) => {
  try {
    const { level } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const validLevels = ['Level 3', 'Level 4', 'Level 5'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ message: 'Invalid level' });
    }

    const analytics = await getLevelAnalytics(level, academicYear, term);
    res.json(analytics);
  } catch (error) {
    console.error('Level analytics error:', error);
    res.status(500).json({ message: 'Error fetching level analytics' });
  }
});

// Admin: Get overview analytics for all levels
router.get('/overview', requireRole(['admin']), async (req, res) => {
  try {
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const levels = ['Level 3', 'Level 4', 'Level 5'];
    const levelAnalytics = await Promise.all(
      levels.map(level => getLevelAnalytics(level, academicYear, term))
    );

    // Calculate institution-wide stats
    const totalStudents = levelAnalytics.reduce((sum, l) => sum + l.summary.totalStudents, 0);
    const totalCourses = levelAnalytics.reduce((sum, l) => sum + l.summary.totalCourses, 0);
    const allAverages = levelAnalytics.map(l => l.summary.levelAverage).filter(a => a > 0);
    const institutionAverage = allAverages.length > 0 
      ? allAverages.reduce((a, b) => a + b, 0) / allAverages.length 
      : 0;

    res.json({
      academicYear,
      term,
      summary: {
        totalStudents,
        totalCourses,
        institutionAverage: Math.round(institutionAverage * 100) / 100,
        levelsWithData: levelAnalytics.filter(l => l.summary.coursesWithData > 0).length
      },
      levelBreakdown: levelAnalytics.map(l => ({
        level: l.level,
        studentCount: l.summary.totalStudents,
        courseCount: l.summary.totalCourses,
        average: l.summary.levelAverage,
        passRate: l.summary.overallPassRate
      }))
    });
  } catch (error) {
    console.error('Overview analytics error:', error);
    res.status(500).json({ message: 'Error fetching overview analytics' });
  }
});

// Student: Get own performance trends across terms
router.get('/trends/me', requireRole(['student']), async (req, res) => {
  try {
    const { academicYear } = req.query;

    if (!academicYear) {
      return res.status(400).json({ message: 'Academic year is required' });
    }

    const trends = await getStudentTrends(req.user._id, academicYear);
    
    if (!trends) {
      return res.status(404).json({ message: 'No trend data found' });
    }

    res.json(trends);
  } catch (error) {
    console.error('Student trends error:', error);
    res.status(500).json({ message: 'Error fetching student trends' });
  }
});

// Teacher/Admin: Get student performance trends
router.get('/trends/student/:studentId', requireRole(['teacher', 'admin']), async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear } = req.query;

    if (!academicYear) {
      return res.status(400).json({ message: 'Academic year is required' });
    }

    // For teachers, verify the student is in one of their courses
    if (req.user.role === 'teacher') {
      const teacherCourses = await Course.find({ 
        teacher: req.user._id, 
        students: studentId 
      }).lean();
      
      if (teacherCourses.length === 0) {
        return res.status(403).json({ message: 'Student is not in your courses' });
      }
    }

    const trends = await getStudentTrends(studentId, academicYear);
    
    if (!trends) {
      return res.status(404).json({ message: 'No trend data found' });
    }

    res.json(trends);
  } catch (error) {
    console.error('Student trends error:', error);
    res.status(500).json({ message: 'Error fetching student trends' });
  }
});

// Admin: Get individual teacher performance
router.get('/teacher/:teacherId', requireRole(['admin']), async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const performance = await getTeacherPerformance(teacherId, academicYear, term);
    
    if (!performance) {
      return res.status(404).json({ message: 'Teacher not found or no data available' });
    }

    res.json(performance);
  } catch (error) {
    console.error('Teacher performance error:', error);
    res.status(500).json({ message: 'Error fetching teacher performance' });
  }
});

// Admin: Get all teachers performance rankings
router.get('/teachers/rankings', requireRole(['admin']), async (req, res) => {
  try {
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const rankings = await getAllTeachersPerformance(academicYear, term);
    res.json(rankings);
  } catch (error) {
    console.error('Teachers rankings error:', error);
    res.status(500).json({ message: 'Error fetching teachers rankings' });
  }
});

// Teacher: Get own performance
router.get('/teacher/me', requireRole(['teacher']), async (req, res) => {
  try {
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    const performance = await getTeacherPerformance(req.user._id, academicYear, term);
    
    if (!performance) {
      return res.status(404).json({ message: 'No performance data available' });
    }

    res.json(performance);
  } catch (error) {
    console.error('Teacher performance error:', error);
    res.status(500).json({ message: 'Error fetching performance data' });
  }
});

// Teacher: Get class analytics
router.get('/class', requireRole(['teacher']), async (req, res) => {
  try {
    const { academicYear, term, level } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({ message: 'Academic year and term are required' });
    }

    let query = { teacher: req.user._id };
    if (level) query.level = level;

    const Course = require('../models/Course');
    const Assessment = require('../models/Assessment');
    const courses = await Course.find(query)
      .populate('students', 'firstName lastName')
      .lean();

    if (courses.length === 0) {
      return res.json({
        classAverage: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        distribution: { excellent: 0, good: 0, average: 0, belowAverage: 0 }
      });
    }

    let allScores = [];
    let scoreCount = 0;

    for (const course of courses) {
      const assessments = await Assessment.find({
        course: course._id,
        academicYear,
        term
      }).lean();

      for (const assessment of assessments) {
        for (const mark of assessment.marks) {
          const percentage = (mark.score / assessment.maxMarks) * 100;
          allScores.push(percentage);
          scoreCount++;
        }
      }
    }

    if (allScores.length === 0) {
      return res.json({
        classAverage: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        distribution: { excellent: 0, good: 0, average: 0, belowAverage: 0 }
      });
    }

    const classAverage = allScores.reduce((a, b) => a + b) / allScores.length;
    const highestScore = Math.max(...allScores);
    const lowestScore = Math.min(...allScores);
    const passRate = (allScores.filter(s => s >= 70).length / allScores.length) * 100;

    const distribution = {
      excellent: allScores.filter(s => s >= 90).length,
      good: allScores.filter(s => s >= 75 && s < 90).length,
      average: allScores.filter(s => s >= 60 && s < 75).length,
      belowAverage: allScores.filter(s => s < 60).length
    };

    res.json({
      classAverage: Math.round(classAverage * 100) / 100,
      highestScore: Math.round(highestScore * 100) / 100,
      lowestScore: Math.round(lowestScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      distribution
    });
  } catch (error) {
    console.error('Class analytics error:', error);
    res.status(500).json({ message: 'Error fetching class analytics' });
  }
});

module.exports = router;
