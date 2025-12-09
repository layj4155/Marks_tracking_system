const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#2c3e50',
  secondary: '#7f8c8d',
  success: '#27ae60',
  warning: '#f39c12',
  danger: '#e74c3c',
  light: '#ecf0f1',
  white: '#ffffff'
};

const getGradeColor = (percentage) => {
  if (percentage >= 70) return COLORS.success;
  if (percentage >= 60) return COLORS.warning;
  return COLORS.danger;
};

const getGradeLetter = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

const generateStudentReport = async (student, courses, academicYear, term) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24)
         .fillColor(COLORS.primary)
         .text('Marks Tracking System', { align: 'center' });
      
      doc.fontSize(16)
         .fillColor(COLORS.secondary)
         .text('Student Grade Report', { align: 'center' });
      
      doc.moveDown();
      
      // Student Info Box
      doc.rect(50, doc.y, 495, 80)
         .fillAndStroke(COLORS.light, COLORS.secondary);
      
      const infoY = doc.y + 15;
      doc.fillColor(COLORS.primary)
         .fontSize(12)
         .text(`Student: ${student.firstName} ${student.lastName}`, 70, infoY)
         .text(`Email: ${student.email}`, 70, infoY + 20)
         .text(`Level: ${student.level}`, 70, infoY + 40)
         .text(`Academic Year: ${academicYear}`, 350, infoY)
         .text(`Term: ${term}`, 350, infoY + 20)
         .text(`Generated: ${new Date().toLocaleDateString()}`, 350, infoY + 40);
      
      doc.y = infoY + 70;
      doc.moveDown();

      // Calculate overall stats
      let totalMarks = 0;
      let totalMaxMarks = 0;
      let totalAssessments = 0;

      courses.forEach(course => {
        course.assessments.forEach(assessment => {
          totalMarks += assessment.score;
          totalMaxMarks += assessment.maxMarks;
          totalAssessments++;
        });
      });

      const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;

      // Overall Summary
      doc.fontSize(14)
         .fillColor(COLORS.primary)
         .text('Overall Summary', { underline: true });
      doc.moveDown(0.5);
      
      doc.fontSize(11)
         .fillColor(COLORS.secondary)
         .text(`Total Courses: ${courses.length}`)
         .text(`Total Assessments: ${totalAssessments}`)
         .text(`Overall Marks: ${totalMarks} / ${totalMaxMarks}`);
      
      doc.fontSize(14)
         .fillColor(getGradeColor(overallPercentage))
         .text(`Overall Average: ${overallPercentage.toFixed(1)}% (${getGradeLetter(overallPercentage)})`);
      
      doc.moveDown();

      // Course Details
      doc.fontSize(14)
         .fillColor(COLORS.primary)
         .text('Course-wise Performance', { underline: true });
      doc.moveDown(0.5);

      courses.forEach((course, index) => {
        // Check if we need a new page
        if (doc.y > 650) {
          doc.addPage();
        }

        let courseTotal = 0;
        let courseMax = 0;
        course.assessments.forEach(a => {
          courseTotal += a.score;
          courseMax += a.maxMarks;
        });
        const coursePercentage = courseMax > 0 ? (courseTotal / courseMax) * 100 : 0;

        // Course header
        doc.fontSize(12)
           .fillColor(COLORS.primary)
           .text(`${index + 1}. ${course.name}`, { continued: true })
           .fillColor(getGradeColor(coursePercentage))
           .text(`  - ${coursePercentage.toFixed(1)}% (${getGradeLetter(coursePercentage)})`);
        
        doc.moveDown(0.3);

        // Assessment table header
        const tableTop = doc.y;
        const col1 = 70;
        const col2 = 250;
        const col3 = 350;
        const col4 = 420;

        doc.fontSize(10)
           .fillColor(COLORS.secondary)
           .text('Assessment', col1, tableTop)
           .text('Type', col2, tableTop)
           .text('Score', col3, tableTop)
           .text('Percentage', col4, tableTop);

        doc.moveTo(60, tableTop + 15)
           .lineTo(540, tableTop + 15)
           .stroke(COLORS.light);

        let rowY = tableTop + 20;
        
        course.assessments.forEach(assessment => {
          const percentage = (assessment.score / assessment.maxMarks) * 100;
          
          doc.fontSize(9)
             .fillColor(COLORS.primary)
             .text(assessment.name.substring(0, 30), col1, rowY)
             .text(assessment.type, col2, rowY)
             .text(`${assessment.score}/${assessment.maxMarks}`, col3, rowY)
             .fillColor(getGradeColor(percentage))
             .text(`${percentage.toFixed(1)}%`, col4, rowY);
          
          rowY += 15;
        });

        doc.y = rowY + 10;
        doc.moveDown(0.5);
      });

      // Footer
      doc.fontSize(8)
         .fillColor(COLORS.secondary)
         .text('This is an official grade report generated by the Marks Tracking System.', 50, 750, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const generateClassReport = async (course, students, assessments, academicYear, term) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        layout: 'landscape'
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20)
         .fillColor(COLORS.primary)
         .text('Marks Tracking System', { align: 'center' });
      
      doc.fontSize(14)
         .fillColor(COLORS.secondary)
         .text('Class Performance Report', { align: 'center' });
      
      doc.moveDown();

      // Course Info
      doc.fontSize(12)
         .fillColor(COLORS.primary)
         .text(`Course: ${course.name}`)
         .text(`Level: ${course.level}`)
         .text(`Academic Year: ${academicYear} | Term: ${term}`)
         .text(`Total Students: ${students.length} | Total Assessments: ${assessments.length}`);
      
      doc.moveDown();

      // Class Statistics
      let classTotal = 0;
      let classMax = 0;
      let passCount = 0;

      students.forEach(student => {
        let studentTotal = 0;
        let studentMax = 0;

        assessments.forEach(assessment => {
          const mark = assessment.marks.find(m => 
            m.student._id.toString() === student._id.toString()
          );
          if (mark) {
            studentTotal += mark.score;
            studentMax += assessment.maxMarks;
          }
        });

        classTotal += studentTotal;
        classMax += studentMax;
        
        const studentPercentage = studentMax > 0 ? (studentTotal / studentMax) * 100 : 0;
        if (studentPercentage >= 50) passCount++;
      });

      const classAverage = classMax > 0 ? (classTotal / classMax) * 100 : 0;
      const passRate = students.length > 0 ? (passCount / students.length) * 100 : 0;

      doc.fontSize(11)
         .fillColor(COLORS.secondary)
         .text(`Class Average: ${classAverage.toFixed(1)}%`, { continued: true })
         .text(`  |  Pass Rate: ${passRate.toFixed(1)}%`);
      
      doc.moveDown();

      // Student Performance Table
      doc.fontSize(12)
         .fillColor(COLORS.primary)
         .text('Student Performance', { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const colWidth = 80;
      let col = 50;

      // Table headers
      doc.fontSize(9)
         .fillColor(COLORS.secondary)
         .text('Student Name', col, tableTop);
      col += 120;

      assessments.slice(0, 6).forEach(assessment => {
        doc.text(assessment.name.substring(0, 10), col, tableTop);
        col += colWidth;
      });
      
      doc.text('Total', col, tableTop);
      col += 60;
      doc.text('Avg %', col, tableTop);
      col += 50;
      doc.text('Grade', col, tableTop);

      doc.moveTo(50, tableTop + 15)
         .lineTo(740, tableTop + 15)
         .stroke(COLORS.light);

      let rowY = tableTop + 20;

      students.forEach(student => {
        if (rowY > 500) {
          doc.addPage();
          rowY = 50;
        }

        col = 50;
        let studentTotal = 0;
        let studentMax = 0;

        doc.fontSize(8)
           .fillColor(COLORS.primary)
           .text(`${student.firstName} ${student.lastName}`.substring(0, 18), col, rowY);
        col += 120;

        assessments.slice(0, 6).forEach(assessment => {
          const mark = assessment.marks.find(m => 
            m.student._id.toString() === student._id.toString()
          );
          const score = mark ? mark.score : 0;
          studentTotal += score;
          studentMax += assessment.maxMarks;
          
          doc.text(`${score}/${assessment.maxMarks}`, col, rowY);
          col += colWidth;
        });

        const percentage = studentMax > 0 ? (studentTotal / studentMax) * 100 : 0;
        
        doc.text(`${studentTotal}/${studentMax}`, col, rowY);
        col += 60;
        doc.fillColor(getGradeColor(percentage))
           .text(`${percentage.toFixed(1)}%`, col, rowY);
        col += 50;
        doc.text(getGradeLetter(percentage), col, rowY);

        rowY += 15;
      });

      // Footer
      doc.fontSize(8)
         .fillColor(COLORS.secondary)
         .text(`Generated: ${new Date().toLocaleString()}`, 50, 550, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateStudentReport,
  generateClassReport,
  getGradeLetter,
  getGradeColor
};
