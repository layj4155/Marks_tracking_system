const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Get own profile
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('courses', 'name level')
      .lean();

    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update own profile
router.put('/', [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email } = req.body;
    const updates = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updates.email = email;
      updates.isEmailVerified = false; // Require re-verification
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ 
      message: 'Profile updated successfully',
      user,
      emailChanged: updates.email !== undefined
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Change password
router.put('/password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Get account statistics
router.get('/stats', async (req, res) => {
  try {
    const user = req.user;
    const stats = {
      role: user.role,
      memberSince: user.createdAt,
      isEmailVerified: user.isEmailVerified
    };

    if (user.role === 'student') {
      const Course = require('../models/Course');
      const Assessment = require('../models/Assessment');
      
      const courseCount = await Course.countDocuments({ students: user._id });
      const assessments = await Assessment.find({ 'marks.student': user._id }).lean();
      
      let totalScore = 0;
      let totalMaxMarks = 0;
      
      assessments.forEach(a => {
        const mark = a.marks.find(m => m.student.toString() === user._id.toString());
        if (mark) {
          totalScore += mark.score;
          totalMaxMarks += a.maxMarks;
        }
      });

      stats.enrolledCourses = courseCount;
      stats.totalAssessments = assessments.length;
      stats.overallAverage = totalMaxMarks > 0 
        ? Math.round((totalScore / totalMaxMarks) * 100 * 100) / 100 
        : 0;
    }

    if (user.role === 'teacher') {
      const Course = require('../models/Course');
      const Assessment = require('../models/Assessment');
      
      const courses = await Course.find({ teacher: user._id }).lean();
      const courseIds = courses.map(c => c._id);
      
      const totalStudents = courses.reduce((sum, c) => sum + c.students.length, 0);
      const assessmentCount = await Assessment.countDocuments({ course: { $in: courseIds } });

      stats.coursesCreated = courses.length;
      stats.totalStudents = totalStudents;
      stats.assessmentsCreated = assessmentCount;
    }

    res.json(stats);
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

module.exports = router;
