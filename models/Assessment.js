const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Formative', 'Summative'],
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 1
  },
  marks: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    comment: {
      type: String,
      trim: true,
      default: ''
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Assessment', assessmentSchema);
