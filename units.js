document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userData = localStorage.getItem('student_user');
    
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userData);
    const userId = user.id;
    
    // DOM Elements
    const availableUnitsList = document.getElementById('availableUnitsList');
    const registeredUnitsList = document.getElementById('registeredUnitsList');
    const dashboardIcon = document.getElementById('dashboardIcon');
    const dashboardDropdown = document.getElementById('dashboardDropdown');
    
    // State management
    let availableCourses = [];
    let registeredCourses = [];

    // Initialize
    setupDashboard();
    loadAllData();

    // Dashboard functionality
    dashboardIcon.addEventListener('mouseenter', showDashboard);
    dashboardIcon.addEventListener('mouseleave', hideDashboard);

    // Click outside to close dashboard
    document.addEventListener('click', function(event) {
        if (!dashboardIcon.contains(event.target) && !dashboardDropdown.contains(event.target)) {
            hideDashboard();
        }
    });

    // Function to load all data
    async function loadAllData() {
        showLoadingState();
        
        try {
            // Load both available and registered courses in parallel
            const [availableResponse, registeredResponse] = await Promise.all([
                fetch(`/api/student/${userId}/available-courses`),
                fetch(`/api/student/${userId}/courses`)
            ]);

            if (availableResponse.ok && registeredResponse.ok) {
                availableCourses = await availableResponse.json();
                registeredCourses = await registeredResponse.json();
                
                renderAvailableUnits();
                renderRegisteredUnits();
            } else {
                throw new Error('Failed to load data');
            }
        } catch (error) {
            console.error('Error loading units data:', error);
            showErrorMessage('Failed to load units. Please refresh the page.');
        } finally {
            hideLoadingState();
        }
    }

    // Function to render available units
    function renderAvailableUnits() {
        availableUnitsList.innerHTML = '';
        
        if (availableCourses.length === 0) {
            availableUnitsList.innerHTML = `
                <li style="
                    text-align: center;
                    padding: 20px;
                    color: #aaa;
                    font-style: italic;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                ">
                    No available units. You have registered for all courses!
                </li>
            `;
            return;
        }

        availableCourses.forEach(course => {
            const li = document.createElement('li');
            li.dataset.courseId = course.id;
            
            const courseInfo = document.createElement('div');
            courseInfo.className = 'course-info';
            courseInfo.innerHTML = `
                <strong>${course.code}</strong> - ${course.name}
            `;
            
            const registerBtn = document.createElement('button');
            registerBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Register';
            registerBtn.className = 'register-btn';
            
            registerBtn.addEventListener('click', () => registerForCourse(course.id));
            
            li.appendChild(courseInfo);
            li.appendChild(registerBtn);
            availableUnitsList.appendChild(li);
        });
    }

    // Function to render registered units
    function renderRegisteredUnits() {
        registeredUnitsList.innerHTML = '';
        
        if (registeredCourses.length === 0) {
            registeredUnitsList.innerHTML = `
                <li style="
                    text-align: center;
                    padding: 20px;
                    color: #aaa;
                    font-style: italic;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                ">
                    You haven't registered for any units yet.
                    <br>
                    <small>Select from available units above</small>
                </li>
            `;
            return;
        }

        registeredCourses.forEach(course => {
            const li = document.createElement('li');
            li.dataset.courseId = course.id;
            
            const courseInfo = document.createElement('div');
            courseInfo.className = 'course-info';
            courseInfo.innerHTML = `
                <strong>${course.code}</strong> - ${course.name}
                <br>
                <small>Registered: ${formatDate(course.registered_at)}</small>
            `;
            
            const dropBtn = document.createElement('button');
            dropBtn.innerHTML = '<i class="fas fa-times-circle"></i> Drop';
            dropBtn.className = 'drop-btn';
            
            dropBtn.addEventListener('click', () => dropCourse(course.id));
            
            li.appendChild(courseInfo);
            li.appendChild(dropBtn);
            registeredUnitsList.appendChild(li);
        });
    }

    // Function to register for a course
    async function registerForCourse(courseId) {
        const course = availableCourses.find(c => c.id === courseId);
        if (!course) return;

        // Show confirmation
        const confirmed = await showConfirmation(
            `Register for ${course.code} - ${course.name}?`
        );
        
        if (!confirmed) return;

        try {
            const response = await fetch('/api/register-course', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: userId,
                    courseId: courseId
                })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                // Move course from available to registered
                const courseIndex = availableCourses.findIndex(c => c.id === courseId);
                if (courseIndex > -1) {
                    const [registeredCourse] = availableCourses.splice(courseIndex, 1);
                    registeredCourse.registered_at = new Date().toISOString();
                    registeredCourses.push(registeredCourse);
                    
                    // Re-render both lists
                    renderAvailableUnits();
                    renderRegisteredUnits();
                    
                    showSuccessMessage(`Successfully registered for ${course.code}!`);
                    
                    // Notify profile page if it's open
                    notifyProfileUpdate();
                }
            } else {
                throw new Error(result.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showErrorMessage(`Failed to register: ${error.message}`);
        }
    }

    // Function to drop a course
    async function dropCourse(courseId) {
        const course = registeredCourses.find(c => c.id === courseId);
        if (!course) return;

        // Show confirmation with warning
        const confirmed = await showConfirmation(
            `Are you sure you want to drop ${course.code} - ${course.name}?`,
            true
        );
        
        if (!confirmed) return;

        try {
            const response = await fetch('/api/drop-course', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: userId,
                    courseId: courseId
                })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                // Move course from registered to available
                const courseIndex = registeredCourses.findIndex(c => c.id === courseId);
                if (courseIndex > -1) {
                    const [availableCourse] = registeredCourses.splice(courseIndex, 1);
                    delete availableCourse.registered_at;
                    availableCourses.push(availableCourse);
                    
                    // Re-render both lists
                    renderAvailableUnits();
                    renderRegisteredUnits();
                    
                    showSuccessMessage(`Successfully dropped ${course.code}.`);
                    
                    // Notify profile page if it's open
                    notifyProfileUpdate();
                }
            } else {
                throw new Error(result.error || 'Drop failed');
            }
        } catch (error) {
            console.error('Drop error:', error);
            showErrorMessage(`Failed to drop course: ${error.message}`);
        }
    }

    // Function to setup dashboard
    function setupDashboard() {
        // Add animation for dashboard
        const style = document.createElement('style');
        style.textContent = `
            @keyframes dashSlide {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .dashboard-dropdown {
                animation: dashSlide 0.3s ease-out;
            }
            
            .register-btn, .drop-btn {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 14px;
                padding: 6px 12px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .register-btn {
                background-color: #8a2be2;
                color: white;
            }
            
            .register-btn:hover {
                background-color: #00ffff;
                color: black;
                box-shadow: 0 0 10px #00ffff;
            }
            
            .drop-btn {
                background-color: #ff4444;
                color: white;
            }
            
            .drop-btn:hover {
                background-color: #ff6666;
                box-shadow: 0 0 10px #ff4444;
            }
            
            .course-info {
                flex-grow: 1;
            }
            
            .course-info small {
                color: #aaa;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    // Function to show dashboard
    function showDashboard() {
        dashboardDropdown.style.display = 'flex';
        dashboardDropdown.style.animation = 'dashSlide 0.3s ease-out';
    }

    // Function to hide dashboard
    function hideDashboard() {
        dashboardDropdown.style.display = 'none';
    }

    // Function to format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Recent';
        }
    }

    // Function to show confirmation dialog
    function showConfirmation(message, isWarning = false) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: rgba(0,0,0,0.8);
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                max-width: 400px;
                width: 90%;
                border: 2px solid ${isWarning ? '#ff4444' : '#8a2be2'};
            `;
            
            dialog.innerHTML = `
                <h3 style="color: ${isWarning ? '#ff4444' : '#00ffff'}; margin-top: 0;">
                    <i class="fas fa-exclamation-triangle"></i> ${isWarning ? 'Warning' : 'Confirm'}
                </h3>
                <p style="margin: 20px 0;">${message}</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="confirmYes" style="
                        padding: 10px 20px;
                        background: ${isWarning ? '#ff4444' : '#8a2be2'};
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Yes</button>
                    <button id="confirmNo" style="
                        padding: 10px 20px;
                        background: #666;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    ">No</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            dialog.querySelector('#confirmYes').addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(true);
            });
            
            dialog.querySelector('#confirmNo').addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(false);
            });
            
            // Close on escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', handleEscape);
                    resolve(false);
                }
            };
            
            document.addEventListener('keydown', handleEscape);
        });
    }

    // Function to show loading state
    function showLoadingState() {
        availableUnitsList.innerHTML = `
            <li style="text-align: center; padding: 30px; color: #aaa;">
                <i class="fas fa-spinner fa-spin"></i> Loading available units...
            </li>
        `;
        
        registeredUnitsList.innerHTML = `
            <li style="text-align: center; padding: 30px; color: #aaa;">
                <i class="fas fa-spinner fa-spin"></i> Loading registered units...
            </li>
        `;
    }

    // Function to hide loading state
    function hideLoadingState() {
        // Loading states are replaced by render functions
    }

    // Function to show success message
    function showSuccessMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 255, 0, 0.1);
            color: #00ff00;
            padding: 15px 20px;
            border-radius: 8px;
            border: 1px solid #00ff00;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        messageDiv.innerHTML = `
            <i class="fas fa-check-circle"></i> ${message}
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        document.body.removeChild(messageDiv);
                    }
                }, 300);
            }
        }, 3000);
        
        // Add animation styles if not present
        if (!document.querySelector('#messageAnimations')) {
            const style = document.createElement('style');
            style.id = 'messageAnimations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Function to show error message
    function showErrorMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 0, 0, 0.1);
            color: #ff4444;
            padding: 15px 20px;
            border-radius: 8px;
            border: 1px solid #ff4444;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        messageDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i> ${message}
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        document.body.removeChild(messageDiv);
                    }
                }, 300);
            }
        }, 4000);
    }

    // Function to notify profile page about changes
    function notifyProfileUpdate() {
        // Dispatch a custom event that profile.js can listen for
        const event = new CustomEvent('coursesUpdated', {
            detail: { userId: userId }
        });
        window.dispatchEvent(event);
        
        // Also update localStorage timestamp
        const userData = JSON.parse(localStorage.getItem('student_user'));
        if (userData) {
            userData.coursesUpdated = new Date().toISOString();
            localStorage.setItem('student_user', JSON.stringify(userData));
        }
    }

    // Auto-refresh data every 2 minutes
    setInterval(loadAllData, 120000);

    // Listen for keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // R to refresh
        if (event.key === 'r' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            loadAllData();
        }
        
        // Escape to close dashboard
        if (event.key === 'Escape') {
            hideDashboard();
        }
    });

    // Add pull-to-refresh on mobile
    let startY;
    document.addEventListener('touchstart', function(event) {
        startY = event.touches[0].clientY;
    });

    document.addEventListener('touchmove', function(event) {
        if (!startY) return;
        
        const currentY = event.touches[0].clientY;
        const diff = startY - currentY;
        
        if (diff > 100 && window.scrollY === 0) {
            loadAllData();
            startY = null;
        }
    });
});