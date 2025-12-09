const { parse } = require('csv-parse/sync');
const User = require('../models/User');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const parseCSV = (csvContent) => {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    return { success: true, records };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const importStudents = async (csvContent) => {
  const result = {
    success: [],
    errors: [],
    total: 0
  };

  const parseResult = parseCSV(csvContent);
  if (!parseResult.success) {
    return { error: `CSV Parse Error: ${parseResult.error}` };
  }

  const records = parseResult.records;
  result.total = records.length;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // Account for header row

    try {
      // Validate required fields
      const firstName = row.firstName || row.first_name || row.FirstName;
      const lastName = row.lastName || row.last_name || row.LastName;
      const email = row.email || row.Email;
      const level = row.level || row.Level;

      if (!firstName || !lastName || !email || !level) {
        result.errors.push({
          row: rowNum,
          email: email || 'N/A',
          error: 'Missing required fields (firstName, lastName, email, level)'
        });
        continue;
      }

      // Validate level
      const validLevels = ['Level 3', 'Level 4', 'Level 5'];
      if (!validLevels.includes(level)) {
        result.errors.push({
          row: rowNum,
          email,
          error: `Invalid level "${level}". Must be one of: ${validLevels.join(', ')}`
        });
        continue;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        result.errors.push({
          row: rowNum,
          email,
          error: 'User with this email already exists'
        });
        continue;
      }

      // Generate password
      const password = generatePassword();

      // Create user
      const user = new User({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password,
        role: 'student',
        level,
        isEmailVerified: false
      });

      await user.save();

      // Auto-enroll in courses for this level
      const courses = await Course.find({ level });
      if (courses.length > 0) {
        const courseIds = courses.map(c => c._id);
        
        await Course.updateMany(
          { _id: { $in: courseIds } },
          { $addToSet: { students: user._id } }
        );
        
        user.courses = courseIds;
        await user.save();

        // Add to existing assessments
        const assessments = await Assessment.find({ course: { $in: courseIds } });
        const ops = assessments.map(assessment => ({
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
        }));
        
        if (ops.length > 0) {
          await Assessment.bulkWrite(ops);
        }
      }

      result.success.push({
        row: rowNum,
        email,
        firstName,
        lastName,
        level,
        temporaryPassword: password,
        coursesEnrolled: courses.length
      });

    } catch (error) {
      result.errors.push({
        row: rowNum,
        email: row.email || 'N/A',
        error: error.message
      });
    }
  }

  return result;
};

const importTeachers = async (csvContent) => {
  const result = {
    success: [],
    errors: [],
    total: 0
  };

  const parseResult = parseCSV(csvContent);
  if (!parseResult.success) {
    return { error: `CSV Parse Error: ${parseResult.error}` };
  }

  const records = parseResult.records;
  result.total = records.length;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2;

    try {
      const firstName = row.firstName || row.first_name || row.FirstName;
      const lastName = row.lastName || row.last_name || row.LastName;
      const email = row.email || row.Email;

      if (!firstName || !lastName || !email) {
        result.errors.push({
          row: rowNum,
          email: email || 'N/A',
          error: 'Missing required fields (firstName, lastName, email)'
        });
        continue;
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        result.errors.push({
          row: rowNum,
          email,
          error: 'User with this email already exists'
        });
        continue;
      }

      const password = generatePassword();

      const user = new User({
        firstName,
        lastName,
        email: email.toLowerCase(),
        password,
        role: 'teacher',
        isEmailVerified: false
      });

      await user.save();

      result.success.push({
        row: rowNum,
        email,
        firstName,
        lastName,
        temporaryPassword: password
      });

    } catch (error) {
      result.errors.push({
        row: rowNum,
        email: row.email || 'N/A',
        error: error.message
      });
    }
  }

  return result;
};

const getCSVTemplate = (type) => {
  if (type === 'students') {
    return 'firstName,lastName,email,level\nJohn,Doe,john.doe@example.com,Level 3\nJane,Smith,jane.smith@example.com,Level 4';
  } else if (type === 'teachers') {
    return 'firstName,lastName,email\nAlice,Johnson,alice.johnson@example.com\nBob,Williams,bob.williams@example.com';
  }
  return '';
};

module.exports = {
  importStudents,
  importTeachers,
  getCSVTemplate,
  parseCSV
};
