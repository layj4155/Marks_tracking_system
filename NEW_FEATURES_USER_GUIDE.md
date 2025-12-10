# New Features - User Access Guide

All new features are now fully integrated and accessible through the Admin Dashboard. Here's how different users can access them:

---

## ADMIN - Complete Feature Access

### 1. **User Invitations** (Invite New Users)
**Location**: Admin Dashboard → Invitations Tab

**Steps:**
1. Login as Admin
2. Click "Invitations" tab in the admin dashboard
3. Click "Send Invitation" button
4. Enter email, select role (Teacher, Admin, or Parent)
5. Click "Send"
6. Recipient receives email with invitation link
7. They visit `/accept-invitation.html?token=...` to create account

**Features:**
- Send invitations to new teachers, admins, or parents
- View all pending, accepted, and expired invitations
- Resend invitations
- Cancel pending invitations

---

### 2. **Bulk Import Users** (CSV Import)
**Location**: Admin Dashboard → Bulk Import Tab

**Steps:**
1. Go to Bulk Import section
2. Click "Import Students" or "Import Teachers"
3. Prepare CSV with format:
   - **Students**: `firstName,lastName,email,level`
   - **Teachers**: `firstName,lastName,email`
4. Paste CSV content into text area
5. Click "Import"
6. View results immediately

**Example CSV:**
```
firstName,lastName,email,level
John,Doe,john.doe@example.com,Level 3
Jane,Smith,jane.smith@example.com,Level 4
```

**Features:**
- Auto-generate temporary passwords
- Auto-enroll students in level-appropriate courses
- Detailed error reporting per row
- Batch process multiple users at once

---

### 3. **Send Announcements** (Broadcast Messages)
**Location**: Admin Dashboard → Announcements Tab

**Steps:**
1. Go to Announcements section
2. Enter Title and Message
3. Select Recipients:
   - All Users
   - All Students / All Teachers
   - Level 3/4/5 Students (specific)
4. Click "Send Announcement"
5. All selected users receive notification

**Features:**
- Send to specific user groups
- Track number of recipients
- In-app notifications for all users
- Auto-clear after 90 days

---

### 4. **System Analytics** (Performance Dashboard)
**Location**: Admin Dashboard → Analytics Tab

**Steps:**
1. Go to Analytics section
2. Select Academic Year
3. Select Term (1st, 2nd, or 3rd)
4. Click "Load Analytics"
5. View institution-wide statistics

**What You'll See:**
- Total students and courses
- Institution average percentage
- Performance by level
- Class averages per course
- Pass/fail rates

**Features:**
- Compare performance across years/terms
- Identify at-risk students
- Spot top performers
- Grade distribution analysis

---

### 5. **Audit Logs** (Activity Tracking)
**Location**: Admin Dashboard → Audit Logs Tab

**Features Tracked:**
- All user invitations sent
- Data exports (JSON, CSV)
- User login attempts (success/failure)
- Course creation/deletion
- Assessment creation/changes
- Marks updates
- Password resets
- Role changes

**What You See:**
- Action performed
- User who performed it
- When it happened (timestamp)
- IP address (if applicable)
- User agent

**Auto-cleanup**: Logs older than 1 year are automatically deleted

---

## TEACHERS - Feature Access

Teachers can access:

### Student Analytics
**Location**: Teacher Dashboard → Reports or Analytics

1. Select a Course
2. View class performance analytics
3. See individual student progress
4. Download performance reports (PDF)

### Course Reports
**Location**: Dashboard → Reports

1. Select Course
2. Choose Academic Year and Term
3. Generate PDF report with:
   - Student names and scores
   - Assessment-wise performance
   - Class statistics
   - Pass/fail breakdown

### Attendance Tracking
**Location**: Teacher Dashboard → Attendance (if available)

1. Record daily attendance
2. Mark students as Present, Absent, Late, or Excused
3. View attendance summary
4. Calculate attendance rates

---

## STUDENTS - Feature Access

Students can access:

### My Analytics
**Location**: Student Dashboard → Analytics or Performance

