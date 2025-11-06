const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const AcademicYear = require('../models/AcademicYear');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and admin role check to all routes
router.use(auth);
router.use(requireRole(['admin']));

// Get all users grouped by role
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('courses', 'name level');
    
    const groupedUsers = {
      admins: users.filter(u => u.role === 'admin'),
      teachers: users.filter(u => u.role === 'teacher'),
      students: {
        'Level 3': users.filter(u => u.role === 'student' && u.level === 'Level 3'),
        'Level 4': users.filter(u => u.role === 'student' && u.level === 'Level 4'),
        'Level 5': users.filter(u => u.role === 'student' && u.level === 'Level 5')
      }
    };

    res.json(groupedUsers);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get single user details
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password').populate('courses', 'name level');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update user
router.put('/users/:userId', [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('level').optional().isIn(['Level 3', 'Level 4', 'Level 5'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const updates = req.body;

    // Prevent updating password and role through this endpoint
    delete updates.password;
    delete updates.role;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Reset user password
router.post('/users/:userId/reset-password', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a random password
    const newPassword = Math.random().toString(36).slice(-8);
    
    user.password = newPassword;
    await user.save();

    res.json({ 
      message: 'Password reset successfully',
      newPassword: newPassword // Send back the new password
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If deleting a teacher, also delete their courses and assessments
    if (user.role === 'teacher') {
      const courses = await Course.find({ teacher: userId });
      const courseIds = courses.map(c => c._id);
      
      // Delete all assessments for these courses
      await Assessment.deleteMany({ course: { $in: courseIds } });
      
      // Delete all courses
      await Course.deleteMany({ teacher: userId });
    }

    // If deleting a student, remove them from courses
    if (user.role === 'student') {
      await Course.updateMany(
        { students: userId },
        { $pull: { students: userId } }
      );
      
      // Remove student marks from assessments
      await Assessment.updateMany(
        { 'marks.student': userId },
        { $pull: { marks: { student: userId } } }
      );
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = {
      totalAdmins: await User.countDocuments({ role: 'admin' }),
      totalTeachers: await User.countDocuments({ role: 'teacher' }),
      totalStudents: await User.countDocuments({ role: 'student' }),
      studentsByLevel: {
        'Level 3': await User.countDocuments({ role: 'student', level: 'Level 3' }),
        'Level 4': await User.countDocuments({ role: 'student', level: 'Level 4' }),
        'Level 5': await User.countDocuments({ role: 'student', level: 'Level 5' })
      },
      totalCourses: await Course.countDocuments(),
      totalAssessments: await Assessment.countDocuments()
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// Get all academic years
router.get('/academic-years', async (req, res) => {
  try {
    const years = await AcademicYear.find().sort({ year: 1 });
    res.json(years);
  } catch (error) {
    console.error('Academic years fetch error:', error);
    res.status(500).json({ message: 'Error fetching academic years' });
  }
});

// Create academic year
router.post('/academic-years', [
  body('year').notEmpty().withMessage('Academic year is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { year } = req.body;

    const existingYear = await AcademicYear.findOne({ year });
    if (existingYear) {
      return res.status(400).json({ message: 'Academic year already exists' });
    }

    const academicYear = new AcademicYear({ year });
    await academicYear.save();

    res.status(201).json(academicYear);
  } catch (error) {
    console.error('Academic year creation error:', error);
    res.status(500).json({ message: 'Error creating academic year' });
  }
});

// Set active academic year and term
router.put('/academic-years/:yearId/activate', [
  body('currentTerm').isIn(['1st Term', '2nd Term', '3rd Term']).withMessage('Invalid term')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { yearId } = req.params;
    const { currentTerm } = req.body;

    // Deactivate all years
    await AcademicYear.updateMany({}, { isActive: false });

    // Activate selected year with term
    const academicYear = await AcademicYear.findByIdAndUpdate(
      yearId,
      { isActive: true, currentTerm },
      { new: true }
    );

    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }

    res.json(academicYear);
  } catch (error) {
    console.error('Academic year activation error:', error);
    res.status(500).json({ message: 'Error activating academic year' });
  }
});

// Delete academic year
router.delete('/academic-years/:yearId', async (req, res) => {
  try {
    const { yearId } = req.params;

    const academicYear = await AcademicYear.findById(yearId);
    if (!academicYear) {
      return res.status(404).json({ message: 'Academic year not found' });
    }

    if (academicYear.isActive) {
      return res.status(400).json({ message: 'Cannot delete active academic year' });
    }

    await AcademicYear.findByIdAndDelete(yearId);

    res.json({ message: 'Academic year deleted successfully' });
  } catch (error) {
    console.error('Academic year deletion error:', error);
    res.status(500).json({ message: 'Error deleting academic year' });
  }
});

module.exports = router;
