const Notification = require('../models/Notification');

const createNotification = async ({ recipient, type, title, message, data = {} }) => {
  try {
    const notification = new Notification({
      recipient,
      type,
      title,
      message,
      data
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

const createBulkNotifications = async (notifications) => {
  try {
    const result = await Notification.insertMany(notifications);
    return result;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    return [];
  }
};

const notifyMarksPosted = async (studentIds, course, assessment, marks) => {
  const notifications = studentIds.map(studentId => {
    const studentMark = marks.find(m => m.student.toString() === studentId.toString());
    const score = studentMark ? studentMark.score : 0;
    
    return {
      recipient: studentId,
      type: 'marks_posted',
      title: 'New Marks Posted',
      message: `Your marks for "${assessment.name}" in ${course.name} have been posted. You scored ${score}/${assessment.maxMarks}.`,
      data: {
        courseId: course._id,
        assessmentId: assessment._id,
        score,
        maxMarks: assessment.maxMarks
      }
    };
  });

  return createBulkNotifications(notifications);
};

const notifyMarksUpdated = async (studentId, course, assessment, score) => {
  return createNotification({
    recipient: studentId,
    type: 'marks_updated',
    title: 'Marks Updated',
    message: `Your marks for "${assessment.name}" in ${course.name} have been updated to ${score}/${assessment.maxMarks}.`,
    data: {
      courseId: course._id,
      assessmentId: assessment._id,
      score,
      maxMarks: assessment.maxMarks
    }
  });
};

const notifyAssessmentCreated = async (studentIds, course, assessment) => {
  const notifications = studentIds.map(studentId => ({
    recipient: studentId,
    type: 'assessment_created',
    title: 'New Assessment',
    message: `A new ${assessment.type} assessment "${assessment.name}" has been created for ${course.name}.`,
    data: {
      courseId: course._id,
      assessmentId: assessment._id,
      maxMarks: assessment.maxMarks
    }
  }));

  return createBulkNotifications(notifications);
};

const notifyCourseEnrolled = async (studentId, course) => {
  return createNotification({
    recipient: studentId,
    type: 'course_enrolled',
    title: 'Course Enrollment',
    message: `You have been enrolled in "${course.name}".`,
    data: {
      courseId: course._id
    }
  });
};

const sendAnnouncement = async (recipientIds, title, message) => {
  const notifications = recipientIds.map(recipientId => ({
    recipient: recipientId,
    type: 'announcement',
    title,
    message
  }));

  return createBulkNotifications(notifications);
};

module.exports = {
  createNotification,
  createBulkNotifications,
  notifyMarksPosted,
  notifyMarksUpdated,
  notifyAssessmentCreated,
  notifyCourseEnrolled,
  sendAnnouncement
};
