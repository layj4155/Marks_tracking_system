const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  year: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  currentTerm: {
    type: String,
    enum: ['1st Term', '2nd Term', '3rd Term'],
    default: '1st Term'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AcademicYear', academicYearSchema);