1. View own course performance
2. See all assessment scores
3. Track grades and percentages
4. View trend analysis across terms

### My Reports
**Location**: Student Dashboard → Reports

1. Download personal grade report (PDF)
2. View by Academic Year and Term
3. Print or share with parents

### Notifications
**Location**: Bell icon or Notifications section

1. Receive notifications when:
   - New assessment is created
   - Marks are posted
   - Marks are updated
   - Enrolled in new course
2. Mark as read/unread
3. Auto-delete after 90 days

### Attendance
**Location**: Student Dashboard → Attendance

1. View personal attendance records
2. See overall attendance rate
3. Track per-course attendance

---

## PARENTS - Feature Access

Parents can:

### Child's Progress
**Location**: Parent Dashboard

1. View linked children's courses
2. See child's grades and performance
3. Receive notifications about:
   - Marks posted
   - Marks updated
   - Course enrollment
4. View attendance records

**First Time Setup:**
- Admin must link parent to child student
- Parent accesses system via invitation

---

## API ENDPOINTS - For Developers

All features are accessible via REST APIs:

### Invitations
```
POST   /api/invitations              - Send invitation
GET    /api/invitations              - Get all invitations
GET    /api/invitations/verify/:token - Verify invitation
POST   /api/invitations/accept       - Accept invitation
DELETE /api/invitations/:id          - Cancel invitation
POST   /api/invitations/:id/resend   - Resend invitation
```

### Notifications
```
GET    /api/notifications            - Get user notifications
GET    /api/notifications/unread-count - Get unread count
PUT    /api/notifications/:id/read   - Mark as read
PUT    /api/notifications/read-all   - Mark all as read
DELETE /api/notifications/:id        - Delete notification
DELETE /api/notifications/clear/read - Clear read notifications
```

### Analytics
```
GET /api/analytics/course/:courseId          - Course analytics
GET /api/analytics/student/me                - Own analytics
GET /api/analytics/student/:studentId        - Student analytics
GET /api/analytics/level/:level              - Level analytics
GET /api/analytics/overview                  - Institution overview
GET /api/analytics/trends/me                 - Own trends
GET /api/analytics/trends/student/:studentId - Student trends
GET /api/analytics/teacher/me                - Teacher performance
GET /api/analytics/teachers/rankings         - All teachers rankings
```

### Reports
```
GET /api/reports/student/my-report           - Download own report
GET /api/reports/teacher/course/:courseId    - Download class report
GET /api/reports/teacher/student/:studentId  - Download student report
GET /api/reports/admin/student/:studentId    - Download any report
```

### Attendance
```
POST   /api/attendance                           - Record attendance
GET    /api/attendance/course/:courseId/date/:date    - Get for date
GET    /api/attendance/course/:courseId/summary       - Get summary
GET    /api/attendance/student/me                     - Get own attendance
DELETE /api/attendance/:attendanceId                  - Delete record
```

### Admin - Bulk Operations
```
POST /api/admin/import/students   - Bulk import students
POST /api/admin/import/teachers   - Bulk import teachers
POST /api/admin/announcements     - Send announcement
```

### Audit Logs
```
GET /api/backup/audit-logs        - Get audit logs
```

---

## Browser Compatibility

Works on:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Troubleshooting

### Invitations Not Showing
- Refresh the page
- Check that you're logged in as admin
- Verify the user has proper permissions

### Bulk Import Failing
- Check CSV format matches specification
- Ensure emails are unique
- Verify column names are correct

### Analytics Not Loading
- Select both Academic Year and Term
- Ensure there's data for that period
- Check you have permission to view

### Notifications Not Appearing
- Check notification settings
- Ensure you're enrolled in courses
- Verify assessments have been created

---

## Data Privacy & Security

- All invitations expire after 7 days
- Notifications auto-delete after 90 days
- Audit logs auto-delete after 1 year
- Passwords are hashed (never stored in plain text)
- All API calls require authentication token
- Rate limiting on auth endpoints prevents brute force

---

## Support

For issues or questions:
1. Check this guide first
2. Review the error message
3. Check browser console (F12) for detailed errors
4. Contact system administrator
