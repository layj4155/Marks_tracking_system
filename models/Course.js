const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    enum: ['Level 3', 'Level 4', 'Level 5'],
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assessments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment'
  }]
}, {
  timestamps: true
});

// Indexes for common queries
courseSchema.index({ level: 1 });
courseSchema.index({ teacher: 1 });
courseSchema.index({ students: 1 });
courseSchema.index({ level: 1, teacher: 1 });

module.exports = mongoose.model('Course', courseSchema);
