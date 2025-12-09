const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['teacher', 'student', 'admin', 'parent'],
    required: true
  },
  level: {
    type: String,
    enum: ['Level 3', 'Level 4', 'Level 5'],
    required: function() {
      return this.role === 'student';
    }
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  currentAcademicYear: {
    type: String,
    default: function() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      if (month >= 9) {
        return `${year}-${year + 1}`;
      } else {
        return `${year - 1}-${year}`;
      }
    }
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date,
    select: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

// Hash password before saving (skip if already hashed)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Skip hashing if password is already a bcrypt hash
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes for common queries (email already has unique index)
userSchema.index({ role: 1 });
userSchema.index({ level: 1 });
userSchema.index({ role: 1, level: 1 });
userSchema.index({ courses: 1 });

module.exports = mongoose.model('User', userSchema);
