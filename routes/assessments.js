const express = require('express');
const { body, validationResult } = require('express-validator');
const Assessment = require('../models/Assessment');
const Course = require('../models/Course');
const { auth, requireRole } = require('../middleware/auth');
const { notifyMarksPosted, notifyMarksUpdated, notifyAssessmentCreated } = require('../services/notifications');

const router = express.Router();

// Apply authentication and teacher role check to all routes
router.use(auth);
router.use(requireRole(['teacher']));

// Create a new assessment
router.post('/', [
  body('name').trim().notEmpty().withMessage('Assessment name is required'),
  body('type').isIn(['Formative', 'Summative', 'Integrated']).withMessage('Type must be Formative, Summative, or Integrated'),
  body('courseId').isMongoId().withMessage('Valid course ID is required'),
  body('maxMarks').isNumeric().isFloat({ min: 1 }).withMessage('Max marks must be a positive number'),
  body('academicYear').notEmpty().withMessage('Academic year is required'),
  body('term').isIn(['1st Term', '2nd Term', '3rd Term']).withMessage('Valid term is required'),
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

    const { name, type, courseId, maxMarks, marks, academicYear, term } = req.body;

    // Verify course exists and teacher owns it
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to create assessment for this course' });
    }

    // Get all students in the course
    const courseWithStudents = await Course.findById(courseId).populate('students');
    
    // Build marks array - use provided marks or initialize all students with 0
    let assessmentMarks = [];
    
    if (Array.isArray(marks) && marks.length > 0) {
      // If marks are provided, use them
      assessmentMarks = marks.map(m => ({
        student: m.studentId,
        score: Math.min(Number(m.score || 0), Number(maxMarks)),
        comment: m.comment || ''
      }));
      
      // Add any missing students with 0 marks
      const markedStudentIds = marks.map(m => m.studentId);
      const unmarkedStudents = courseWithStudents.students.filter(
        s => !markedStudentIds.includes(s._id.toString())
      );
      
      unmarkedStudents.forEach(student => {
        assessmentMarks.push({
          student: student._id,
          score: 0,
          comment: 'Marks pending'
        });
      });
    } else {
      // No marks provided, initialize all students with 0
      assessmentMarks = courseWithStudents.students.map(student => ({
        student: student._id,
        score: 0,
        comment: 'Marks pending'
      }));
    }
    
    const assessment = new Assessment({
      name,
      type,
      course: courseId,
      maxMarks,
      academicYear,
      term,
      marks: assessmentMarks
    });

    await assessment.save();

    // Add assessment to course
    course.assessments.push(assessment._id);
    await course.save();

    // Notify students about new assessment
    const studentIds = courseWithStudents.students.map(s => s._id);
    if (studentIds.length > 0) {
      notifyAssessmentCreated(studentIds, course, assessment).catch(err => 
        console.error('Error sending assessment notifications:', err)
      );
    }

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
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view assessments for this course' });
    }

    const assessments = await Assessment.find({ course: courseId })
      .populate('marks.student', 'firstName lastName email')
      .lean();

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

    // Notify students about their marks
    const studentIds = marks.map(m => m.studentId);
    notifyMarksPosted(studentIds, assessment.course, assessment, assessment.marks).catch(err =>
      console.error('Error sending marks notifications:', err)
    );

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

// Update all marks for an assessment
router.put('/:assessmentId/marks', [
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
      return res.status(403).json({ message: 'Not authorized to update marks for this assessment' });
    }

    // Update marks
    assessment.marks = marks.map(markData => ({
      student: markData.studentId,
      score: Math.min(Number(markData.score || 0), Number(assessment.maxMarks)),
      comment: markData.comment || ''
    }));

    await assessment.save();

    res.json({ message: 'Marks updated successfully', assessment });
  } catch (error) {
    console.error('Marks update error:', error);
    res.status(500).json({ message: 'Error updating marks' });
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

    // Notify student about updated mark
    notifyMarksUpdated(studentId, assessment.course, assessment, score).catch(err =>
      console.error('Error sending mark update notification:', err)
    );

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
