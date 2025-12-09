const User = require('../models/User');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');

const getGradeLetter = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

const getCourseAnalytics = async (courseId, academicYear, term) => {
  const assessments = await Assessment.find({
    course: courseId,
    academicYear,
    term
  }).populate('marks.student', 'firstName lastName').lean();

  const course = await Course.findById(courseId)
    .populate('students', 'firstName lastName')
    .lean();

  if (!course || assessments.length === 0) {
    return null;
  }

  // Calculate per-student performance
  const studentPerformance = course.students.map(student => {
    let totalScore = 0;
    let totalMaxMarks = 0;
    const assessmentScores = [];

    assessments.forEach(assessment => {
      const mark = assessment.marks.find(m => 
        m.student._id.toString() === student._id.toString()
      );
      const score = mark ? mark.score : 0;
      totalScore += score;
      totalMaxMarks += assessment.maxMarks;
      assessmentScores.push({
        name: assessment.name,
        score,
        maxMarks: assessment.maxMarks,
        percentage: (score / assessment.maxMarks) * 100
      });
    });

    const percentage = totalMaxMarks > 0 ? (totalScore / totalMaxMarks) * 100 : 0;

    return {
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`
      },
      totalScore,
      totalMaxMarks,
      percentage,
      grade: getGradeLetter(percentage),
      assessmentScores
    };
  });

  // Sort by percentage descending
  studentPerformance.sort((a, b) => b.percentage - a.percentage);

  // Calculate class statistics
  const percentages = studentPerformance.map(s => s.percentage);
  const classAverage = percentages.length > 0 
    ? percentages.reduce((a, b) => a + b, 0) / percentages.length 
    : 0;
  const highest = Math.max(...percentages, 0);
  const lowest = Math.min(...percentages, 0);
  const passCount = percentages.filter(p => p >= 50).length;
  const passRate = percentages.length > 0 ? (passCount / percentages.length) * 100 : 0;

  // Grade distribution
  const gradeDistribution = {
    'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0
  };
  studentPerformance.forEach(s => {
    gradeDistribution[s.grade]++;
  });

  // Assessment-wise statistics
  const assessmentStats = assessments.map(assessment => {
    const scores = assessment.marks.map(m => m.score);
    const avgScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;
    const avgPercentage = (avgScore / assessment.maxMarks) * 100;

    return {
      id: assessment._id,
      name: assessment.name,
      type: assessment.type,
      maxMarks: assessment.maxMarks,
      averageScore: Math.round(avgScore * 100) / 100,
      averagePercentage: Math.round(avgPercentage * 100) / 100,
      highestScore: Math.max(...scores, 0),
      lowestScore: Math.min(...scores, 0),
      submissionCount: scores.length
    };
  });

  // Score range distribution (for histogram)
  const scoreRanges = {
    '0-20': 0,
    '21-40': 0,
    '41-60': 0,
    '61-80': 0,
    '81-100': 0
  };
  percentages.forEach(p => {
    if (p <= 20) scoreRanges['0-20']++;
    else if (p <= 40) scoreRanges['21-40']++;
    else if (p <= 60) scoreRanges['41-60']++;
    else if (p <= 80) scoreRanges['61-80']++;
    else scoreRanges['81-100']++;
  });

  return {
    course: {
      id: course._id,
      name: course.name,
      level: course.level
    },
    academicYear,
    term,
    summary: {
      totalStudents: course.students.length,
      totalAssessments: assessments.length,
      classAverage: Math.round(classAverage * 100) / 100,
      highestPercentage: Math.round(highest * 100) / 100,
      lowestPercentage: Math.round(lowest * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      passCount,
      failCount: percentages.length - passCount
    },
    gradeDistribution,
    scoreRanges,
    assessmentStats,
    studentPerformance,
    topPerformers: studentPerformance.slice(0, 5),
    atRiskStudents: studentPerformance.filter(s => s.percentage < 50)
  };
};

const getStudentAnalytics = async (studentId, academicYear, term) => {
  const student = await User.findById(studentId).lean();
  if (!student || student.role !== 'student') {
    return null;
  }

  const courses = await Course.find({ students: studentId }).lean();
  
  const coursePerformance = await Promise.all(courses.map(async (course) => {
    const assessments = await Assessment.find({
      course: course._id,
      academicYear,
      term
    }).lean();

    let totalScore = 0;
    let totalMaxMarks = 0;
    const assessmentDetails = [];

    assessments.forEach(assessment => {
      const mark = assessment.marks.find(m => 
        m.student.toString() === studentId.toString()
      );
      const score = mark ? mark.score : 0;
      totalScore += score;
      totalMaxMarks += assessment.maxMarks;
      
      assessmentDetails.push({
        name: assessment.name,
        type: assessment.type,
        score,
        maxMarks: assessment.maxMarks,
        percentage: (score / assessment.maxMarks) * 100,
        date: assessment.createdAt
      });
    });

    const percentage = totalMaxMarks > 0 ? (totalScore / totalMaxMarks) * 100 : 0;

    return {
      course: {
        id: course._id,
        name: course.name,
        level: course.level
      },
      totalScore,
      totalMaxMarks,
      percentage: Math.round(percentage * 100) / 100,
      grade: getGradeLetter(percentage),
      assessmentCount: assessments.length,
      assessments: assessmentDetails.sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  }));

  // Filter courses with assessments
  const activeCourses = coursePerformance.filter(c => c.assessmentCount > 0);

  // Calculate overall statistics
  const totalScore = activeCourses.reduce((sum, c) => sum + c.totalScore, 0);
  const totalMaxMarks = activeCourses.reduce((sum, c) => sum + c.totalMaxMarks, 0);
  const overallPercentage = totalMaxMarks > 0 ? (totalScore / totalMaxMarks) * 100 : 0;

  // Performance by type
  const formativeScores = [];
  const summativeScores = [];
  
  activeCourses.forEach(c => {
    c.assessments.forEach(a => {
      if (a.type === 'Formative') {
        formativeScores.push(a.percentage);
      } else {
        summativeScores.push(a.percentage);
      }
    });
  });

  const avgFormative = formativeScores.length > 0 
    ? formativeScores.reduce((a, b) => a + b, 0) / formativeScores.length 
    : 0;
  const avgSummative = summativeScores.length > 0 
    ? summativeScores.reduce((a, b) => a + b, 0) / summativeScores.length 
    : 0;

  return {
    student: {
      id: student._id,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      level: student.level
    },
    academicYear,
    term,
    summary: {
      totalCourses: activeCourses.length,
      totalAssessments: activeCourses.reduce((sum, c) => sum + c.assessmentCount, 0),
      overallPercentage: Math.round(overallPercentage * 100) / 100,
      overallGrade: getGradeLetter(overallPercentage),
      averageFormative: Math.round(avgFormative * 100) / 100,
      averageSummative: Math.round(avgSummative * 100) / 100
    },
    coursePerformance: activeCourses.sort((a, b) => b.percentage - a.percentage),
    strongestCourse: activeCourses.length > 0 ? activeCourses[0] : null,
    weakestCourse: activeCourses.length > 0 ? activeCourses[activeCourses.length - 1] : null
  };
};

const getLevelAnalytics = async (level, academicYear, term) => {
  const courses = await Course.find({ level }).lean();
  const students = await User.find({ role: 'student', level }).lean();

  const courseAnalytics = await Promise.all(
    courses.map(c => getCourseAnalytics(c._id, academicYear, term))
  );

  const validAnalytics = courseAnalytics.filter(a => a !== null);

  // Aggregate statistics
  const allAverages = validAnalytics.map(a => a.summary.classAverage);
  const levelAverage = allAverages.length > 0 
    ? allAverages.reduce((a, b) => a + b, 0) / allAverages.length 
    : 0;

  const totalPass = validAnalytics.reduce((sum, a) => sum + a.summary.passCount, 0);
  const totalStudents = validAnalytics.reduce((sum, a) => sum + a.summary.totalStudents, 0);
  const overallPassRate = totalStudents > 0 ? (totalPass / totalStudents) * 100 : 0;

  return {
    level,
    academicYear,
    term,
    summary: {
      totalStudents: students.length,
      totalCourses: courses.length,
      coursesWithData: validAnalytics.length,
      levelAverage: Math.round(levelAverage * 100) / 100,
      overallPassRate: Math.round(overallPassRate * 100) / 100
    },
    courseBreakdown: validAnalytics.map(a => ({
      course: a.course,
      average: a.summary.classAverage,
      passRate: a.summary.passRate,
      studentCount: a.summary.totalStudents
    }))
  };
};

const getStudentTrends = async (studentId, academicYear) => {
  const student = await User.findById(studentId).lean();
  if (!student || student.role !== 'student') {
    return null;
  }

  const terms = ['1st Term', '2nd Term', '3rd Term'];
  const courses = await Course.find({ students: studentId }).lean();

  const termData = await Promise.all(terms.map(async (term) => {
    let totalScore = 0;
    let totalMaxMarks = 0;
    let assessmentCount = 0;

    for (const course of courses) {
      const assessments = await Assessment.find({
        course: course._id,
        academicYear,
        term
      }).lean();

      assessments.forEach(assessment => {
        const mark = assessment.marks.find(m => 
          m.student.toString() === studentId.toString()
        );
        if (mark) {
          totalScore += mark.score;
          totalMaxMarks += assessment.maxMarks;
          assessmentCount++;
        }
      });
    }

    const percentage = totalMaxMarks > 0 ? (totalScore / totalMaxMarks) * 100 : null;

    return {
      term,
      percentage: percentage !== null ? Math.round(percentage * 100) / 100 : null,
      grade: percentage !== null ? getGradeLetter(percentage) : null,
      assessmentCount
    };
  }));

  return {
    student: {
      id: student._id,
      name: `${student.firstName} ${student.lastName}`,
      level: student.level
    },
    academicYear,
    trends: termData,
    improvement: calculateImprovement(termData)
  };
};

const calculateImprovement = (termData) => {
  const validTerms = termData.filter(t => t.percentage !== null);
  if (validTerms.length < 2) return null;

  const first = validTerms[0].percentage;
  const last = validTerms[validTerms.length - 1].percentage;
  const change = last - first;

  return {
    firstTerm: first,
    lastTerm: last,
    change: Math.round(change * 100) / 100,
    trend: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable'
  };
};

const getTeacherPerformance = async (teacherId, academicYear, term) => {
  const teacher = await User.findById(teacherId).lean();
  if (!teacher || teacher.role !== 'teacher') {
    return null;
  }

  const courses = await Course.find({ teacher: teacherId })
    .populate('students', 'firstName lastName')
    .lean();

  const courseStats = await Promise.all(courses.map(async (course) => {
    const assessments = await Assessment.find({
      course: course._id,
      academicYear,
      term
    }).lean();

    if (assessments.length === 0) {
      return null;
    }

    let totalScore = 0;
    let totalMaxMarks = 0;
    let passCount = 0;
    const studentPercentages = [];

    course.students.forEach(student => {
      let studentTotal = 0;
      let studentMax = 0;

      assessments.forEach(assessment => {
        const mark = assessment.marks.find(m => 
          m.student.toString() === student._id.toString()
        );
        if (mark) {
          studentTotal += mark.score;
          studentMax += assessment.maxMarks;
        }
      });

      if (studentMax > 0) {
        const percentage = (studentTotal / studentMax) * 100;
        studentPercentages.push(percentage);
        totalScore += studentTotal;
        totalMaxMarks += studentMax;
        if (percentage >= 50) passCount++;
      }
    });

    const classAverage = studentPercentages.length > 0 
      ? studentPercentages.reduce((a, b) => a + b, 0) / studentPercentages.length 
      : 0;

    return {
      course: {
        id: course._id,
        name: course.name,
        level: course.level
      },
      studentCount: course.students.length,
      assessmentCount: assessments.length,
      classAverage: Math.round(classAverage * 100) / 100,
      passRate: studentPercentages.length > 0 
        ? Math.round((passCount / studentPercentages.length) * 100 * 100) / 100 
        : 0,
      passCount,
      failCount: studentPercentages.length - passCount
    };
  }));

  const validStats = courseStats.filter(s => s !== null);

  // Aggregate teacher stats
  const allAverages = validStats.map(s => s.classAverage);
  const overallAverage = allAverages.length > 0 
    ? allAverages.reduce((a, b) => a + b, 0) / allAverages.length 
    : 0;

  const totalStudents = validStats.reduce((sum, s) => sum + s.studentCount, 0);
  const totalPass = validStats.reduce((sum, s) => sum + s.passCount, 0);
  const totalFail = validStats.reduce((sum, s) => sum + s.failCount, 0);

  return {
    teacher: {
      id: teacher._id,
      name: `${teacher.firstName} ${teacher.lastName}`,
      email: teacher.email
    },
    academicYear,
    term,
    summary: {
      totalCourses: courses.length,
      coursesWithData: validStats.length,
      totalStudents,
      overallAverage: Math.round(overallAverage * 100) / 100,
      overallPassRate: (totalPass + totalFail) > 0 
        ? Math.round((totalPass / (totalPass + totalFail)) * 100 * 100) / 100 
        : 0,
      totalAssessments: validStats.reduce((sum, s) => sum + s.assessmentCount, 0)
    },
    courseBreakdown: validStats,
    performanceRating: getPerformanceRating(overallAverage)
  };
};

const getPerformanceRating = (average) => {
  if (average >= 75) return { rating: 'Excellent', color: 'green' };
  if (average >= 65) return { rating: 'Good', color: 'blue' };
  if (average >= 55) return { rating: 'Satisfactory', color: 'yellow' };
  if (average >= 45) return { rating: 'Needs Improvement', color: 'orange' };
  return { rating: 'Critical', color: 'red' };
};

const getAllTeachersPerformance = async (academicYear, term) => {
  const teachers = await User.find({ role: 'teacher' }).lean();

  const performances = await Promise.all(
    teachers.map(t => getTeacherPerformance(t._id, academicYear, term))
  );

  const validPerformances = performances.filter(p => p !== null && p.summary.coursesWithData > 0);

  // Rank by average
  validPerformances.sort((a, b) => b.summary.overallAverage - a.summary.overallAverage);

  return {
    academicYear,
    term,
    totalTeachers: teachers.length,
    teachersWithData: validPerformances.length,
    rankings: validPerformances.map((p, index) => ({
      rank: index + 1,
      teacher: p.teacher,
      average: p.summary.overallAverage,
      passRate: p.summary.overallPassRate,
      studentCount: p.summary.totalStudents,
      courseCount: p.summary.coursesWithData,
      rating: p.performanceRating
    }))
  };
};

module.exports = {
  getCourseAnalytics,
  getStudentAnalytics,
  getLevelAnalytics,
  getStudentTrends,
  getTeacherPerformance,
  getAllTeachersPerformance,
  getGradeLetter
};
