document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.createElement('div');
    messageDiv.id = 'loginMessage';
    messageDiv.style.cssText = `
        margin-top: 15px;
        padding: 10px;
        border-radius: 5px;
        font-weight: bold;
        text-align: center;
        display: none;
    `;
    loginForm.appendChild(messageDiv);

    // Check if user is already logged in
    checkExistingSession();

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Basic validation
        if (!username || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Logging in...';
        submitBtn.disabled = true;

        try {
            // Send login request to backend
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                // Login successful
                showMessage('Login successful! Redirecting...', 'success');
                
                // Store user data in localStorage
                localStorage.setItem('student_user', JSON.stringify({
                    id: result.user.id,
                    username: result.user.username,
                    full_name: result.user.full_name,
                    email: result.user.email,
                    loggedIn: true,
                    loginTime: new Date().toISOString()
                }));

                // Store session token if available
                if (result.token) {
                    localStorage.setItem('auth_token', result.token);
                }

                // Redirect to profile page after 1 second
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1000);

            } else {
                // Login failed
                showMessage(result.error || 'Invalid username or password', 'error');
                shakeForm();
                submitBtn.textContent = 'Login Failed - Try Again';
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }

        } catch (error) {
            // Network or server error
            console.error('Login error:', error);
            showMessage('Connection error. Please try again.', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Function to show messages
    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
        
        if (type === 'success') {
            messageDiv.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
            messageDiv.style.color = '#00ff00';
            messageDiv.style.border = '1px solid #00ff00';
        } else if (type === 'error') {
            messageDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            messageDiv.style.color = '#ff4444';
            messageDiv.style.border = '1px solid #ff4444';
        }
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    }

    // Function to check if user is already logged in
    function checkExistingSession() {
        const userData = localStorage.getItem('student_user');
        if (userData) {
            const user = JSON.parse(userData);
            // Check if login was recent (within 24 hours)
            const loginTime = new Date(user.loginTime);
            const now = new Date();
            const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
            
            if (hoursSinceLogin < 24) {
                // Auto-redirect to profile
                showMessage('Welcome back! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1500);
            } else {
                // Session expired
                localStorage.removeItem('student_user');
                localStorage.removeItem('auth_token');
            }
        }
    }

    // Function to shake form on error
    function shakeForm() {
        const container = document.querySelector('.login-container');
        container.style.animation = 'shake 0.5s';
        setTimeout(() => {
            container.style.animation = '';
        }, 500);
    }

    // Add shake animation to CSS if not present
    if (!document.querySelector('#shakeAnimation')) {
        const style = document.createElement('style');
        style.id = 'shakeAnimation';
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            
            .login-container {
                transition: animation 0.5s;
            }
        `;
        document.head.appendChild(style);
    }

    // Enter key to submit form
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // Clear error on input change
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (messageDiv.style.display === 'block') {
                messageDiv.style.display = 'none';
            }
        });
    });
});

// Function to logout (can be used from other pages)
function logout() {
    localStorage.removeItem('student_user');
    localStorage.removeItem('auth_token');
    window.location.href = 'index.html';
}

// Export logout function for use in other pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { logout };
}