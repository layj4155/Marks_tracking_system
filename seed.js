const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import Models
const User = require('./models/User');
const Course = require('./models/Course');
const Assessment = require('./models/Assessment');

// Convert MongoDB Extended JSON format to normal format
function convertExtendedJSON(data) {
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  
  return JSON.parse(data, (key, value) => {
    if (value && typeof value === 'object') {
      // Convert ObjectId format
      if ('$oid' in value) {
        return new mongoose.Types.ObjectId(value.$oid);
      }
      // Convert Date format
      if ('$date' in value) {
        return new Date(value.$date);
      }
    }
    return value;
  });
}

async function seedDatabase() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marks_tracking_system';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Read JSON files
    const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'marks_tracking_system.users.json'), 'utf8'));
    const coursesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'marks_tracking_system.courses.json'), 'utf8'));
    const assessmentsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'marks_tracking_system.assessments.json'), 'utf8'));

    // Convert Extended JSON to normal format
    const users = convertExtendedJSON(usersData);
    const courses = convertExtendedJSON(coursesData);
    const assessments = convertExtendedJSON(assessmentsData);

    // Clear existing collections
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Course.deleteMany({});
    await Assessment.deleteMany({});

    // Insert data
    console.log('Seeding users...');
    await User.insertMany(users);
    console.log(`Inserted ${users.length} users`);

    console.log('Seeding courses...');
    await Course.insertMany(courses);
    console.log(`Inserted ${courses.length} courses`);

    console.log('Seeding assessments...');
    await Assessment.insertMany(assessments);
    console.log(`Inserted ${assessments.length} assessments`);

    console.log('Database seeded successfully!');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
