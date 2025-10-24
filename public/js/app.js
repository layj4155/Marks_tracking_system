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
            if (e.target.value === 'student') {
                levelField.classList.remove('hidden');
                teacherWordField.classList.add('hidden');
                document.getElementById('regLevel').required = true;
                document.getElementById('regTeacherWord').required = false;
            } else if (e.target.value === 'teacher') {
                levelField.classList.add('hidden');
                teacherWordField.classList.remove('hidden');
                document.getElementById('regLevel').required = false;
                document.getElementById('regTeacherWord').required = true;
            } else {
                levelField.classList.add('hidden');
                teacherWordField.classList.add('hidden');
                document.getElementById('regLevel').required = false;
                document.getElementById('regTeacherWord').required = false;
            }
        });

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        // Logout buttons
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('studentLogoutBtn').addEventListener('click', () => this.logout());

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
            const response = await fetch('/api/auth/login', {
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
        const formData = {
            firstName: document.getElementById('regFirstName').value,
            lastName: document.getElementById('regLastName').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            role: document.getElementById('regRole').value,
            level: document.getElementById('regLevel').value,
            teacherWord: document.getElementById('regTeacherWord').value
        };

        try {
            const response = await fetch('/api/auth/register', {
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
                this.showMessage(data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            this.showMessage('Registration failed. Please try again.', 'error');
        }
    }

    async checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/auth/me', {
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
        
        // Show academic year selection first
        this.showAcademicYearSelection();
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
                        <button onclick="app.showCourseStudents('${course._id}', '${course.name}')" 
                                class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                            View Students (${course.students.length})
                        </button>
                        <button onclick="app.showAssessmentManagement('${course._id}', '${course.name}')" 
                                class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                            Manage Assessments
                        </button>
                        <button onclick="app.deleteCourse('${course._id}')" 
                                class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                            Delete
                        </button>
                    </div>
                </div>
                <p class="text-gray-600 text-sm">${course.assessments.length} assessments</p>
            `;
            coursesList.appendChild(courseCard);
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
            const response = await fetch('/api/teachers/courses', {
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
        document.getElementById('assessmentModal').classList.remove('hidden');
        this.populateAssessmentStudents();
    }

    hideAssessmentModal() {
        document.getElementById('assessmentModal').classList.add('hidden');
        document.getElementById('assessmentForm').reset();
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
            const response = await fetch('/api/assessments', {
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
            const allStudentsRes = await fetch('/api/courses/students', { 
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
                        <button onclick="app.editAssessment('${assessment._id}')" class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">Edit</button>
                        <button onclick="app.deleteAssessment('${assessment._id}')" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Delete</button>
                    </div>
                </div>
                <div class="text-sm text-gray-600">${assessment.marks.length} students marked</div>
            `;
            container.appendChild(card);
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
    }

    async handleEditAssessment(e) {
        e.preventDefault();
        const marks = Array.from(document.querySelectorAll('#editAssessmentStudentsContainer .grid')).map(row => ({
            studentId: row.querySelector('.font-medium').textContent.split(' ')[0], // This is simplified - you might want to store student ID in data attribute
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
                this.displayStudents(students, courseId, courseName);
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
    }

    displayStudents(students, courseId, courseName) {
        // Create a modal for students
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold gradient-text">${courseName} - Students</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="mb-4">
                    <button onclick="app.showAddStudentModal('${courseId}')" 
                            class="bg-gradient-primary text-white px-4 py-2 rounded-lg hover:opacity-90">
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
                                        <button onclick="app.viewStudentMarks('${courseId}', '${student._id}', '${student.firstName} ${student.lastName}')" 
                                                class="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600">
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
            }
        } catch (error) {
            console.error('Error loading academic info:', error);
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
        } else {
            document.getElementById('studentDashboard').classList.remove('hidden');
            document.getElementById('studentName').textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            this.loadStudentDashboard();
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
            const response = await fetch('/api/auth/forgot-password', {
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
}

// Initialize the app
const app = new PerformanceTracker();
