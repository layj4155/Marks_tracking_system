const express = require('express');
const { body, validationResult } = require('express-validator');
const Assessment = require('../models/Assessment');
const Course = require('../models/Course');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and teacher role check to all routes
router.use(auth);
router.use(requireRole(['teacher']));

// Create a new assessment
router.post('/', [
  body('name').trim().notEmpty().withMessage('Assessment name is required'),
  body('type').isIn(['Formative', 'Summative']).withMessage('Type must be Formative or Summative'),
  body('courseId').isMongoId().withMessage('Valid course ID is required'),
  body('maxMarks').isNumeric().isFloat({ min: 1 }).withMessage('Max marks must be a positive number'),
  body('marks').optional().isArray(),
  body('marks.*.studentId').optional().isMongoId(),
  body('marks.*.score').optional().isNumeric().isFloat({ min: 0 }),
  body('marks.*.comment').optional().isString().trim(),
  body('dateRecorded').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, courseId, maxMarks, marks } = req.body;

    // Verify course exists and teacher owns it
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to create assessment for this course' });
    }

    const assessment = new Assessment({
      name,
      type,
      course: courseId,
      maxMarks,
      marks: Array.isArray(marks)
        ? marks.map(m => ({
            student: m.studentId,
            score: Math.min(Number(m.score || 0), Number(maxMarks)),
            comment: m.comment || ''
          }))
        : []
    });

    await assessment.save();

    // Add assessment to course
    course.assessments.push(assessment._id);
    await course.save();

    res.status(201).json(assessment);
  } catch (error) {
    console.error('Assessment creation error:', error);
    res.status(500).json({ message: 'Error creating assessment' });
  }
});

// Get assessments for a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify course exists and teacher owns it
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view assessments for this course' });
    }

    const assessments = await Assessment.find({ course: courseId })
      .populate('marks.student', 'firstName lastName email');

    res.json(assessments);
  } catch (error) {
    console.error('Assessments fetch error:', error);
    res.status(500).json({ message: 'Error fetching assessments' });
  }
});

// Enter marks for an assessment
router.post('/:assessmentId/marks', [
  body('marks').isArray().withMessage('Marks must be an array'),
  body('marks.*.studentId').isMongoId().withMessage('Valid student ID is required'),
  body('marks.*.score').isNumeric().isFloat({ min: 0 }).withMessage('Score must be a non-negative number'),
  body('marks.*.comment').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assessmentId } = req.params;
    const { marks } = req.body;

    const assessment = await Assessment.findById(assessmentId)
      .populate('course');

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Verify teacher owns the course
    if (assessment.course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to enter marks for this assessment' });
    }

    // Update marks
    assessment.marks = marks.map(markData => ({
      student: markData.studentId,
      score: markData.score,
      comment: markData.comment || ''
    }));

    await assessment.save();

    res.json({ message: 'Marks updated successfully', assessment });
  } catch (error) {
    console.error('Marks entry error:', error);
    res.status(500).json({ message: 'Error entering marks' });
  }
});

// Get marks for an assessment
router.get('/:assessmentId/marks', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const assessment = await Assessment.findById(assessmentId)
      .populate('course')
      .populate('marks.student', 'firstName lastName email');

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Verify teacher owns the course
    if (assessment.course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view marks for this assessment' });
    }

    res.json(assessment);
  } catch (error) {
    console.error('Marks fetch error:', error);
    res.status(500).json({ message: 'Error fetching marks' });
  }
});

// Update a specific mark
router.put('/:assessmentId/marks/:studentId', [
  body('score').isNumeric().isFloat({ min: 0 }).withMessage('Score must be a non-negative number'),
  body('comment').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assessmentId, studentId } = req.params;
    const { score, comment } = req.body;

    const assessment = await Assessment.findById(assessmentId)
      .populate('course');

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Verify teacher owns the course
    if (assessment.course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update marks for this assessment' });
    }

    // Find and update the mark
    const markIndex = assessment.marks.findIndex(mark => 
      mark.student.toString() === studentId
    );

    if (markIndex === -1) {
      return res.status(404).json({ message: 'Mark not found for this student' });
    }

    assessment.marks[markIndex].score = score;
    assessment.marks[markIndex].comment = comment || '';

    await assessment.save();

    res.json({ message: 'Mark updated successfully' });
  } catch (error) {
    console.error('Mark update error:', error);
    res.status(500).json({ message: 'Error updating mark' });
  }
});

// Delete an assessment
router.delete('/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const assessment = await Assessment.findById(assessmentId)
      .populate('course');

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Verify teacher owns the course
    if (assessment.course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this assessment' });
    }

    // Remove assessment from course
    await Course.findByIdAndUpdate(assessment.course._id, {
      $pull: { assessments: assessmentId }
    });

    await Assessment.findByIdAndDelete(assessmentId);

    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Assessment deletion error:', error);
    res.status(500).json({ message: 'Error deleting assessment' });
  }
});

module.exports = router;
