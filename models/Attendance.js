const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true
  },
  note: {
    type: String,
    trim: true
  }
});

const attendanceSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false
  },
  levelAttendance: {
    type: String
  },
  date: {
    type: Date,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  term: {
    type: String,
    enum: ['1st Term', '2nd Term', '3rd Term'],
    required: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  records: [attendanceRecordSchema]
}, {
  timestamps: true
});

// Indexes
attendanceSchema.index({ course: 1, date: 1 }, { unique: true, sparse: true });
attendanceSchema.index({ course: 1, academicYear: 1, term: 1 });
attendanceSchema.index({ 'records.student': 1 });
attendanceSchema.index({ date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
