# Student & Teacher Performance Tracker

A comprehensive web application for tracking student performance with beautiful gradient styling using colors #382B82 and #DF4AA9.

## Features

### Teacher Features
-**Before Accessing Dashboard** Teacher have to select the Academic year and Term
- **Dashboard**: View student counts across different levels (Level 3, 4, 5)
- **Course Management**: Create and manage courses for each level
- **Student Assignment**: Add/remove students from courses
- **Assessment Creation**: Create formative and summative assessments
- **Mark Entry**: Enter marks and comments for each student
- **Performance Visualization**: Color-coded student performance indicators
  - 🟢 Green: 70% and above (Passing)
  - 🟡 Yellow: 60-69.9% (At Risk)
  - 🔴 Red: Below 60% (Failing)

### Student Features
-**Before Accessing Dashboard** Student have to select the Academic year and Term
- **Read-only Dashboard**: View enrolled courses and performance
- **Performance Tracking**: See average marks and status for each course
- **Assessment History**: View all completed assessments with marks and teacher comments
- **Color-coded Status**: Visual indicators for performance levels

## Technology Stack

- **Frontend**: HTML, Tailwind CSS with custom gradient styling
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens
- **Development**: Nodemon for hot reloading

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
   ```

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
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Teacher Routes
- `GET /api/teachers/dashboard` - Get dashboard data
- `POST /api/teachers/courses` - Create new course
- `GET /api/teachers/courses/:level` - Get courses by level
- `GET /api/teachers/courses/:courseId/students` - Get students with performance data

### Assessment Routes
- `POST /api/assessments` - Create new assessment
- `GET /api/assessments/course/:courseId` - Get assessments for course
- `POST /api/assessments/:assessmentId/marks` - Enter marks for assessment

### Student Routes
- `GET /api/students/dashboard` - Get student dashboard data
- `GET /api/students/courses/:courseId` - Get detailed course performance

## Database Schema

### User Model
- firstName, lastName, email, password
- role: 'teacher' | 'student'
- level: 'Level 3' | 'Level 4' | 'Level 5' (for students)
- courses: Array of course IDs

### Course Model
- name, level
- teacher: User ID
- students: Array of student IDs
- assessments: Array of assessment IDs

### Assessment Model
- name, type: 'Formative' | 'Summative'
- course: Course ID
- maxMarks: Number
- marks: Array of student marks with comments

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
├── models/           # MongoDB schemas
├── routes/           # API route handlers
├── middleware/       # Authentication middleware
├── public/           # Frontend files
│   ├── js/          # JavaScript files
│   └── index.html   # Main HTML file
├── server.js         # Express server
└── package.json      # Dependencies
```

### Running in Development
```bash
npm run dev
```
This will start the server with nodemon for automatic restarts on file changes.

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- CORS protection

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
