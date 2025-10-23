const express = require('express');
const Course = require('../models/Course');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(auth);

// Get all students for teacher to assign to courses
router.get('/students', requireRole(['teacher']), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('firstName lastName email level')
      .sort({ lastName: 1, firstName: 1 });

    res.json(students);
  } catch (error) {
    console.error('Students fetch error:', error);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

// Delete a course (teacher only)
router.delete('/:courseId', requireRole(['teacher']), async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }

    // Remove course from all students' course lists
    await User.updateMany(
      { courses: courseId },
      { $pull: { courses: courseId } }
    );

    await Course.findByIdAndDelete(courseId);

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Course deletion error:', error);
    res.status(500).json({ message: 'Error deleting course' });
  }
});

module.exports = router;
