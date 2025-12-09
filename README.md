# Student & Teacher Performance Tracker

A comprehensive web application for tracking student performance with beautiful gradient styling using colors #382B82 and #DF4AA9.

## Features

### Teacher Features
- **Dashboard**: View student counts across different levels (Level 3, 4, 5)
- **Course Management**: Create and manage courses for each level
- **Student Assignment**: Add/remove students from courses
- **Assessment Creation**: Create formative and summative assessments
- **Mark Entry**: Enter marks and comments for each student
- **Attendance Tracking**: Record and monitor student attendance per course
- **Performance Visualization**: Color-coded student performance indicators
  - 🟢 Green: 70% and above (Passing)
  - 🟡 Yellow: 60-69.9% (At Risk)
  - 🔴 Red: Below 60% (Failing)
- **Analytics & Reports**: Generate detailed performance reports and analytics
- **Bulk Import**: Import students and data via CSV files
- **Profile Management**: Manage personal profile and preferences

### Student Features
- **Read-only Dashboard**: View enrolled courses and performance
- **Performance Tracking**: See average marks and status for each course
- **Assessment History**: View all completed assessments with marks and teacher comments
- **Color-coded Status**: Visual indicators for performance levels
- **Notifications**: Receive real-time notifications for marks and course updates

### Parent Features
- **Student Monitoring**: Track multiple children's performance
- **Course Overview**: View enrolled courses and attendance
- **Performance Alerts**: Receive notifications for important updates

### Admin Features
- **User Management**: Create, manage, and delete users with role-based access
- **Invitations**: Send invitations to teachers, admins, and parents
- **Audit Logs**: Track all system activities and changes
- **Bulk Operations**: Import and manage bulk student/teacher data
- **System Reports**: Generate comprehensive system-wide reports
- **Backup & Recovery**: System data backup functionality

## Technology Stack

- **Frontend**: HTML, Tailwind CSS with custom gradient styling
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens with role-based access control
- **Email**: Nodemailer for email notifications and invitations
- **Security**: Helmet for HTTP security, bcryptjs for password hashing, express-rate-limit for request throttling
- **Data Import**: CSV parsing for bulk student/data import
- **PDF Generation**: PDFKit for report generation
- **Development**: Nodemon for hot reloading
- **Input Validation**: Express-validator for data validation

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Installation Steps

1. **Clone or download the project**
   ```bash
   cd Marks_tracking_system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
    Create a `.env` file in the root directory with the following content:
    ```
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/marks_tracking_system
    JWT_SECRET=your_jwt_secret_key_here_change_in_production
    NODE_ENV=development
    APP_URL=http://localhost:3000
    CORS_ORIGINS=http://localhost:3000
    
    # Teacher and Admin registration codes (required for privileged user registration)
    TEACHER_REG_CODE=your_teacher_registration_code
    ADMIN_REG_CODE=your_admin_registration_code
    
    # Email/SMTP Configuration (required for notifications and invitations)
    SMTP_HOST=your_smtp_host
    SMTP_PORT=587
    SMTP_SECURE=false
    SMTP_USER=your_email
    SMTP_PASS=your_password
    SMTP_FROM=noreply@markstrack.com
    ```
    
    See `.env.example` for a complete reference of all available configuration options.

4. **Start MongoDB**
   Make sure MongoDB is running on your system. If using MongoDB Atlas, update the `MONGODB_URI` in your `.env` file.

5. **Run the application**
   ```bash
   # For development (with nodemon)
   npm run dev
   
   # For production
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### For Teachers

1. **Register/Login**: Create a teacher account or login with existing credentials
2. **Dashboard**: View student counts across different levels
3. **Manage Levels**: Click on any level card to view and manage courses
4. **Create Courses**: Add new courses for each level
5. **Assign Students**: Add students to courses from the student list
6. **Create Assessments**: Add formative or summative assessments
7. **Enter Marks**: Input marks and comments for each student
8. **Monitor Performance**: View color-coded performance indicators

### For Students

1. **Register/Login**: Create a student account with your level (Level 3, 4, or 5)
2. **Dashboard**: View your enrolled courses and overall performance
3. **Course Details**: Click on courses to see detailed assessment history
4. **Performance Tracking**: Monitor your progress with color-coded status indicators

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration (student/parent)
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - User logout
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/verify-email` - Verify email address

### Teacher Routes
- `GET /api/teachers/dashboard` - Get dashboard data
- `POST /api/teachers/courses` - Create new course
- `GET /api/teachers/courses/:level` - Get courses by level
- `GET /api/teachers/courses/:courseId/students` - Get students with performance data
- `GET /api/teachers/profile` - Get teacher profile
- `PUT /api/teachers/profile` - Update teacher profile

### Assessment Routes
- `POST /api/assessments` - Create new assessment
- `GET /api/assessments/course/:courseId` - Get assessments for course
- `POST /api/assessments/:assessmentId/marks` - Enter marks for assessment
- `GET /api/assessments/:assessmentId` - Get assessment details

### Attendance Routes
- `POST /api/attendance` - Record attendance
- `GET /api/attendance/course/:courseId` - Get course attendance records
- `GET /api/attendance/student/:studentId` - Get student attendance records

### Student Routes
- `GET /api/students/dashboard` - Get student dashboard data
- `GET /api/students/courses/:courseId` - Get detailed course performance
- `GET /api/students/profile` - Get student profile

### Admin Routes
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:userId` - Update user
- `DELETE /api/admin/users/:userId` - Delete user
- `POST /api/admin/import` - Bulk import users from CSV
- `GET /api/admin/audit-logs` - Get system audit logs
- `POST /api/admin/backup` - Create system backup

