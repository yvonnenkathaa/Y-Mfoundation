document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const messageDiv = document.createElement('div');
    messageDiv.id = 'registerMessage';
    messageDiv.style.cssText = `
        margin-top: 15px;
        padding: 10px;
        border-radius: 5px;
        font-weight: bold;
        text-align: center;
        display: none;
    `;
    registerForm.appendChild(messageDiv);

    // Get all input fields
    const inputs = registerForm.querySelectorAll('input');
    const fullNameInput = inputs[0];
    const emailInput = inputs[1];
    const usernameInput = inputs[2];
    const passwordInput = inputs[3];
    const confirmPasswordInput = inputs[4];

    // Add IDs to inputs for easier access
    fullNameInput.id = 'fullName';
    emailInput.id = 'email';
    usernameInput.id = 'username';
    passwordInput.id = 'password';
    confirmPasswordInput.id = 'confirmPassword';

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get values
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Clear previous messages
        clearMessages();

        // Validation
        const validation = validateForm(fullName, email, username, password, confirmPassword);
        if (!validation.isValid) {
            showMessage(validation.message, 'error');
            highlightError(validation.field);
            return;
        }

        // Show loading state
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;

        try {
            // Send registration request to backend
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    full_name: fullName,
                    email: email,
                    username: username,
                    password: password
                })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                // Registration successful
                showMessage('Registration successful! Redirecting to login...', 'success');
                
                // Clear form
                registerForm.reset();
                
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);

            } else {
                // Registration failed
                const errorMsg = result.error || 'Registration failed. Please try again.';
                showMessage(errorMsg, 'error');
                
                // Highlight problematic field
                if (errorMsg.includes('username')) {
                    highlightError('username');
                } else if (errorMsg.includes('email')) {
                    highlightError('email');
                }
                
                submitBtn.textContent = 'Registration Failed';
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }, 2000);
            }

        } catch (error) {
            // Network or server error
            console.error('Registration error:', error);
            showMessage('Connection error. Please check your internet and try again.', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Form validation function
    function validateForm(fullName, email, username, password, confirmPassword) {
        // Check for empty fields
        if (!fullName || !email || !username || !password || !confirmPassword) {
            return {
                isValid: false,
                message: 'Please fill in all fields',
                field: getEmptyField(fullName, email, username, password, confirmPassword)
            };
        }

        // Validate full name (at least 2 characters)
        if (fullName.length < 2) {
            return {
                isValid: false,
                message: 'Full name must be at least 2 characters',
                field: 'fullName'
            };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                isValid: false,
                message: 'Please enter a valid email address',
                field: 'email'
            };
        }

        // Validate username (alphanumeric, 3-20 characters)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return {
                isValid: false,
                message: 'Username must be 3-20 characters (letters, numbers, underscore only)',
                field: 'username'
            };
        }

        // Validate password strength
        if (password.length < 6) {
            return {
                isValid: false,
                message: 'Password must be at least 6 characters',
                field: 'password'
            };
        }

        // Check for password match
        if (password !== confirmPassword) {
            return {
                isValid: false,
                message: 'Passwords do not match',
                field: 'confirmPassword'
            };
        }

        return { isValid: true, message: '', field: '' };
    }

    // Helper function to find empty field
    function getEmptyField(fullName, email, username, password, confirmPassword) {
        if (!fullName) return 'fullName';
        if (!email) return 'email';
        if (!username) return 'username';
        if (!password) return 'password';
        if (!confirmPassword) return 'confirmPassword';
        return '';
    }

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
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }

    // Function to highlight error field
    function highlightError(fieldName) {
        // Remove previous error highlights
        document.querySelectorAll('.input-group').forEach(group => {
            group.classList.remove('error-highlight');
        });
        
        // Add error highlight to specific field
        const field = document.getElementById(fieldName);
        if (field) {
            const parentGroup = field.closest('.input-group');
            if (parentGroup) {
                parentGroup.classList.add('error-highlight');
                
                // Scroll to error field
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                field.focus();
            }
        }
        
        // Add shake animation
        const container = document.querySelector('.register-container');
        container.style.animation = 'shake 0.5s';
        setTimeout(() => {
            container.style.animation = '';
        }, 500);
    }

    // Function to clear all messages and highlights
    function clearMessages() {
        messageDiv.style.display = 'none';
        document.querySelectorAll('.input-group').forEach(group => {
            group.classList.remove('error-highlight');
        });
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
            
            .register-container {
                transition: animation 0.5s;
            }
            
            .error-highlight input {
                border: 2px solid #ff4444 !important;
                box-shadow: 0 0 10px #ff4444 !important;
            }
            
            .error-highlight i {
                color: #ff4444 !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Real-time password validation
    passwordInput.addEventListener('input', function() {
        if (confirmPasswordInput.value) {
            validatePasswords();
        }
    });

    confirmPasswordInput.addEventListener('input', validatePasswords);

    function validatePasswords() {
        if (passwordInput.value && confirmPasswordInput.value) {
            if (passwordInput.value !== confirmPasswordInput.value) {
                confirmPasswordInput.style.borderColor = '#ff4444';
                confirmPasswordInput.style.boxShadow = '0 0 8px #ff4444';
            } else {
                confirmPasswordInput.style.borderColor = '';
                confirmPasswordInput.style.boxShadow = '';
            }
        }
    }

    // Enter key to submit form
    confirmPasswordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            registerForm.dispatchEvent(new Event('submit'));
        }
    });

    // Clear error on input change
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (messageDiv.style.display === 'block') {
                messageDiv.style.display = 'none';
            }
            // Remove error highlight when user starts typing
            const parentGroup = this.closest('.input-group');
            if (parentGroup) {
                parentGroup.classList.remove('error-highlight');
            }
        });
    });

    // Check if user is already logged in
    const userData = localStorage.getItem('student_user');
    if (userData) {
        const user = JSON.parse(userData);
        if (user.loggedIn) {
            showMessage('You are already logged in. Redirecting to profile...', 'info');
            messageDiv.style.backgroundColor = 'rgba(0, 150, 255, 0.1)';
            messageDiv.style.color = '#0096ff';
            messageDiv.style.border = '1px solid #0096ff';
            
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 2000);
        }
    }
});