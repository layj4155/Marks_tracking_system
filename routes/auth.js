const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['teacher', 'student', 'admin']).withMessage('Role must be teacher, student, or admin'),
  body('level').optional().isIn(['Level 3', 'Level 4', 'Level 5']).withMessage('Invalid level'),
  body('teacherWord').optional().trim().custom((value, { req }) => {
    if (req.body.role === 'teacher' && !value) {
      throw new Error('Teacher authorization word is required for teacher registration');
    }
    return true;
  }),
  body('adminWord').optional().trim().custom((value, { req }) => {
    if (req.body.role === 'admin' && !value) {
      throw new Error('Admin authorization word is required for admin registration');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, role, level, teacherWord, adminWord } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Validate level requirement for students
    if (role === 'student' && !level) {
      return res.status(400).json({ message: 'Level is required for students' });
    }

    // Validate teacher security word
    if (role === 'teacher' && teacherWord !== 'XWZ') {
      return res.status(400).json({ message: 'Invalid teacher authorization word' });
    }

    // Validate admin security word
    if (role === 'admin' && adminWord !== 'ADMIN2025') {
      return res.status(400).json({ message: 'Invalid admin authorization word' });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      level: role === 'student' ? level : undefined
    });

    await user.save();

    // Auto-enroll students in courses matching their level
    if (role === 'student' && level) {
      try {
        // Find all courses for this level
        const courses = await Course.find({ level });
        
        if (courses.length > 0) {
          const courseIds = courses.map(c => c._id);
          
          // Add student to all courses
          await Course.updateMany(
            { _id: { $in: courseIds } },
            { $addToSet: { students: user._id } }
          );
          
          // Add student to user's courses
          user.courses = courseIds;
          await user.save();
          
          // Add student to existing assessments with 0 marks
          for (const course of courses) {
            const assessments = await Assessment.find({ course: course._id });
            
            for (const assessment of assessments) {
              // Check if student is not already in the assessment
              const existingMark = assessment.marks.find(m => m.student.toString() === user._id.toString());
              
              if (!existingMark) {
                assessment.marks.push({
                  student: user._id,
                  score: 0,
                  comment: 'Newly enrolled - marks pending'
                });
                await assessment.save();
              }
            }
          }
        }
      } catch (error) {
        console.error('Error auto-enrolling student:', error);
        // Continue even if auto-enrollment fails
      }
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        level: user.level
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        level: user.level
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      role: req.user.role,
      level: req.user.level
    }
  });
});

// Forgot Password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token (in a real app, you'd send this via email)
    const resetToken = jwt.sign(
      { userId: user._id, type: 'password_reset' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    // For demo purposes, we'll return the token
    // In production, send this token via email
    res.json({ 
      message: 'Password reset token generated',
      resetToken: resetToken // Remove this in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// Reset Password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

module.exports = router;