### Notifications Routes
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification

### Analytics Routes
- `GET /api/analytics/performance` - Get performance analytics
- `GET /api/analytics/course/:courseId` - Get course analytics
- `POST /api/analytics/export` - Export analytics data

### Invitations Routes
- `POST /api/invitations` - Send invitation
- `GET /api/invitations/:token` - Get invitation details
- `POST /api/invitations/:token/accept` - Accept invitation

### Parent Routes
- `GET /api/parents/children` - Get parent's children
- `GET /api/parents/performance` - Get children's performance summary

## Database Schema

### User Model
- firstName, lastName, email, password
- role: 'teacher' | 'student' | 'admin' | 'parent'
- level: 'Level 3' | 'Level 4' | 'Level 5' (for students)
- courses: Array of course IDs
- emailVerified: Boolean
- isActive: Boolean
- lastLogin: Date
- children: Array of student user IDs (for parents)

### Course Model
- name, level
- academicYear: String
- term: '1st Term' | '2nd Term' | '3rd Term'
- teacher: User ID
- students: Array of student IDs
- assessments: Array of assessment IDs
- createdAt, updatedAt: Timestamps

### Assessment Model
- name, type: 'Formative' | 'Summative'
- course: Course ID
- academicYear: String
- term: String
- maxMarks: Number
- marks: Array of student marks with comments
- createdAt, updatedAt: Timestamps

### Attendance Model
- course: Course ID
- date: Date
- academicYear: String
- term: String
- recordedBy: Teacher User ID
- records: Array with student status (present/absent/late/excused)
- timestamps

### Notification Model
- recipient: User ID
- type: marks_posted | marks_updated | assessment_created | course_enrolled | announcement | system
- title, message: String
- data: Related course/assessment/score information
- isRead: Boolean
- timestamps with auto-delete after 90 days

### Invitation Model
- email: String
- role: 'teacher' | 'admin' | 'parent'
- invitedBy: Admin User ID
- token: String (unique)
- status: pending | accepted | expired | cancelled
- expiresAt: Date
- acceptedAt, acceptedBy: Dates/User ID

### Audit Log Model
- user: User ID
- action: User/course/assessment/system actions
- targetType: user | course | assessment | system | invitation
- targetId: Related entity ID
- details: Mixed data
- ipAddress, userAgent: Request metadata
- Auto-deletes after 1 year

## Color Scheme

The application uses a beautiful gradient color scheme:
- **Primary**: #382B82 (Deep Purple)
- **Secondary**: #DF4AA9 (Pink)
- **Gradient**: Linear gradient from primary to secondary
- **Status Colors**:
  - Green (#10B981): Passing (70%+)
  - Yellow (#F59E0B): At Risk (60-69.9%)
  - Red (#EF4444): Failing (<60%)

## Development

### Project Structure
```
Marks_tracking_system/
├── models/                          # MongoDB schemas
│   ├── User.js                      # User model (teacher, student, admin, parent)
│   ├── Course.js                    # Course model
│   ├── Assessment.js                # Assessment model
│   ├── AcademicYear.js              # Academic year configuration
│   ├── Attendance.js                # Attendance tracking
│   ├── Notification.js              # User notifications
│   ├── Invitation.js                # User invitations
│   └── AuditLog.js                  # System audit logs
├── routes/                          # API route handlers
│   ├── auth.js                      # Authentication endpoints
│   ├── teachers.js                  # Teacher routes
│   ├── students.js                  # Student routes
│   ├── parents.js                   # Parent routes
│   ├── admin.js                     # Admin routes
│   ├── courses.js                   # Course management
│   ├── assessments.js               # Assessment endpoints
│   ├── attendance.js                # Attendance tracking
│   ├── notifications.js             # Notification endpoints
│   ├── invitations.js               # Invitation endpoints
│   ├── analytics.js                 # Analytics endpoints
│   ├── reports.js                   # Report generation
│   ├── profile.js                   # User profile endpoints
│   └── backup.js                    # Backup endpoints
├── services/                        # Business logic layer
│   ├── email.js                     # Email sending service
│   ├── notifications.js             # Notification service
│   ├── analytics.js                 # Analytics service
│   ├── auditLog.js                  # Audit logging service
│   ├── bulkImport.js                # CSV import service
│   └── reportGenerator.js           # PDF report generation
├── middleware/                      # Express middleware
│   └── auth.js                      # JWT authentication & authorization
├── public/                          # Frontend files
│   ├── js/                          # JavaScript files
│   ├── index.html                   # Main dashboard
│   ├── accept-invitation.html       # Invitation acceptance page
│   └── verify-email.html            # Email verification page
├── config.js                        # Configuration loader
├── server.js                        # Express server setup
├── seed.js                          # Database seeding script
└── package.json                     # Dependencies
```

### Running in Development
```bash
npm run dev
```
This will start the server with nodemon for automatic restarts on file changes.

## Security Features

- **Password Security**: Bcryptjs for password hashing with salting
- **JWT Authentication**: Token-based authentication with expiration
- **Role-Based Access Control (RBAC)**: Four roles with distinct permissions (admin, teacher, student, parent)
- **Email Verification**: Email verification during registration
- **Rate Limiting**: Express-rate-limit to prevent brute force attacks
- **HTTP Security**: Helmet middleware for security headers
- **Input Validation**: Express-validator for data validation and sanitization
- **CORS Protection**: Configurable CORS origins
- **Audit Logging**: Complete audit trail of all system activities
- **Password Reset**: Secure password reset flow with email verification
- **Registration Codes**: Teacher and admin registration require special codes
- **Data Protection**: Sensitive data fields excluded from responses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support or questions, please create an issue in the repository or contact the development team.
