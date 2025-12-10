document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userData = localStorage.getItem('student_user');
    
    if (!userData) {
        // Redirect to login if not logged in
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userData);
    const userId = user.id;
    
    // DOM Elements
    const studentNameElement = document.getElementById('studentName');
    const fullNameElement = document.getElementById('fullName');
    const usernameElement = document.getElementById('username');
    const emailElement = document.getElementById('email');
    const unitListElement = document.getElementById('unitList');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardIcon = document.getElementById('dashboardIcon');
    const dashboardDropdown = document.getElementById('dashboardDropdown');

    // Initialize dashboard
    setupDashboard();

    // Load user profile data
    loadProfileData();
    
    // Load registered units
    loadRegisteredUnits();

    // Logout functionality
    logoutBtn.addEventListener('click', logoutUser);

    // Dashboard hover functionality
    dashboardIcon.addEventListener('mouseenter', showDashboard);
    dashboardIcon.addEventListener('mouseleave', hideDashboard);

    // Click outside to close dashboard
    document.addEventListener('click', function(event) {
        if (!dashboardIcon.contains(event.target) && !dashboardDropdown.contains(event.target)) {
            hideDashboard();
        }
    });

    // Function to load profile data
    async function loadProfileData() {
        try {
            // Try to get fresh data from server
            const response = await fetch(`/api/profile/${userId}`);
            
            if (response.ok) {
                const freshUserData = await response.json();
                
                // Update display with fresh data
                studentNameElement.textContent = freshUserData.full_name || user.full_name;
                fullNameElement.textContent = freshUserData.full_name || user.full_name;
                usernameElement.textContent = freshUserData.username || user.username;
                emailElement.textContent = freshUserData.email || user.email;
                
                // Update localStorage with fresh data (keeping login status)
                const updatedUser = {
                    ...user,
                    full_name: freshUserData.full_name || user.full_name,
                    username: freshUserData.username || user.username,
                    email: freshUserData.email || user.email
                };
                localStorage.setItem('student_user', JSON.stringify(updatedUser));
                
            } else {
                // If server fails, use cached data
                fallbackToCachedData();
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            fallbackToCachedData();
        }
    }

    // Function to load registered units
    async function loadRegisteredUnits() {
        try {
            const response = await fetch(`/api/student/${userId}/courses`);
            
            if (response.ok) {
                const courses = await response.json();
                displayUnits(courses);
            } else {
                showNoUnitsMessage();
            }
        } catch (error) {
            console.error('Error loading units:', error);
            showNoUnitsMessage();
        }
    }

    // Function to display units
    function displayUnits(courses) {
        if (!courses || courses.length === 0) {
            showNoUnitsMessage();
            return;
        }

        unitListElement.innerHTML = '';
        
        courses.forEach(course => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${course.code || 'N/A'}</strong> - ${course.name || 'Unnamed Course'}
                <br>
                <small>Registered: ${formatDate(course.registered_at)}</small>
            `;
            li.style.cssText = `
                background: rgba(255, 255, 255, 0.1);
                padding: 12px;
                margin-bottom: 8px;
                border-radius: 6px;
                border-left: 4px solid #8a2be2;
                transition: transform 0.2s, background 0.2s;
            `;
            
            li.addEventListener('mouseenter', function() {
                this.style.transform = 'translateX(5px)';
                this.style.background = 'rgba(255, 255, 255, 0.15)';
            });
            
            li.addEventListener('mouseleave', function() {
                this.style.transform = 'translateX(0)';
                this.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            
            unitListElement.appendChild(li);
        });
    }

    // Function to show "no units" message
    function showNoUnitsMessage() {
        unitListElement.innerHTML = `
            <li style="
                background: rgba(255, 255, 255, 0.05);
                padding: 15px;
                border-radius: 6px;
                text-align: center;
                color: #aaa;
                font-style: italic;
            ">
                No units registered yet. 
                <a href="courses.html" style="color: #00ffff; text-decoration: none;">
                    Register for units here
                </a>
            </li>
        `;
    }

    // Function to setup dashboard
    function setupDashboard() {
        // Create animation for dashboard icon
        const style = document.createElement('style');
        style.textContent = `
            @keyframes dashSlide {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .dashboard-dropdown {
                animation: dashSlide 0.3s ease-out;
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
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    // Function to logout user
    function logoutUser() {
        // Show confirmation
        if (confirm('Are you sure you want to logout?')) {
            // Clear all user data
            localStorage.removeItem('student_user');
            localStorage.removeItem('auth_token');
            
            // Optional: Notify server about logout
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            }).catch(error => console.error('Logout notification error:', error));
            
            // Redirect to login page
            window.location.href = 'login.html';
        }
    }

    // Fallback function if server fails
    function fallbackToCachedData() {
        studentNameElement.textContent = user.full_name || 'Student';
        fullNameElement.textContent = user.full_name || 'Not available';
        usernameElement.textContent = user.username || 'Not available';
        emailElement.textContent = user.email || 'Not available';
        
        // Show warning message
        const warning = document.createElement('div');
        warning.innerHTML = `
            <div style="
                background: rgba(255, 165, 0, 0.1);
                color: #ffa500;
                padding: 10px;
                border-radius: 5px;
                margin: 10px 0;
                border: 1px solid #ffa500;
                font-size: 14px;
            ">
                <i class="fas fa-exclamation-triangle"></i>
                Showing cached data. Some information might be outdated.
            </div>
        `;
        
        // Insert warning after header
        const header = document.querySelector('.header');
        header.parentNode.insertBefore(warning, header.nextSibling);
    }

    // Add CSS for icons if not present
    if (!document.querySelector('#profile-icons')) {
        const iconStyle = document.createElement('style');
        iconStyle.id = 'profile-icons';
        iconStyle.textContent = `
            .fa-exclamation-triangle {
                margin-right: 8px;
            }
            
            a {
                color: #00ffff;
                transition: color 0.3s;
            }
            
            a:hover {
                color: #8a2be2;
                text-shadow: 0 0 8px #8a2be2;
            }
        `;
        document.head.appendChild(iconStyle);
    }

    // Auto-refresh data every 5 minutes
    setInterval(() => {
        loadProfileData();
        loadRegisteredUnits();
    }, 300000); // 5 minutes

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Ctrl+L or Cmd+L for logout
        if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
            event.preventDefault();
            logoutUser();
        }
        
        // Escape key to hide dashboard
        if (event.key === 'Escape') {
            hideDashboard();
        }
    });

    // Add session timeout warning
    let timeoutWarning;
    const sessionTimeout = 25 * 60 * 1000; // 25 minutes
    
    function resetSessionTimer() {
        clearTimeout(timeoutWarning);
        timeoutWarning = setTimeout(showSessionWarning, sessionTimeout);
    }
    
    function showSessionWarning() {
        if (confirm('Your session will expire in 5 minutes. Do you want to stay logged in?')) {
            resetSessionTimer();
        } else {
            logoutUser();
        }
    }
    
    // Reset timer on user activity
    ['click', 'mousemove', 'keypress'].forEach(event => {
        document.addEventListener(event, resetSessionTimer);
    });
    
    // Start session timer
    resetSessionTimer();
});