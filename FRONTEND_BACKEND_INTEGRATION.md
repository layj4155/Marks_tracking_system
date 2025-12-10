# Frontend & Backend Integration Guide

## Overview
All missing features are now accessible via both frontend UI and backend APIs.

---

## Teacher Features

### 1. Reports Tab (`/reports`)
**Frontend:** `Dashboard → Reports Tab`

**API Endpoints:**
- `GET /api/reports/teacher` - Get teacher's courses list
- `GET /api/reports/generate?academicYear=X&term=Y&level=L&courseId=C` - Generate performance report
  - Optional filters: `level` (Level 3/4/5), `courseId`
  - Returns: Student list with averages and pass/fail status
  - Download: "Download as PDF" button generates CSV

**Frontend Function:** `handleGenerateReport()`

---

### 2. Analytics Tab (`/analytics`)
**Frontend:** `Dashboard → Analytics Tab`

**API Endpoints:**
- `GET /api/analytics/class?academicYear=X&term=Y&level=L` - Get class analytics
  - Response includes:
    - `classAverage`: Average of all student scores
    - `highestScore`: Best score in class
    - `lowestScore`: Worst score in class
    - `passRate`: Percentage of students passing (70%+)
    - `distribution`: Performance breakdown (Excellent/Good/Average/Below Average)

**Frontend Function:** `handleLoadTeacherAnalytics()`

---

### 3. Attendance Tab (`/attendance`)
**Frontend:** `Dashboard → Attendance Tab`

**API Endpoints:**
- `GET /api/attendance/students?level=L&date=D` - Load students by level
  - Returns: List of students with ID, first name, last name
- `POST /api/attendance` - Record attendance
  - Body:
    ```json
    {
      "level": "Level 3",
      "date": "2025-12-09",
      "presentStudents": ["studentId1", "studentId2"],
      "academicYear": "2025-2026",
      "term": "1st Term"
    }
    ```

**Frontend Functions:**
- `loadAttendanceStudents()` - Fetch students
- `handleSubmitAttendance()` - Submit checked students

---

## Student Features

### 1. My Grades Tab (`/students`)
**Frontend:** `Dashboard → My Grades Tab`

**API Endpoints:**
- `GET /api/students/grades?academicYear=X&term=Y` - Get grade summary
  - Response:
    ```json
    {
      "overallAverage": 85.5,
      "courseCount": 4,
      "assessmentCount": 12
    }
    ```

**Frontend Function:** `loadStudentGrades()`

---

### 2. Notifications Tab (`/students`)
**Frontend:** `Dashboard → Notifications Tab`

**API Endpoints:**
- `GET /api/students/notifications` - Get announcements directed at student
  - Filters announcements by: "all", "students", or student's level
  - Returns: Last 20 announcements sorted by newest first

**Frontend Function:** `loadStudentNotifications()`

---

### 3. My Reports Tab (`/students`)
**Frontend:** `Dashboard → My Reports Tab`

**API Endpoints:**
- `GET /api/reports/download/grades?academicYear=X&term=Y` - Download grade report (PDF)
- `GET /api/reports/download/performance?academicYear=X&term=Y` - Download performance report (PDF)

**Frontend Functions:**
- `downloadGradeReport()` - Download as PDF
- `downloadPerformanceReport()` - Download as PDF

---

## Route File Summary

### Modified Files:
1. **routes/reports.js**
   - Added: `GET /teacher` - List teacher's courses
   - Added: `GET /generate` - Generate performance report
   - Added: `GET /download/grades` - Student grade report
   - Added: `GET /download/performance` - Student performance report

2. **routes/analytics.js**
   - Added: `GET /class` - Teacher class analytics

3. **routes/attendance.js**
   - Added: `GET /students` - Load students by level
   - Added: `POST /` - Record attendance (simple format)
   - Modified: `POST /course/:courseId` - Separate course-specific attendance

4. **routes/students.js**
   - Added: `GET /grades` - Student grade summary
   - Added: `GET /notifications` - Student announcements

---

## Frontend Updates

### Modified File: `public/index.html`

**Teacher Dashboard Sections:**
- Dashboard (original level/course management)
- Reports (new tab)
- Analytics (new tab)
- Attendance (new tab)

**Student Dashboard Sections:**
- My Grades (new tab - replaces full courses view)
- Notifications (new tab)
- My Reports (new tab)

### Modified File: `public/js/app.js`

**New Methods:**
- `showTeacherSection(section)` - Switch teacher tabs
- `loadTeacherReports()` - Load report filters
- `handleGenerateReport()` - Generate and display report
- `handleLoadTeacherAnalytics()` - Load class analytics
- `loadAttendanceStudents()` - Load students for attendance
- `handleSubmitAttendance(e)` - Submit attendance
- `showStudentSection(section)` - Switch student tabs
- `loadStudentGrades()` - Load grade summary
- `loadStudentNotifications()` - Load announcements
- `downloadGradeReport()` - Download PDF
- `downloadPerformanceReport()` - Download PDF

---

## Testing Checklist

### Teacher:
- [ ] Reports tab loads courses
- [ ] Generate Report button works with filters
- [ ] Analytics tab shows class stats
- [ ] Attendance tab loads students
- [ ] Submit Attendance saves records

### Student:
- [ ] My Grades shows overall average
- [ ] Notifications tab displays announcements
- [ ] Download buttons fetch PDFs

---

## Notes

- All endpoints require authentication token via Bearer header
- Attendance uses simplified format (checkbox present/absent)
- Analytics automatically calculates from assessment marks
- Report downloads trigger browser download dialog
- Announcements filter by recipient type and student level
