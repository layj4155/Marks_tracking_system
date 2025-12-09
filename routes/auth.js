const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const { auth } = require('../middleware/auth');
const config = require('../config');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../services/email');

const router = express.Router();

const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;

// Register
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['teacher', 'student', 'admin', 'parent']).withMessage('Role must be teacher, student, admin, or parent'),
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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (role === 'student' && !level) {
      return res.status(400).json({ message: 'Level is required for students' });
    }

    if (role === 'teacher') {
      if (!config.teacherRegCode) {
        return res.status(500).json({ message: 'Teacher registration is not configured' });
      }
      if (teacherWord !== config.teacherRegCode) {
        return res.status(400).json({ message: 'Invalid teacher authorization word' });
      }
    }

    if (role === 'admin') {
      if (!config.adminRegCode) {
        return res.status(500).json({ message: 'Admin registration is not configured' });
      }
      if (adminWord !== config.adminRegCode) {
        return res.status(400).json({ message: 'Invalid admin authorization word' });
      }
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

    if (role === 'student' && level) {
      try {
        const courses = await Course.find({ level }).lean();
        
        if (courses.length > 0) {
          const courseIds = courses.map(c => c._id);
          
          await Course.updateMany(
            { _id: { $in: courseIds } },
            { $addToSet: { students: user._id } }
          );
          
          user.courses = courseIds;
          await user.save();
          
          const assessments = await Assessment.find({ course: { $in: courseIds } });
          
          const ops = [];
          for (const assessment of assessments) {
            const alreadyHas = assessment.marks.some(
              m => m.student.toString() === user._id.toString()
            );
            if (!alreadyHas) {
              ops.push({
                updateOne: {
                  filter: { _id: assessment._id },
                  update: {
                    $push: {
                      marks: {
                        student: user._id,
                        score: 0,
                        comment: 'Newly enrolled - marks pending'
                      }
                    }
                  }
                }
              });
            }
          }
          if (ops.length) {
            await Assessment.bulkWrite(ops);
          }
        }
      } catch (error) {
        console.error('Error auto-enrolling student:', error);
      }
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    user.emailVerificationToken = hashedVerificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationToken, firstName);
    
    if (!emailResult.success && config.nodeEnv === 'development') {
      console.log(`[DEV] Email not sent. Verification token for ${email}: ${verificationToken}`);
    }

    const token = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
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
        level: user.level,
        isEmailVerified: user.isEmailVerified
      },
      message: 'Registration successful. Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login with account lockout protection
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

    const user = await User.findOne({ email }).select('+failedLoginAttempts +lockUntil');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ 
        message: `Account is locked. Try again in ${remainingTime} minutes.` 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME);
        await user.save();
        return res.status(423).json({ 
          message: 'Account locked due to too many failed attempts. Try again in 15 minutes.' 
        });
      }
      
      await user.save();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      config.jwtSecret,
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
        level: user.level,
        isEmailVerified: user.isEmailVerified
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
      level: req.user.level,
      isEmailVerified: req.user.isEmailVerified
    }
  });
});

// Forgot Password - secure implementation
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    
    const genericMessage = 'If an account with that email exists, a password reset link has been sent.';
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const emailResult = await sendPasswordResetEmail(email, resetToken, user.firstName);
    
    if (!emailResult.success && config.nodeEnv === 'development') {
      console.log(`[DEV] Email not sent. Reset token for ${email}: ${resetToken}`);
    }

    res.json({ message: genericMessage });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// Reset Password - secure implementation
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, email, newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');
    
    if (!user || user.resetPasswordToken !== hashedToken || !user.resetPasswordExpires || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// Verify Email
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, email } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid verification link' });
    }

    if (user.isEmailVerified) {
      return res.json({ message: 'Email is already verified' });
    }

    if (user.emailVerificationToken !== hashedToken || !user.emailVerificationExpires || user.emailVerificationExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
});

// Resend Verification Email
router.post('/resend-verification', [
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
      return res.json({ message: 'If an account exists, a verification email has been sent.' });
    }

    if (user.isEmailVerified) {
      return res.json({ message: 'Email is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const emailResult = await sendVerificationEmail(email, verificationToken, user.firstName);
    
    if (!emailResult.success && config.nodeEnv === 'development') {
      console.log(`[DEV] Verification token for ${email}: ${verificationToken}`);
    }

    res.json({ message: 'If an account exists, a verification email has been sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Server error during verification email resend' });
  }
});

module.exports = router;
