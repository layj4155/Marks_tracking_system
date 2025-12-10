require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set');
  process.exit(1);
}

if (!process.env.TEACHER_REG_CODE || !process.env.ADMIN_REG_CODE) {
  console.warn('WARNING: TEACHER_REG_CODE or ADMIN_REG_CODE not set. Privileged registration will fail.');
}

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/marks_tracking_system',
  jwtSecret: process.env.JWT_SECRET,
  corsOrigins: (process.env.CORS_ORIGINS || 'https://eduanalyze.vercel.app/,http://localhost:3000').split(',').map(s => s.trim()),
  teacherRegCode: process.env.TEACHER_REG_CODE,
  adminRegCode: process.env.ADMIN_REG_CODE,
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'noreply@markstrack.com'
  }
};
