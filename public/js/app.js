class PerformanceTracker {
    constructor() {
        this.currentUser = null;
        this.currentLevel = null;
        this.currentCourse = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Auth tab switching
        document.getElementById('loginTab').addEventListener('click', () => this.switchAuthTab('login'));
        document.getElementById('registerTab').addEventListener('click', () => this.switchAuthTab('register'));

        // Role selection for registration
        document.getElementById('regRole').addEventListener('change', (e) => {
            const levelField = document.getElementById('levelField');
            const teacherWordField = document.getElementById('teacherWordField');
            const adminWordField = document.getElementById('adminWordField');
            if (e.target.value === 'student') {
                levelField.classList.remove('hidden');
                teacherWordField.classList.add('hidden');
                adminWordField.classList.add('hidden');
                document.getElementById('regLevel').required = true;
                document.getElementById('regTeacherWord').required = false;
                document.getElementById('regAdminWord').required = false;
            } else if (e.target.value === 'teacher') {
                levelField.classList.add('hidden');
                teacherWordField.classList.remove('hidden');
                adminWordField.classList.add('hidden');
                document.getElementById('regLevel').required = false;
                document.getElementById('regTeacherWord').required = true;
                document.getElementById('regAdminWord').required = false;
            } else if (e.target.value === 'admin') {
                levelField.classList.add('hidden');
                teacherWordField.classList.add('hidden');
                adminWordField.classList.remove('hidden');
                document.getElementById('regLevel').required = false;
                document.getElementById('regTeacherWord').required = false;
                document.getElementById('regAdminWord').required = true;
            } else {
                levelField.classList.add('hidden');
                teacherWordField.classList.add('hidden');
                adminWordField.classList.add('hidden');
                document.getElementById('regLevel').required = false;
                document.getElementById('regTeacherWord').required = false;
                document.getElementById('regAdminWord').required = false;
            }
        });

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Logout buttons
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('studentLogoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.logout());

        // Level cards
        document.getElementById('level3Card').addEventListener('click', () => this.showLevelDetails('Level 3'));
        document.getElementById('level4Card').addEventListener('click', () => this.showLevelDetails('Level 4'));
        document.getElementById('level5Card').addEventListener('click', () => this.showLevelDetails('Level 5'));

        // Course management
        document.getElementById('addCourseBtn').addEventListener('click', () => this.showCourseModal());
        document.getElementById('courseForm').addEventListener('submit', (e) => this.handleCreateCourse(e));
        document.getElementById('cancelCourseBtn').addEventListener('click', () => this.hideCourseModal());

        // Assessment management
        document.getElementById('assessmentForm').addEventListener('submit', (e) => this.handleCreateAssessment(e));
        document.getElementById('cancelAssessmentBtn').addEventListener('click', () => this.hideAssessmentModal());
        document.getElementById('closeAssessmentBtn').addEventListener('click', () => this.hideAssessmentModal());

        // Add student modal
        document.getElementById('addStudentForm').addEventListener('submit', (e) => this.handleAddStudentToCourse(e));
        document.getElementById('cancelAddStudentBtn').addEventListener('click', () => this.hideAddStudentModal());
        document.getElementById('studentSearch').addEventListener('input', (e) => this.filterStudents(e.target.value));

        // Assessment management
        document.getElementById('closeAssessmentManagementBtn').addEventListener('click', () => this.hideAssessmentManagementModal());
        document.getElementById('addNewAssessmentBtn').addEventListener('click', () => this.showAssessmentModal(this.currentCourse));
        document.getElementById('editAssessmentForm').addEventListener('submit', (e) => this.handleEditAssessment(e));
        document.getElementById('cancelEditAssessmentBtn').addEventListener('click', () => this.hideEditAssessmentModal());

        // Academic year and forgot password
        document.getElementById('academicYearForm').addEventListener('submit', (e) => this.handleAcademicYearSelection(e));
        document.getElementById('forgotPasswordLink').addEventListener('click', (e) => this.showForgotPasswordModal(e));
        document.getElementById('forgotPasswordForm').addEventListener('submit', (e) => this.handleForgotPassword(e));
        document.getElementById('cancelForgotPasswordBtn').addEventListener('click', () => this.hideForgotPasswordModal());

        // Admin user management
        document.getElementById('adminsTab').addEventListener('click', () => this.showUsers('admins'));
        document.getElementById('teachersTab').addEventListener('click', () => this.showUsers('teachers'));
        document.getElementById('level3Tab').addEventListener('click', () => this.showUsers('level3'));
        document.getElementById('level4Tab').addEventListener('click', () => this.showUsers('level4'));
        document.getElementById('level5Tab').addEventListener('click', () => this.showUsers('level5'));
        document.getElementById('editUserForm').addEventListener('submit', (e) => this.handleEditUser(e));
        document.getElementById('cancelEditUserBtn').addEventListener('click', () => this.hideEditUserModal());
        
        // Admin academic year management
        document.getElementById('addAcademicYearBtn').addEventListener('click', () => this.showAddAcademicYearModal());
        document.getElementById('addAcademicYearForm').addEventListener('submit', (e) => this.handleAddAcademicYear(e));
        document.getElementById('cancelAddAcademicYearBtn').addEventListener('click', () => this.hideAddAcademicYearModal());

        // New feature tabs
        document.getElementById('usersManagementTab').addEventListener('click', () => this.showAdminSection('users'));
        document.getElementById('invitationsTab').addEventListener('click', () => this.showAdminSection('invitations'));
        document.getElementById('bulkImportTab').addEventListener('click', () => this.showAdminSection('bulkImport'));
        document.getElementById('announcementsTab').addEventListener('click', () => this.showAdminSection('announcements'));
        document.getElementById('analyticsTab').addEventListener('click', () => this.showAdminSection('analytics'));
        document.getElementById('auditLogsTab').addEventListener('click', () => this.showAdminSection('auditLogs'));
        document.getElementById('analyticsFilterForm').addEventListener('submit', (e) => this.handleLoadAnalytics(e));

        // Invitations
        document.getElementById('sendInvitationBtn').addEventListener('click', () => this.showSendInvitationModal());
        document.getElementById('sendInvitationForm').addEventListener('submit', (e) => this.handleSendInvitation(e));
        document.getElementById('cancelSendInvitationBtn').addEventListener('click', () => this.hideSendInvitationModal());

        // Bulk Import
        document.getElementById('importStudentsBtn').addEventListener('click', () => this.showBulkImportModal('students'));
        document.getElementById('importTeachersBtn').addEventListener('click', () => this.showBulkImportModal('teachers'));
        document.getElementById('bulkImportForm').addEventListener('submit', (e) => this.handleBulkImport(e));
        document.getElementById('cancelBulkImportBtn').addEventListener('click', () => this.hideBulkImportModal());

        // Announcements
        document.getElementById('announcementForm').addEventListener('submit', (e) => this.handleSendAnnouncement(e));

        // Teacher tabs
        document.getElementById('dashboardTab').addEventListener('click', () => this.showTeacherSection('dashboard'));
        document.getElementById('reportsTab').addEventListener('click', () => this.showTeacherSection('reports'));
        document.getElementById('teacherAnalyticsTab').addEventListener('click', () => this.showTeacherSection('analytics'));
        document.getElementById('attendanceTab').addEventListener('click', () => this.showTeacherSection('attendance'));

        // Teacher Reports
        document.getElementById('generateReportBtn').addEventListener('click', () => this.handleGenerateReport());
        
        // Teacher Analytics
        document.getElementById('loadAnalyticsBtn').addEventListener('click', () => this.handleLoadTeacherAnalytics());
        
        // Attendance
        document.getElementById('attendanceLevel').addEventListener('change', () => this.loadAttendanceStudents());
        document.getElementById('attendanceDate').addEventListener('change', () => this.loadAttendanceStudents());
        document.getElementById('loadAttendanceBtn').addEventListener('click', () => this.loadAttendanceStudents());
        document.getElementById('attendanceForm').addEventListener('submit', (e) => this.handleSubmitAttendance(e));

        // Student tabs
        document.getElementById('studentGradesTab').addEventListener('click', () => this.showStudentSection('grades'));
        document.getElementById('studentNotificationsTab').addEventListener('click', () => this.showStudentSection('notifications'));
        document.getElementById('studentReportsTab').addEventListener('click', () => this.showStudentSection('reports'));

        // Student Reports
        document.getElementById('downloadGradeReportBtn').addEventListener('click', () => this.downloadGradeReport());
        document.getElementById('downloadPerformanceReportBtn').addEventListener('click', () => this.downloadPerformanceReport());
    }

    switchAuthTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (tab === 'login') {
            loginTab.classList.add('bg-white', 'shadow-sm');
            loginTab.classList.remove('text-gray-600');
            registerTab.classList.remove('bg-white', 'shadow-sm');
            registerTab.classList.add('text-gray-600');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            registerTab.classList.add('bg-white', 'shadow-sm');
            registerTab.classList.remove('text-gray-600');
            loginTab.classList.remove('bg-white', 'shadow-sm');
            loginTab.classList.add('text-gray-600');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                this.showDashboard();
            } else {
                this.showMessage(data.message, 'error');
            }
        } catch (error) {
            this.showMessage('Login failed. Please try again.', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const role = document.getElementById('regRole').value;
        const formData = {
            firstName: document.getElementById('regFirstName').value,
            lastName: document.getElementById('regLastName').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            role: role
        };

        if (role === 'student') {
            formData.level = document.getElementById('regLevel').value;
        } else if (role === 'teacher') {
            formData.teacherWord = document.getElementById('regTeacherWord').value;
        } else if (role === 'admin') {
            formData.adminWord = document.getElementById('regAdminWord').value;
        }

        try {
            const response = await fetch(`/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                this.showDashboard();
            } else {
                console.error('Registration error:', data);
                const errorMessage = data.message || (data.errors && data.errors.length > 0 ? data.errors[0].msg : 'Registration failed');
                this.showMessage(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Registration exception:', error);
            this.showMessage('Registration failed. Please try again.', 'error');
        }
    }

    async checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.showDashboard();
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            localStorage.removeItem('token');
        }
    }

    showDashboard() {
        document.getElementById('authPage').classList.add('hidden');
        
        // Admin doesn't need academic year selection
        if (this.currentUser.role === 'admin') {
            document.getElementById('adminDashboard').classList.remove('hidden');
            document.getElementById('adminName').textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            this.loadAdminDashboard();
        } else {
            // Show academic year selection for teachers and students
            this.showAcademicYearSelection();
        }
    }

    async loadTeacherDashboard() {
        try {
            const response = await fetch(`/api/teachers/dashboard?academicYear=${this.currentAcademicYear}&term=${this.currentTerm}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateDashboardCards(data);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    updateDashboardCards(data) {
        Object.keys(data).forEach(level => {
            const studentsElement = document.getElementById(`${level.toLowerCase().replace(' ', '')}Students`);
            const coursesElement = document.getElementById(`${level.toLowerCase().replace(' ', '')}Courses`);
            
            if (studentsElement) studentsElement.textContent = data[level].studentCount;
            if (coursesElement) coursesElement.textContent = `${data[level].courseCount} courses`;
        });
    }

    async showLevelDetails(level) {
        this.currentLevel = level;
        document.getElementById('levelTitle').textContent = level;
        document.getElementById('levelDetails').classList.remove('hidden');

        try {
            const response = await fetch(`/api/teachers/courses/${level}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const courses = await response.json();
                this.displayCourses(courses);
            }
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    }

    displayCourses(courses) {
        const coursesList = document.getElementById('coursesList');
        coursesList.innerHTML = '';

        courses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200';
            courseCard.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-lg font-semibold text-gray-800">${course.name}</h3>
                    <div class="flex space-x-2">
                        <button class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 view-students-btn" 
                                data-course-id="${course._id}" data-course-name="${course.name}">
                            View Students (${course.students.length})
                        </button>
                        <button class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 manage-assessments-btn" 
                                data-course-id="${course._id}" data-course-name="${course.name}">
                            Manage Assessments
                        </button>
                        <button class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 delete-course-btn" 
                                data-course-id="${course._id}">
                            Delete
                        </button>
                    </div>
                </div>
                <p class="text-gray-600 text-sm">${course.assessments.length} assessments</p>
            `;
            coursesList.appendChild(courseCard);
        });

        // Add event listeners
        document.querySelectorAll('.view-students-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const courseId = btn.dataset.courseId;
                const courseName = btn.dataset.courseName;
                this.showCourseStudents(courseId, courseName);
            });
        });

        document.querySelectorAll('.manage-assessments-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const courseId = btn.dataset.courseId;
                const courseName = btn.dataset.courseName;
                this.showAssessmentManagement(courseId, courseName);
            });
        });

        document.querySelectorAll('.delete-course-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const courseId = btn.dataset.courseId;
                this.deleteCourse(courseId);
            });
        });
    }

    showCourseModal() {
        document.getElementById('courseModal').classList.remove('hidden');
    }

    hideCourseModal() {
        document.getElementById('courseModal').classList.add('hidden');
        document.getElementById('courseForm').reset();
    }

    async handleCreateCourse(e) {
        e.preventDefault();
        const courseName = document.getElementById('courseName').value;

        try {
            const response = await fetch(`/api/teachers/courses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    name: courseName,
                    level: this.currentLevel
                })
            });

            if (response.ok) {
                this.hideCourseModal();
                this.showLevelDetails(this.currentLevel);
                this.loadTeacherDashboard();
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'Failed to create course', 'error');
            }
        } catch (error) {
            this.showMessage('Failed to create course', 'error');
        }
    }

    showAssessmentModal(courseId) {
        this.currentCourse = courseId;
        // Close the assessment management modal first
        document.getElementById('assessmentManagementModal').classList.add('hidden');
        document.getElementById('assessmentModal').classList.remove('hidden');
        this.populateAssessmentStudents();
    }

    hideAssessmentModal() {
        document.getElementById('assessmentModal').classList.add('hidden');
        document.getElementById('assessmentForm').reset();
        // Reopen the assessment management modal
        document.getElementById('assessmentManagementModal').classList.remove('hidden');
    }

    async handleCreateAssessment(e) {
        e.preventDefault();
        const maxMarks = parseInt(document.getElementById('maxMarks').value);
        const marks = Array.from(document.querySelectorAll('.assessment-student-row')).map(row => ({
            studentId: row.dataset.studentId,
            score: parseFloat(row.querySelector('.score-input').value || '0'),
            comment: row.querySelector('.comment-input').value || ''
        }));
        const formData = {
            name: this.currentCourseName || document.getElementById('assessmentName').value,
            type: document.getElementById('assessmentType').value,
            courseId: this.currentCourse,
            maxMarks,
            marks,
            academicYear: this.currentAcademicYear,
            term: this.currentTerm,
            dateRecorded: new Date().toISOString().split('T')[0]
        };

        try {
            const response = await fetch(`/api/assessments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.hideAssessmentModal();
                this.showLevelDetails(this.currentLevel);
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'Failed to create assessment', 'error');
            }
        } catch (error) {
            this.showMessage('Failed to create assessment', 'error');
        }
    }

    async populateAssessmentStudents() {
        const container = document.getElementById('assessmentStudentsContainer');
        const emptyMsg = document.getElementById('assessmentNoStudents');
        container.innerHTML = '';
        try {
            const res = await fetch(`/api/teachers/courses/${this.currentCourse}/students`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) return;
            const students = await res.json();
            if (!students.length) {
                emptyMsg.classList.remove('hidden');
                container.appendChild(emptyMsg);
                return;
            }
            students.forEach(s => {
                const row = document.createElement('div');
                row.className = 'assessment-student-row grid grid-cols-1 md:grid-cols-5 gap-2 items-center bg-white p-2 rounded border';
                row.dataset.studentId = s._id;
                row.innerHTML = `
                    <div class="md:col-span-2 text-sm font-medium">${s.firstName} ${s.lastName}</div>
                    <input type="number" min="0" step="0.01" placeholder="Score" class="score-input px-2 py-1 border rounded" />
                    <input type="text" placeholder="Comment" class="comment-input md:col-span-2 px-2 py-1 border rounded" />
                `;
                container.appendChild(row);
            });
        } catch (_) {}
    }

    async showAddStudentModal(courseId) {
        this.currentCourse = courseId;
        const modal = document.getElementById('addStudentModal');
        const select = document.getElementById('studentSelect');
        select.innerHTML = '';
        modal.classList.remove('hidden');
        
        try {
            // Get all students
            const allStudentsRes = await fetch(`/api/courses/students`, { 
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
            });
            if (!allStudentsRes.ok) return;
            const allStudents = await allStudentsRes.json();
            
            // Get course students
            const courseStudentsRes = await fetch(`/api/teachers/courses/${courseId}/students`, { 
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
            });
            if (!courseStudentsRes.ok) return;
            const courseStudents = await courseStudentsRes.json();
            
            const enrolledStudentIds = courseStudents.map(s => s._id);
            const availableStudents = allStudents.filter(s => !enrolledStudentIds.includes(s._id));
            
            if (!availableStudents.length) {
                select.innerHTML = '<option value="">No available students</option>';
                return;
            }
            
            select.innerHTML = '<option value="">Select student</option>' + 
                availableStudents.map(s => `<option value="${s._id}">${s.firstName} ${s.lastName} (${s.level})</option>`).join('');
        } catch (_) {}
    }

    hideAddStudentModal() {
        document.getElementById('addStudentModal').classList.add('hidden');
    }

    async handleAddStudentToCourse(e) {
        e.preventDefault();
        const studentId = document.getElementById('studentSelect').value;
        if (!studentId) return;
        try {
            const res = await fetch(`/api/teachers/courses/${this.currentCourse}/students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ studentId })
            });
            if (res.ok) {
                this.hideAddStudentModal();
                this.showLevelDetails(this.currentLevel);
                this.loadTeacherDashboard();
            }
        } catch (_) {}
    }

    filterStudents(searchTerm) {
        const select = document.getElementById('studentSelect');
        const options = Array.from(select.options);
        options.forEach(option => {
            if (option.value === '') return;
            const text = option.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            option.style.display = matches ? 'block' : 'none';
        });
    }

    async showAssessmentManagement(courseId, courseName) {
        this.currentCourse = courseId;
        this.currentCourseName = courseName;
        document.getElementById('assessmentManagementModal').classList.remove('hidden');
        await this.loadAssessments();
    }

    hideAssessmentManagementModal() {
        document.getElementById('assessmentManagementModal').classList.add('hidden');
    }

    async loadAssessments() {
        try {
            const res = await fetch(`/api/assessments/course/${this.currentCourse}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) return;
            const assessments = await res.json();
            this.displayAssessments(assessments);
        } catch (_) {}
    }

    displayAssessments(assessments) {
        const container = document.getElementById('assessmentsList');
        container.innerHTML = '';
        
        assessments.forEach(assessment => {
            const card = document.createElement('div');
            card.className = 'bg-white border rounded-lg p-4 shadow-sm';
            const date = new Date(assessment.createdAt).toLocaleDateString();
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-semibold text-lg">${assessment.name}</h4>
                        <p class="text-sm text-gray-600">${assessment.type} • Max: ${assessment.maxMarks} • Date: ${date}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 edit-assessment-btn" data-assessment-id="${assessment._id}">Edit</button>
                        <button class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 delete-assessment-btn" data-assessment-id="${assessment._id}">Delete</button>
                    </div>
                </div>
                <div class="text-sm text-gray-600">${assessment.marks.length} students marked</div>
            `;
            container.appendChild(card);
        });

        // Add event listeners for edit and delete buttons
        container.querySelectorAll('.edit-assessment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const assessmentId = btn.dataset.assessmentId;
                this.editAssessment(assessmentId);
            });
        });

        container.querySelectorAll('.delete-assessment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const assessmentId = btn.dataset.assessmentId;
                this.deleteAssessment(assessmentId);
            });
        });
    }

    async editAssessment(assessmentId) {
        try {
            const res = await fetch(`/api/assessments/${assessmentId}/marks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!res.ok) return;
            const assessment = await res.json();
            
            document.getElementById('editAssessmentName').value = assessment.name;
            document.getElementById('editAssessmentDate').value = new Date(assessment.createdAt).toISOString().split('T')[0];
            document.getElementById('editAssessmentType').value = assessment.type;
            document.getElementById('editMaxMarks').value = assessment.maxMarks;
            
            this.populateEditAssessmentStudents(assessment);
            // Close the assessment management modal first
            document.getElementById('assessmentManagementModal').classList.add('hidden');
            document.getElementById('editAssessmentModal').classList.remove('hidden');
            this.currentEditingAssessment = assessmentId;
        } catch (_) {}
    }

    populateEditAssessmentStudents(assessment) {
        const container = document.getElementById('editAssessmentStudentsContainer');
        container.innerHTML = '';
        
        assessment.marks.forEach(mark => {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-1 md:grid-cols-4 gap-2 items-center bg-white p-2 rounded border';
            row.dataset.studentId = mark.student._id;
            row.innerHTML = `
                <div class="font-medium">${mark.student.firstName} ${mark.student.lastName}</div>
                <input type="number" min="0" step="0.01" value="${mark.score}" class="score-input px-2 py-1 border rounded" />
                <input type="text" value="${mark.comment || ''}" placeholder="Comment" class="comment-input px-2 py-1 border rounded" />
                <div class="text-sm text-gray-600">${Math.round((mark.score / assessment.maxMarks) * 100)}%</div>
            `;
            container.appendChild(row);
        });
    }

    hideEditAssessmentModal() {
        document.getElementById('editAssessmentModal').classList.add('hidden');
        // Reopen the assessment management modal
        document.getElementById('assessmentManagementModal').classList.remove('hidden');
    }

    async handleEditAssessment(e) {
        e.preventDefault();
        const marks = Array.from(document.querySelectorAll('#editAssessmentStudentsContainer .grid')).map(row => ({
            studentId: row.dataset.studentId,
            score: parseFloat(row.querySelector('.score-input').value || '0'),
            comment: row.querySelector('.comment-input').value || ''
        }));
        
        try {
            const res = await fetch(`/api/assessments/${this.currentEditingAssessment}/marks`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ marks })
            });
            if (res.ok) {
                this.hideEditAssessmentModal();
                this.loadAssessments();
            }
        } catch (_) {}
    }

    async deleteAssessment(assessmentId) {
        if (!confirm('Are you sure you want to delete this assessment?')) return;
        try {
            const res = await fetch(`/api/assessments/${assessmentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                this.loadAssessments();
                this.showLevelDetails(this.currentLevel);
            }
        } catch (_) {}
    }

    async deleteCourse(courseId) {
        if (!confirm('Are you sure you want to delete this course? This will remove all assessments and student assignments.')) return;
        try {
            const res = await fetch(`/api/courses/${courseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                this.showLevelDetails(this.currentLevel);
                this.loadTeacherDashboard();
            }
        } catch (_) {}
    }

    async showCourseStudents(courseId, courseName) {
        try {
            const response = await fetch(`/api/teachers/courses/${courseId}/students`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const students = await response.json();
                console.log('Students data:', students);
                this.displayStudents(students, courseId, courseName);
            } else {
                const error = await response.json();
                console.error('Error loading students:', error);
                this.showMessage('Failed to load students', 'error');
            }
        } catch (error) {
            console.error('Error loading students:', error);
            this.showMessage('Error loading students', 'error');
        }
    }

    displayStudents(students, courseId, courseName) {
        // Create a modal for students
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 student-modal';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold gradient-text">${courseName} - Students</h3>
                    <button class="text-gray-500 hover:text-gray-700 close-modal-btn" title="Close">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="mb-4">
                    <button class="bg-gradient-primary text-white px-4 py-2 rounded-lg hover:opacity-90 add-student-modal-btn" data-course-id="${courseId}">
                        Add Student
                    </button>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="border border-gray-300 px-4 py-2 text-left">Student</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">Average</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">Status</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">Assessments</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${students.map(student => `
                                <tr>
                                    <td class="border border-gray-300 px-4 py-2">${student.firstName} ${student.lastName}</td>
                                    <td class="border border-gray-300 px-4 py-2 font-semibold">${student.average}%</td>
                                    <td class="border border-gray-300 px-4 py-2">
                                        <span class="px-2 py-1 rounded text-sm text-white ${this.getStatusColor(student.color)}">
                                            ${this.getStatusText(student.color)}
                                        </span>
                                    </td>
                                    <td class="border border-gray-300 px-4 py-2">${student.totalAssessments}</td>
                                    <td class="border border-gray-300 px-4 py-2">
                                        <button class="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600 view-marks-btn" 
                                                data-course-id="${courseId}" data-student-id="${student._id}" data-student-name="${student.firstName} ${student.lastName}">
                                            View Marks
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close-modal-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.add-student-modal-btn').addEventListener('click', (e) => {
            const cid = e.target.dataset.courseId;
            modal.remove();
            this.showAddStudentModal(cid);
        });

        modal.querySelectorAll('.view-marks-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cid = btn.dataset.courseId;
                const sid = btn.dataset.studentId;
                const sname = btn.dataset.studentName;
                this.viewStudentMarks(cid, sid, sname);
            });
        });
    }

    getStatusColor(color) {
        const colors = {
            green: 'bg-green-500',
            yellow: 'bg-yellow-500',
            red: 'bg-red-500'
        };
        return colors[color] || 'bg-gray-500';
    }

    getStatusText(color) {
        const texts = {
            green: 'Passing',
            yellow: 'At Risk',
            red: 'Failing'
        };
        return texts[color] || 'Unknown';
    }

    async viewStudentMarks(courseId, studentId, studentName) {
        try {
            const response = await fetch(`/api/teachers/courses/${courseId}/students`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) return;

            const students = await response.json();
            const student = students.find(s => s._id === studentId);

            if (!student) return;

            // Fetch all assessments for this course
            const assessmentsResponse = await fetch(`/api/assessments/course/${courseId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!assessmentsResponse.ok) return;

            const assessments = await assessmentsResponse.json();

            // Calculate total marks
            let totalObtained = 0;
            let totalMax = 0;
            const marksData = [];

            assessments.forEach(assessment => {
                const studentMark = assessment.marks.find(m => m.student._id === studentId);
                if (studentMark) {
                    totalObtained += studentMark.score;
                    totalMax += assessment.maxMarks;
                    marksData.push({
                        name: assessment.name,
                        type: assessment.type,
                        score: studentMark.score,
                        maxMarks: assessment.maxMarks,
                        percentage: Math.round((studentMark.score / assessment.maxMarks) * 100 * 100) / 100,
                        comment: studentMark.comment || 'No comment',
                        date: new Date(assessment.createdAt).toLocaleDateString()
                    });
                }
            });

            const overallAverage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100 * 100) / 100 : 0;

            // Display marks in modal
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
                    <div class="flex items-center justify-between mb-6">
                         <h3 class="text-2xl font-bold gradient-text">${studentName} - Detailed Marks</h3>
                         <button class="close-modal-btn close-marks-btn" title="Close">
                             <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                             </svg>
                         </button>
                     </div>

                    <div class="bg-gradient-primary text-white rounded-lg p-4 mb-6">
                        <div class="text-center">
                            <div class="text-4xl font-bold mb-2">${overallAverage}%</div>
                            <div class="text-lg">Overall Average</div>
                            <div class="text-sm mt-2">${totalObtained} / ${totalMax} total marks</div>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <h4 class="font-semibold text-lg">Assessment Details:</h4>
                        ${marksData.length > 0 ? marksData.map(mark => `
                            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <h5 class="font-semibold text-lg">${mark.name}</h5>
                                        <p class="text-sm text-gray-600">${mark.type} • ${mark.date}</p>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-2xl font-bold gradient-text">${mark.percentage}%</div>
                                        <div class="text-sm text-gray-600">${mark.score} / ${mark.maxMarks}</div>
                                    </div>
                                </div>
                                <div class="mt-2">
                                    <p class="text-sm"><span class="font-medium">Comment:</span> ${mark.comment}</p>
                                </div>
                            </div>
                        `).join('') : '<p class="text-gray-500 italic">No assessments completed yet</p>'}
                    </div>
                </div>
            `;
             document.body.appendChild(modal);
             
             // Add close button event listener
             modal.querySelector('.close-marks-btn').addEventListener('click', () => {
                 modal.remove();
             });
            } catch (error) {
             console.error('Error viewing student marks:', error);
            }
            }

    async loadStudentDashboard() {
        try {
            const response = await fetch(`/api/students/dashboard?academicYear=${this.currentAcademicYear}&term=${this.currentTerm}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const courses = await response.json();
                this.displayStudentCourses(courses);
            }
        } catch (error) {
            console.error('Error loading student dashboard:', error);
        }
    }

    displayStudentCourses(courses) {
        const container = document.getElementById('studentCourses');
        container.innerHTML = '';

        courses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'bg-white rounded-xl shadow-lg p-6';
            courseCard.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold text-gray-800">${course.name}</h3>
                    <span class="px-3 py-1 rounded-full text-sm text-white ${this.getStatusColor(course.color)}">
                        ${course.average}% - ${this.getStatusText(course.color)}
                    </span>
                </div>
                <p class="text-gray-600 mb-4">Level: ${course.level}</p>
                <p class="text-gray-600 mb-4">Total Assessments: ${course.totalAssessments}</p>
                
                <div class="space-y-3">
                    <h4 class="font-semibold text-gray-700">Recent Assessments:</h4>
                    ${course.assessments.length > 0 ? 
                        course.assessments.slice(0, 5).map(assessment => {
                            const percentage = Math.round((assessment.score / assessment.maxMarks) * 100);
                            const date = new Date(assessment.createdAt).toLocaleDateString();
                            return `
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <div class="flex justify-between items-center">
                                        <span class="font-medium">${assessment.name}</span>
                                        <div class="text-right">
                                            <div class="text-sm font-semibold">${percentage}%</div>
                                            <div class="text-xs text-gray-500">${assessment.score}/${assessment.maxMarks}</div>
                                        </div>
                                    </div>
                                    <p class="text-sm text-gray-600 mt-1">${assessment.comment || 'No comment'}</p>
                                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>${assessment.type}</span>
                                        <span>${date}</span>
                                    </div>
                                </div>
                            `;
                        }).join('') :
                        '<p class="text-gray-500 italic">No assessments yet</p>'
                    }
                </div>
            `;
            container.appendChild(courseCard);
        });
    }

    logout() {
        localStorage.removeItem('token');
        this.currentUser = null;
        document.getElementById('authPage').classList.remove('hidden');
        document.getElementById('teacherDashboard').classList.add('hidden');
        document.getElementById('studentDashboard').classList.add('hidden');
        document.getElementById('adminDashboard').classList.add('hidden');
        document.getElementById('levelDetails').classList.add('hidden');
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('authMessage');
        messageDiv.textContent = message;
        messageDiv.className = `mt-4 text-center text-sm ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
        
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'mt-4 text-center text-sm';
        }, 5000);
    }

    async showAcademicYearSelection() {
        try {
            const endpoint = this.currentUser.role === 'teacher' ? '/api/teachers/academic-info' : '/api/students/academic-info';
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (!data.academicYears || data.academicYears.length === 0) {
                    alert('No academic years configured. Please contact administrator.');
                    this.logout();
                    return;
                }
                
                const academicYearSelect = document.getElementById('academicYearSelect');
                const termSelect = document.getElementById('termSelect');
                
                academicYearSelect.innerHTML = '';
                data.academicYears.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    if (year === data.currentAcademicYear) option.selected = true;
                    academicYearSelect.appendChild(option);
                });

                termSelect.value = data.currentTerm;
                
                document.getElementById('academicYearModal').classList.remove('hidden');
            } else {
                const data = await response.json();
                alert(data.message || 'Error loading academic information');
                this.logout();
            }
        } catch (error) {
            console.error('Error loading academic info:', error);
            alert('Error loading academic information. Please try again.');
            this.logout();
        }
    }

    async handleAcademicYearSelection(e) {
        e.preventDefault();
        const academicYear = document.getElementById('academicYearSelect').value;
        const term = document.getElementById('termSelect').value;
        
        this.currentAcademicYear = academicYear;
        this.currentTerm = term;
        
        document.getElementById('academicYearModal').classList.add('hidden');
        
        if (this.currentUser.role === 'teacher') {
            document.getElementById('teacherDashboard').classList.remove('hidden');
            document.getElementById('teacherName').textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            this.loadTeacherDashboard();
        } else if (this.currentUser.role === 'student') {
            document.getElementById('studentDashboard').classList.remove('hidden');
            document.getElementById('studentName').textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            this.loadStudentDashboard();
        } else if (this.currentUser.role === 'admin') {
            document.getElementById('adminDashboard').classList.remove('hidden');
            document.getElementById('adminName').textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            this.loadAdminDashboard();
        }
    }

    showForgotPasswordModal(e) {
        e.preventDefault();
        document.getElementById('forgotPasswordModal').classList.remove('hidden');
    }

    hideForgotPasswordModal() {
        document.getElementById('forgotPasswordModal').classList.add('hidden');
        document.getElementById('forgotPasswordForm').reset();
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value;
        const messageDiv = document.getElementById('forgotPasswordMessage');

        try {
            const response = await fetch(`/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                messageDiv.textContent = `Reset token: ${data.resetToken}`;
                messageDiv.className = 'mt-4 text-center text-sm text-green-600';
            } else {
                messageDiv.textContent = data.message || 'Failed to send reset link';
                messageDiv.className = 'mt-4 text-center text-sm text-red-600';
            }
        } catch (error) {
            messageDiv.textContent = 'Failed to send reset link. Please try again.';
            messageDiv.className = 'mt-4 text-center text-sm text-red-600';
        }
    }

    async loadAdminDashboard() {
        try {
            const response = await fetch(`/api/admin/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalAdmins').textContent = stats.totalAdmins;
                document.getElementById('totalTeachers').textContent = stats.totalTeachers;
                document.getElementById('totalStudents').textContent = stats.totalStudents;
                document.getElementById('totalCourses').textContent = stats.totalCourses;
            }

            await this.loadAllUsers();
            await this.loadAcademicYears();
            this.showUsers('teachers');
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
        }
    }

    async loadAllUsers() {
        try {
            const response = await fetch(`/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                this.allUsers = await response.json();
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    showUsers(category) {
        const tabs = ['adminsTab', 'teachersTab', 'level3Tab', 'level4Tab', 'level5Tab'];
        tabs.forEach(tab => {
            const element = document.getElementById(tab);
            if (element) {
                element.classList.remove('border-primary', 'text-primary');
                element.classList.add('border-transparent');
            }
        });

        let activeTab;
        let users = [];

        switch(category) {
            case 'admins':
                activeTab = 'adminsTab';
                users = this.allUsers?.admins || [];
                break;
            case 'teachers':
                activeTab = 'teachersTab';
                users = this.allUsers?.teachers || [];
                break;
            case 'level3':
                activeTab = 'level3Tab';
                users = this.allUsers?.students?.['Level 3'] || [];
                break;
            case 'level4':
                activeTab = 'level4Tab';
                users = this.allUsers?.students?.['Level 4'] || [];
                break;
            case 'level5':
                activeTab = 'level5Tab';
                users = this.allUsers?.students?.['Level 5'] || [];
                break;
        }

        const activeElement = document.getElementById(activeTab);
        if (activeElement) {
            activeElement.classList.add('border-primary', 'text-primary');
            activeElement.classList.remove('border-transparent');
        }

        this.displayUsers(users);
    }

    displayUsers(users) {
        const container = document.getElementById('usersContainer');
        container.innerHTML = '';

        if (!users || users.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No users found</p>';
            return;
        }

        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'bg-gray-50 rounded-lg p-4 flex items-center justify-between border border-gray-200 hover:shadow-md transition';
            userCard.innerHTML = `
                <div class="flex-1">
                    <h4 class="font-semibold text-lg">${user.firstName} ${user.lastName}</h4>
                    <p class="text-sm text-gray-600">${user.email}</p>
                    ${user.level ? `<p class="text-sm text-gray-600">Level: ${user.level}</p>` : ''}
                    ${user.courses && user.courses.length > 0 ? `<p class="text-sm text-gray-600">Courses: ${user.courses.length}</p>` : ''}
                </div>
                <div class="flex space-x-2">
                    <button onclick="app.editUser('${user._id}')" class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded text-sm hover:opacity-90 shadow">
                        Edit
                    </button>
                    <button onclick="app.resetUserPassword('${user._id}', '${user.firstName} ${user.lastName}')" class="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded text-sm hover:opacity-90 shadow">
                        Reset Password
                    </button>
                    <button onclick="app.deleteUser('${user._id}', '${user.firstName} ${user.lastName}')" class="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded text-sm hover:opacity-90 shadow">
                        Delete
                    </button>
                </div>
            `;
            container.appendChild(userCard);
        });
    }

    async editUser(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const user = await response.json();
                this.currentEditingUser = userId;
                
                document.getElementById('editFirstName').value = user.firstName;
                document.getElementById('editLastName').value = user.lastName;
                document.getElementById('editEmail').value = user.email;
                
                if (user.role === 'student') {
                    document.getElementById('editLevelField').classList.remove('hidden');
                    document.getElementById('editLevel').value = user.level;
                } else {
                    document.getElementById('editLevelField').classList.add('hidden');
                }
                
                document.getElementById('editUserModal').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }

    hideEditUserModal() {
        document.getElementById('editUserModal').classList.add('hidden');
        document.getElementById('editUserForm').reset();
    }

    async handleEditUser(e) {
        e.preventDefault();
        
        const updates = {
            firstName: document.getElementById('editFirstName').value,
            lastName: document.getElementById('editLastName').value,
            email: document.getElementById('editEmail').value
        };

        const levelField = document.getElementById('editLevelField');
        if (!levelField.classList.contains('hidden')) {
            updates.level = document.getElementById('editLevel').value;
        }

        try {
            const response = await fetch(`/api/admin/users/${this.currentEditingUser}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                this.hideEditUserModal();
                await this.loadAllUsers();
                await this.loadAdminDashboard();
                this.showMessage('User updated successfully', 'success');
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'Failed to update user', 'error');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            this.showMessage('Failed to update user', 'error');
        }
    }

    async deleteUser(userId, userName) {
        console.log('Delete user clicked:', userId, userName);
        
        if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
            return;
        }

        try {
            const url = `/api/admin/users/${userId}`;
            console.log('Deleting user at:', url);
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            console.log('Delete response status:', response.status);

            if (response.ok) {
                this.showMessage('User deleted successfully', 'success');
                // Reload the users list
                const currentRole = document.querySelector('[id*="Tab"][class*="border-primary"]')?.id;
                if (currentRole) {
                    this.showUsers(currentRole.replace('Tab', '').toLowerCase());
                }
                await this.loadAdminDashboard();
            } else {
                const data = await response.json();
                console.error('Delete error:', data);
                this.showMessage(data.message || 'Failed to delete user', 'error');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showMessage('Failed to delete user', 'error');
        }
    }

    async resetUserPassword(userId, userName) {
        if (!confirm(`Reset password for ${userName}? A new password will be generated.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                
                // Show the new password in an alert
                alert(`Password reset successfully!\n\nNew Password: ${data.newPassword}\n\nPlease save this password and share it with the user.`);
                
                this.showMessage('Password reset successfully', 'success');
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'Failed to reset password', 'error');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            this.showMessage('Failed to reset password', 'error');
        }
    }

    async loadAcademicYears() {
        try {
            const response = await fetch(`/api/admin/academic-years`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                this.academicYears = await response.json();
                this.displayAcademicYears();
            }
        } catch (error) {
            console.error('Error loading academic years:', error);
        }
    }

    displayAcademicYears() {
        const container = document.getElementById('academicYearsContainer');
        container.innerHTML = '';

        if (!this.academicYears || this.academicYears.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No academic years configured</p>';
            return;
        }

        this.academicYears.forEach(year => {
            const yearCard = document.createElement('div');
            yearCard.className = `bg-gray-50 rounded-lg p-4 flex items-center justify-between border ${year.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'}`;
            yearCard.innerHTML = `
                <div class="flex-1">
                    <h4 class="font-semibold text-lg">${year.year}</h4>
                    ${year.isActive ? `<p class="text-sm text-green-600">Active</p>` : '<p class="text-sm text-gray-500">Inactive</p>'}
                </div>
                <div class="flex space-x-2 items-center">
                    ${year.isActive ? `
                        <label class="text-sm text-gray-600">Term:</label>
                        <select onchange="app.changeActiveTerm('${year._id}', this.value)" class="px-2 py-1 border rounded text-sm bg-white">
                            <option value="1st Term" ${year.currentTerm === '1st Term' ? 'selected' : ''}>1st Term</option>
                            <option value="2nd Term" ${year.currentTerm === '2nd Term' ? 'selected' : ''}>2nd Term</option>
                            <option value="3rd Term" ${year.currentTerm === '3rd Term' ? 'selected' : ''}>3rd Term</option>
                        </select>
                    ` : `
                        <select onchange="app.activateAcademicYear('${year._id}', this.value)" class="px-2 py-1 border rounded text-sm">
                            <option value="">Set Active</option>
                            <option value="1st Term">1st Term</option>
                            <option value="2nd Term">2nd Term</option>
                            <option value="3rd Term">3rd Term</option>
                        </select>
                    `}
                    ${!year.isActive ? `
                        <button onclick="app.deleteAcademicYear('${year._id}', '${year.year}')" class="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded text-sm hover:opacity-90 shadow">
                            Delete
                        </button>
                    ` : ''}
                </div>
            `;
            container.appendChild(yearCard);
        });
    }

    showAddAcademicYearModal() {
        document.getElementById('addAcademicYearModal').classList.remove('hidden');
    }

    hideAddAcademicYearModal() {
        document.getElementById('addAcademicYearModal').classList.add('hidden');
        document.getElementById('addAcademicYearForm').reset();
    }

    async handleAddAcademicYear(e) {
        e.preventDefault();
        const year = document.getElementById('newAcademicYear').value;

        try {
            const response = await fetch(`/api/admin/academic-years`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ year })
            });

            if (response.ok) {
                this.hideAddAcademicYearModal();
                await this.loadAcademicYears();
                this.showMessage('Academic year added successfully', 'success');
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'Failed to add academic year', 'error');
            }
        } catch (error) {
            console.error('Error adding academic year:', error);
            this.showMessage('Failed to add academic year', 'error');
        }
    }

    async activateAcademicYear(yearId, term) {
        if (!term) return;

        try {
            const response = await fetch(`/api/admin/academic-years/${yearId}/activate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ currentTerm: term })
            });

            if (response.ok) {
                await this.loadAcademicYears();
                this.showMessage('Academic year activated successfully', 'success');
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'Failed to activate academic year', 'error');
            }
        } catch (error) {
            console.error('Error activating academic year:', error);
            this.showMessage('Failed to activate academic year', 'error');
        }
    }

    async changeActiveTerm(yearId, term) {
        try {
            const response = await fetch(`/api/admin/academic-years/${yearId}/activate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ currentTerm: term })
            });

            if (response.ok) {
                await this.loadAcademicYears();
                this.showMessage('Term updated successfully', 'success');
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'Failed to update term', 'error');
            }
        } catch (error) {
            console.error('Error updating term:', error);
            this.showMessage('Failed to update term', 'error');
        }
    }

    async deleteAcademicYear(yearId, year) {
        if (!confirm(`Delete academic year ${year}?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/academic-years/${yearId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                await this.loadAcademicYears();
                this.showMessage('Academic year deleted successfully', 'success');
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'Failed to delete academic year', 'error');
            }
        } catch (error) {
            console.error('Error deleting academic year:', error);
            this.showMessage('Failed to delete academic year', 'error');
        }
    }

    // New feature methods
    showAdminSection(section) {
        // Hide all sections
        document.getElementById('usersManagementSection').style.display = 'none';
        document.getElementById('invitationsSection').style.display = 'none';
        document.getElementById('bulkImportSection').style.display = 'none';
        document.getElementById('announcementsSection').style.display = 'none';
        document.getElementById('adminAnalyticsSection').style.display = 'none';
        document.getElementById('auditLogsSection').style.display = 'none';

        // Remove active border from all tabs
        document.getElementById('usersManagementTab').classList.remove('border-primary');
        document.getElementById('usersManagementTab').classList.add('border-transparent');
        document.getElementById('invitationsTab').classList.remove('border-primary');
        document.getElementById('invitationsTab').classList.add('border-transparent');
        document.getElementById('bulkImportTab').classList.remove('border-primary');
        document.getElementById('bulkImportTab').classList.add('border-transparent');
        document.getElementById('announcementsTab').classList.remove('border-primary');
        document.getElementById('announcementsTab').classList.add('border-transparent');
        document.getElementById('analyticsTab').classList.remove('border-primary');
        document.getElementById('analyticsTab').classList.add('border-transparent');
        document.getElementById('auditLogsTab').classList.remove('border-primary');
        document.getElementById('auditLogsTab').classList.add('border-transparent');

        // Show selected section and mark tab as active
        if (section === 'users') {
            document.getElementById('usersManagementSection').style.display = 'block';
            document.getElementById('usersManagementTab').classList.remove('border-transparent');
            document.getElementById('usersManagementTab').classList.add('border-primary');
            this.showUsers('admins');
        } else if (section === 'invitations') {
            document.getElementById('invitationsSection').style.display = 'block';
            document.getElementById('invitationsTab').classList.remove('border-transparent');
            document.getElementById('invitationsTab').classList.add('border-primary');
            this.loadInvitations();
        } else if (section === 'bulkImport') {
            document.getElementById('bulkImportSection').style.display = 'block';
            document.getElementById('bulkImportTab').classList.remove('border-transparent');
            document.getElementById('bulkImportTab').classList.add('border-primary');
        } else if (section === 'announcements') {
            document.getElementById('announcementsSection').style.display = 'block';
            document.getElementById('announcementsTab').classList.remove('border-transparent');
            document.getElementById('announcementsTab').classList.add('border-primary');
        } else if (section === 'analytics') {
            const analyticsSection = document.getElementById('adminAnalyticsSection');
            analyticsSection.style.display = 'block';
            console.log('Analytics section visible:', analyticsSection.style.display);
            document.getElementById('analyticsTab').classList.remove('border-transparent');
            document.getElementById('analyticsTab').classList.add('border-primary');
            this.loadAnalyticsYears();
        } else if (section === 'auditLogs') {
            document.getElementById('auditLogsSection').style.display = 'block';
            document.getElementById('auditLogsTab').classList.remove('border-transparent');
            document.getElementById('auditLogsTab').classList.add('border-primary');
            this.loadAuditLogs();
        }
    }

    showSendInvitationModal() {
        document.getElementById('sendInvitationModal').classList.remove('hidden');
    }

    hideSendInvitationModal() {
        document.getElementById('sendInvitationModal').classList.add('hidden');
        document.getElementById('sendInvitationForm').reset();
    }

    async handleSendInvitation(e) {
        e.preventDefault();
        const email = document.getElementById('inviteEmail').value;
        const role = document.getElementById('inviteRole').value;

        try {
            const response = await fetch(`/api/invitations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ email, role })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Invitation sent successfully', 'success');
                this.hideSendInvitationModal();
                this.loadInvitations();
            } else {
                this.showMessage(data.message || 'Failed to send invitation', 'error');
            }
        } catch (error) {
            console.error('Error sending invitation:', error);
            this.showMessage('Error sending invitation', 'error');
        }
    }

    async loadInvitations() {
        try {
            const response = await fetch(`/api/invitations`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            const invitations = await response.json();
            const container = document.getElementById('invitationsContainer');
            container.innerHTML = '';

            if (invitations.length === 0) {
                container.innerHTML = '<p class="text-gray-600">No invitations yet</p>';
                return;
            }

            invitations.forEach(inv => {
                const statusColor = inv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                   inv.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                const html = `
                    <div class="border border-gray-200 rounded-lg p-4">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <p class="font-medium">${inv.email}</p>
                                <p class="text-sm text-gray-600">Role: ${inv.role}</p>
                                <p class="text-sm text-gray-600">Expires: ${new Date(inv.expiresAt).toLocaleDateString()}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-sm ${statusColor}">${inv.status}</span>
                        </div>
                    </div>
                `;
                container.innerHTML += html;
            });
        } catch (error) {
            console.error('Error loading invitations:', error);
            this.showMessage('Error loading invitations', 'error');
        }
    }

    showBulkImportModal(type) {
        this.currentImportType = type;
        document.getElementById('bulkImportModal').classList.remove('hidden');
    }

    hideBulkImportModal() {
        document.getElementById('bulkImportModal').classList.add('hidden');
        document.getElementById('bulkImportForm').reset();
    }

    async handleBulkImport(e) {
        e.preventDefault();
        const csv = document.getElementById('csvData').value;
        const type = this.currentImportType;

        try {
            const endpoint = type === 'students' ? '/api/admin/import/students' : '/api/admin/import/teachers';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ csv })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(`Import successful: ${data.success.length} imported`, 'success');
                this.displayImportResults(data);
                this.hideBulkImportModal();
            } else {
                this.showMessage(data.message || 'Import failed', 'error');
            }
        } catch (error) {
            console.error('Error importing:', error);
            this.showMessage('Error importing data', 'error');
        }
    }

    displayImportResults(results) {
        const container = document.getElementById('importResultsContainer');
        container.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 class="font-bold text-green-900">Import Results</h3>
                <p class="text-sm text-green-800">Successful: ${results.success.length}</p>
                <p class="text-sm text-red-800">Failed: ${results.errors.length}</p>
            </div>
        `;
    }

    async handleSendAnnouncement(e) {
        e.preventDefault();
        const title = document.getElementById('announcementTitle').value;
        const message = document.getElementById('announcementMessage').value;
        const recipients = document.getElementById('announcementRecipients').value;

        try {
            const response = await fetch(`/api/admin/announcements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ title, message, recipients })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(`Announcement sent to ${data.recipientCount} users`, 'success');
                document.getElementById('announcementForm').reset();
            } else {
                this.showMessage(data.message || 'Failed to send announcement', 'error');
            }
        } catch (error) {
            console.error('Error sending announcement:', error);
            this.showMessage('Error sending announcement', 'error');
        }
    }

    loadAnalyticsYears() {
        const yearSelect = document.getElementById('analyticsYear');
        if (!yearSelect) return;
        
        // Load from existing academic years
        fetch(`/api/admin/academic-years`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(r => r.json())
        .then(years => {
            console.log('Years fetched:', years);
            if (years && years.length > 0) {
                // Reset and populate
                yearSelect.innerHTML = '';
                years.forEach((y, index) => {
                    const opt = document.createElement('option');
                    opt.value = y.name || y.year;
                    opt.textContent = y.name || y.year;
                    yearSelect.appendChild(opt);
                });
                yearSelect.value = years[0].name || years[0].year;
            }
        })
        .catch(err => console.error('Error loading years:', err));
    }

    async handleLoadAnalytics(e) {
        e.preventDefault();
        
        // Prevent duplicate submissions
        if (this.analyticsLoading) return;
        this.analyticsLoading = true;
        
        const year = document.getElementById('analyticsYear').value;
        const term = document.getElementById('analyticsTerm').value;
        console.log('Loading analytics for year:', year, 'term:', term);

        if (!year || !term) {
            this.showMessage('Please select academic year and term', 'error');
            this.analyticsLoading = false;
            return;
        }

        try {
            const url = `/api/analytics/overview?academicYear=${year}&term=${term}`;
            console.log('Fetching:', url);
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            const data = await response.json();
            console.log('Analytics response:', data);
            const container = document.getElementById('analyticsContainer');
            const analyticsSection = document.getElementById('adminAnalyticsSection');
            console.log('Container:', container);
            console.log('Section:', analyticsSection);

            if (response.ok && data && data.summary) {
                let html = `
                    <div style="background-color: #dbeafe; border: 1px solid #bfdbfe; border-radius: 0.5rem; padding: 1rem; margin-top: 2rem; display: block;">
                        <h3 style="font-weight: bold; margin-bottom: 0.75rem;">Institution Summary</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem;">
                            <div><p style="font-size: 0.875rem; color: #4b5563;">Total Students</p><p style="font-size: 1.5rem; font-weight: bold;">${data.summary.totalStudents || 0}</p></div>
                            <div><p style="font-size: 0.875rem; color: #4b5563;">Total Courses</p><p style="font-size: 1.5rem; font-weight: bold;">${data.summary.totalCourses || 0}</p></div>
                            <div><p style="font-size: 0.875rem; color: #4b5563;">Institution Average</p><p style="font-size: 1.5rem; font-weight: bold;">${Math.round(data.summary.institutionAverage * 100) / 100 || 0}%</p></div>
                            <div><p style="font-size: 0.875rem; color: #4b5563;">Levels with Data</p><p style="font-size: 1.5rem; font-weight: bold;">${data.summary.levelsWithData || 0}</p></div>
                        </div>
                    </div>
                `;
                
                if (data.levelBreakdown && data.levelBreakdown.length > 0) {
                    html += `
                        <div style="background-color: #dcfce7; border: 1px solid #bbf7d0; border-radius: 0.5rem; padding: 1rem; margin-top: 1rem; display: block;">
                            <h3 style="font-weight: bold; margin-bottom: 0.75rem;">Level Breakdown</h3>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    `;
                    data.levelBreakdown.forEach(level => {
                        html += `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background-color: white; border-radius: 0.25rem; display: flex;">
                                <span>${level.level}</span>
                                <span style="font-weight: bold;">${level.studentCount} students, ${level.courseCount} courses</span>
                            </div>
                        `;
                    });
                    html += `
                            </div>
                        </div>
                    `;
                }
                
                // Replace entire section content to ensure visibility
                analyticsSection.innerHTML = analyticsSection.innerHTML.substring(0, analyticsSection.innerHTML.indexOf('<div id="analyticsContainer"')) + 
                    '<div id="analyticsContainer" style="display: block; width: 100%; visibility: visible;">' + html + '</div>';
                console.log('Analytics rendered successfully');
            } else {
                container.innerHTML = '<p style="color: #6b7280; margin-top: 2rem; display: block;">No analytics data available</p>';
                console.log('Response not ok or no summary data');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showMessage('Error loading analytics', 'error');
        } finally {
            this.analyticsLoading = false;
        }
    }

    async loadAuditLogs() {
         try {
             const response = await fetch(`/api/backup/audit-logs`, {
                 headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
             });

             const data = await response.json();
             const container = document.getElementById('auditLogsContainer');
             container.innerHTML = '';

             if (!data.logs || data.logs.length === 0) {
                 container.innerHTML = '<p class="text-gray-600">No audit logs available</p>';
                 return;
             }

             data.logs.slice(0, 50).forEach(log => {
                 const html = `
                     <div class="border border-gray-200 rounded-lg p-3 text-sm">
                         <p class="font-medium">${log.action}</p>
                         <p class="text-gray-600">${new Date(log.createdAt).toLocaleString()}</p>
                     </div>
                 `;
                 container.innerHTML += html;
             });
         } catch (error) {
             console.error('Error loading audit logs:', error);
         }
     }

    // Teacher Section Methods
    showTeacherSection(section) {
        // Hide all sections
        document.getElementById('dashboardSection').classList.add('hidden');
        document.getElementById('reportsSection').classList.add('hidden');
        document.getElementById('analyticsSection').classList.add('hidden');
        document.getElementById('attendanceSection').classList.add('hidden');

        // Remove active border from all tabs
        ['dashboardTab', 'reportsTab', 'teacherAnalyticsTab', 'attendanceTab'].forEach(id => {
            document.getElementById(id).classList.remove('border-primary');
            document.getElementById(id).classList.add('border-transparent');
        });

        // Show selected section
        if (section === 'dashboard') {
            document.getElementById('dashboardSection').classList.remove('hidden');
            document.getElementById('dashboardTab').classList.add('border-primary');
            this.loadTeacherDashboard();
        } else if (section === 'reports') {
            document.getElementById('reportsSection').classList.remove('hidden');
            document.getElementById('reportsTab').classList.add('border-primary');
            this.loadTeacherReports();
        } else if (section === 'analytics') {
            document.getElementById('analyticsSection').classList.remove('hidden');
            document.getElementById('teacherAnalyticsTab').classList.add('border-primary');
        } else if (section === 'attendance') {
            document.getElementById('attendanceSection').classList.remove('hidden');
            document.getElementById('attendanceTab').classList.add('border-primary');
        }
    }

    async loadTeacherReports() {
        try {
            const response = await fetch(`/api/reports/teacher?academicYear=${this.currentAcademicYear}&term=${this.currentTerm}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.allCourses = data.courses || [];
                this.populateReportCourses();
                
                // Add event listener for level change
                document.getElementById('reportLevel').addEventListener('change', () => this.populateReportCourses());
            }
        } catch (error) {
            console.error('Error loading reports:', error);
        }
    }

    populateReportCourses() {
        const selectedLevel = document.getElementById('reportLevel').value;
        const select = document.getElementById('reportCourse');
        select.innerHTML = '<option value="">All Courses</option>';
        
        let filteredCourses = this.allCourses;
        if (selectedLevel) {
            filteredCourses = this.allCourses.filter(course => course.level === selectedLevel);
        }
        
        filteredCourses.forEach(course => {
            const opt = document.createElement('option');
            opt.value = course._id;
            opt.textContent = course.name;
            select.appendChild(opt);
        });
    }

    async handleGenerateReport() {
        const level = document.getElementById('reportLevel').value;
        const course = document.getElementById('reportCourse').value;
        
        try {
            const params = new URLSearchParams({
                academicYear: this.currentAcademicYear,
                term: this.currentTerm,
                ...(level && { level }),
                ...(course && { courseId: course })
            });

            const response = await fetch(`/api/reports/generate?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                const container = document.getElementById('reportContainer');
                container.innerHTML = '';
                
                if (data.students && data.students.length > 0) {
                    const table = document.createElement('div');
                    table.className = 'overflow-auto border rounded-lg';
                    table.innerHTML = `
                        <table class="w-full text-sm">
                            <thead class="bg-gray-100 border-b">
                                <tr>
                                    <th class="p-2 text-left">Student</th>
                                    <th class="p-2 text-left">Level</th>
                                    <th class="p-2 text-center">Course</th>
                                    <th class="p-2 text-center">Average</th>
                                    <th class="p-2 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.students.map(student => `
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="p-2">${student.firstName} ${student.lastName}</td>
                                        <td class="p-2">${student.level || '-'}</td>
                                        <td class="p-2 text-center">${data.courseFilter || 'All'}</td>
                                        <td class="p-2 text-center font-semibold">${student.average ? student.average.toFixed(2) : '-'}%</td>
                                        <td class="p-2 text-center">
                                            <span class="px-2 py-1 rounded text-xs font-semibold ${student.average >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${student.average >= 70 ? 'Pass' : 'Fail'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                    container.appendChild(table);

                    const downloadBtn = document.createElement('button');
                    downloadBtn.className = 'bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 mt-4';
                    downloadBtn.textContent = 'Download as PDF';
                    downloadBtn.addEventListener('click', () => this.downloadReportPDF(data));
                    container.appendChild(downloadBtn);
                } else {
                    container.innerHTML = '<p class="text-gray-600 text-center py-4">No data available for selected filters</p>';
                }
            }
        } catch (error) {
            console.error('Error generating report:', error);
            this.showMessage('Error generating report', 'error');
        }
    }

    async handleLoadTeacherAnalytics() {
        const level = document.getElementById('analyticsLevel').value;
        
        try {
            const params = new URLSearchParams({
                academicYear: this.currentAcademicYear,
                term: this.currentTerm,
                ...(level && { level })
            });

            const response = await fetch(`/api/analytics/class?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                const container = document.getElementById('analyticsContainer');
                container.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <p class="text-sm text-gray-600">Class Average</p>
                            <p class="text-2xl font-bold text-blue-600">${data.classAverage ? data.classAverage.toFixed(2) : '-'}%</p>
                        </div>
                        <div class="bg-green-50 rounded-lg p-4 border border-green-200">
                            <p class="text-sm text-gray-600">Highest Score</p>
                            <p class="text-2xl font-bold text-green-600">${data.highestScore || '-'}%</p>
                        </div>
                        <div class="bg-red-50 rounded-lg p-4 border border-red-200">
                            <p class="text-sm text-gray-600">Lowest Score</p>
                            <p class="text-2xl font-bold text-red-600">${data.lowestScore || '-'}%</p>
                        </div>
                        <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <p class="text-sm text-gray-600">Pass Rate</p>
                            <p class="text-2xl font-bold text-purple-600">${data.passRate || '-'}%</p>
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4 border">
                        <h3 class="font-semibold mb-3">Student Performance Distribution</h3>
                        <div class="space-y-2">
                            <div><p class="text-sm text-gray-600">Excellent (90-100): <span class="font-bold">${data.distribution?.excellent || 0}</span></p></div>
                            <div><p class="text-sm text-gray-600">Good (75-89): <span class="font-bold">${data.distribution?.good || 0}</span></p></div>
                            <div><p class="text-sm text-gray-600">Average (60-74): <span class="font-bold">${data.distribution?.average || 0}</span></p></div>
                            <div><p class="text-sm text-gray-600">Below Average (<60): <span class="font-bold">${data.distribution?.belowAverage || 0}</span></p></div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showMessage('Error loading analytics', 'error');
        }
    }

    async loadAttendanceStudents() {
        const level = document.getElementById('attendanceLevel').value;
        const date = document.getElementById('attendanceDate').value;

        if (!level) {
            this.showMessage('Please select a level', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/attendance/students?level=${level}&date=${date || new Date().toISOString().split('T')[0]}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const students = await response.json();
                const container = document.getElementById('attendanceStudentsContainer');
                container.innerHTML = '';

                if (students.length === 0) {
                    container.innerHTML = '<p class="text-gray-600">No students in this level</p>';
                    return;
                }

                students.forEach(student => {
                    const div = document.createElement('div');
                    div.className = 'flex items-center gap-3 p-3 bg-white rounded border';
                    div.innerHTML = `
                        <input type="checkbox" class="attendance-checkbox" data-student-id="${student._id}" />
                        <label class="flex-1 cursor-pointer">${student.firstName} ${student.lastName}</label>
                    `;
                    container.appendChild(div);
                });
            }
        } catch (error) {
            console.error('Error loading students:', error);
            this.showMessage('Error loading students', 'error');
        }
    }

    async handleSubmitAttendance(e) {
        e.preventDefault();
        const level = document.getElementById('attendanceLevel').value;
        const date = document.getElementById('attendanceDate').value;
        const checkboxes = document.querySelectorAll('.attendance-checkbox:checked');
        const presentStudents = Array.from(checkboxes).map(cb => cb.dataset.studentId);

        if (!level || !date) {
            this.showMessage('Please select level and date', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    level,
                    date,
                    presentStudents,
                    academicYear: this.currentAcademicYear,
                    term: this.currentTerm
                })
            });

            if (response.ok) {
                this.showMessage('Attendance recorded successfully', 'success');
                document.getElementById('attendanceForm').reset();
                document.getElementById('attendanceStudentsContainer').innerHTML = '';
            } else {
                const data = await response.json();
                this.showMessage(data.message || 'Failed to submit attendance', 'error');
            }
        } catch (error) {
            console.error('Error submitting attendance:', error);
            this.showMessage('Error submitting attendance', 'error');
        }
    }

    // Student Section Methods
    showStudentSection(section) {
        // Hide all sections
        document.getElementById('studentGradesSection').classList.add('hidden');
        document.getElementById('studentNotificationsSection').classList.add('hidden');
        document.getElementById('studentReportsSection').classList.add('hidden');

        // Remove active border from all tabs
        ['studentGradesTab', 'studentNotificationsTab', 'studentReportsTab'].forEach(id => {
            document.getElementById(id).classList.remove('border-primary');
            document.getElementById(id).classList.add('border-transparent');
        });

        // Show selected section
        if (section === 'grades') {
            document.getElementById('studentGradesSection').classList.remove('hidden');
            document.getElementById('studentGradesTab').classList.add('border-primary');
            this.loadStudentGrades();
        } else if (section === 'notifications') {
            document.getElementById('studentNotificationsSection').classList.remove('hidden');
            document.getElementById('studentNotificationsTab').classList.add('border-primary');
            this.loadStudentNotifications();
        } else if (section === 'reports') {
            document.getElementById('studentReportsSection').classList.remove('hidden');
            document.getElementById('studentReportsTab').classList.add('border-primary');
        }
    }

    async loadStudentGrades() {
        try {
            const response = await fetch(`/api/students/grades?academicYear=${this.currentAcademicYear}&term=${this.currentTerm}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('studentOverallAverage').textContent = data.overallAverage ? data.overallAverage.toFixed(2) + '%' : '--';
                document.getElementById('studentCourseCount').textContent = data.courseCount || 0;
                document.getElementById('studentAssessmentCount').textContent = data.assessmentCount || 0;
            }
        } catch (error) {
            console.error('Error loading grades:', error);
        }
    }

    async loadStudentNotifications() {
        try {
            const response = await fetch(`/api/students/notifications`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const notifications = await response.json();
                const container = document.getElementById('notificationsContainer');
                container.innerHTML = '';

                if (notifications.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-8">No notifications yet</p>';
                    return;
                }

                notifications.forEach(notif => {
                    const div = document.createElement('div');
                    div.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4';
                    div.innerHTML = `
                        <h3 class="font-semibold text-blue-900">${notif.title}</h3>
                        <p class="text-sm text-blue-800 mt-1">${notif.message}</p>
                        <p class="text-xs text-blue-600 mt-2">${new Date(notif.createdAt).toLocaleDateString()}</p>
                    `;
                    container.appendChild(div);
                });
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    async downloadGradeReport() {
        try {
            const response = await fetch(`/api/reports/download/grades?academicYear=${this.currentAcademicYear}&term=${this.currentTerm}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `grade-report-${this.currentAcademicYear}-${this.currentTerm}.pdf`;
                a.click();
                this.showMessage('Report downloaded successfully', 'success');
            } else {
                this.showMessage('Failed to download report', 'error');
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            this.showMessage('Error downloading report', 'error');
        }
    }

    async downloadPerformanceReport() {
        try {
            const response = await fetch(`/api/reports/download/performance?academicYear=${this.currentAcademicYear}&term=${this.currentTerm}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `performance-report-${this.currentAcademicYear}-${this.currentTerm}.pdf`;
                a.click();
                this.showMessage('Report downloaded successfully', 'success');
            } else {
                this.showMessage('Failed to download report', 'error');
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            this.showMessage('Error downloading report', 'error');
        }
    }

    downloadReportPDF(data) {
        // Basic PDF generation - consider using a library like jsPDF for production
        const csv = [
            ['Student', 'Level', 'Average', 'Status'].join(',')
        ];
        
        if (data.students) {
            data.students.forEach(student => {
                csv.push([
                    `"${student.firstName} ${student.lastName}"`,
                    student.level || '-',
                    student.average ? student.average.toFixed(2) : '-',
                    student.average >= 70 ? 'Pass' : 'Fail'
                ].join(','));
            });
        }

        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `class-report-${this.currentAcademicYear}-${this.currentTerm}.csv`;
        a.click();
    }
}

// Initialize the app
const app = new PerformanceTracker();

// Make app globally accessible for inline onclick handlers
window.app = app;
