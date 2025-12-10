const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// IMPORTANT: Serve static files from the FRONTEND folder
// Use path.join to go up one level and into frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ========== API ROUTES ==========

// 1. User Registration
app.post('/api/register', (req, res) => {
    const { username, email, password, full_name } = req.body;
    
    if (!username || !email || !password || !full_name) {
        return res.status(400).json({ 
            success: false,
            error: 'All fields are required' 
        });
    }
    
    db.registerUser(username, email, password, full_name, (err, result) => {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                if (err.message.includes('username')) {
                    return res.status(400).json({ 
                        success: false,
                        error: 'Username already exists' 
                    });
                } else if (err.message.includes('email')) {
                    return res.status(400).json({ 
                        success: false,
                        error: 'Email already registered' 
                    });
                }
            }
            res.status(400).json({ 
                success: false,
                error: 'Registration failed' 
            });
        } else {
            res.json({ 
                success: true, 
                message: 'Registration successful',
                userId: result.id 
            });
        }
    });
});

// 2. User Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username and password are required' 
        });
    }
    
    db.loginUser(username, password, (err, user) => {
        if (err) {
            console.error('Login database error:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Server error. Please try again later.' 
            });
        }
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid username or password' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                created_at: user.created_at
            }
        });
    });
});

// 3. Get User Profile
app.get('/api/profile/:userId', (req, res) => {
    const userId = req.params.userId;
    
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    db.getUserProfile(userId, (err, user) => {
        if (err) {
            console.error('Profile error:', err);
            res.status(500).json({ error: 'Database error' });
        } else if (!user) {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.json(user);
        }
    });
});

// 4. Logout
app.post('/api/logout', (req, res) => {
    res.json({ success: true, message: 'Logout recorded' });
});

// 5. Get All Courses
app.get('/api/courses', (req, res) => {
    db.getAllCourses((err, courses) => {
        if (err) {
            console.error('Courses error:', err);
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(courses);
        }
    });
});

// 6. Get Student's Courses
app.get('/api/student/:id/courses', (req, res) => {
    const studentId = req.params.id;
    
    if (!studentId || isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID' });
    }
    
    db.getStudentCourses(studentId, (err, courses) => {
        if (err) {
            console.error('Student courses error:', err);
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(courses);
        }
    });
});

// 7. Get Available Courses
app.get('/api/student/:id/available-courses', (req, res) => {
    const studentId = req.params.id;
    
    if (!studentId || isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID' });
    }
    
    db.getAvailableCourses(studentId, (err, courses) => {
        if (err) {
            console.error('Available courses error:', err);
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(courses);
        }
    });
});

// 8. Register for Course
app.post('/api/register-course', (req, res) => {
    const { studentId, courseId } = req.body;
    
    if (!studentId || !courseId) {
        return res.status(400).json({ 
            success: false,
            error: 'Student ID and Course ID are required' 
        });
    }
    
    db.registerForCourse(studentId, courseId, (err) => {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Already registered for this course' 
                });
            }
            res.status(400).json({ 
                success: false,
                error: 'Registration failed' 
            });
        } else {
            res.json({ 
                success: true, 
                message: 'Course registered successfully' 
            });
        }
    });
});

// 9. Drop Course
app.post('/api/drop-course', (req, res) => {
    const { studentId, courseId } = req.body;
    
    if (!studentId || !courseId) {
        return res.status(400).json({ 
            success: false,
            error: 'Student ID and Course ID are required' 
        });
    }
    
    db.dropCourse(studentId, courseId, (err) => {
        if (err) {
            console.error('Drop course error:', err);
            res.status(400).json({ 
                success: false,
                error: 'Failed to drop course' 
            });
        } else {
            res.json({ 
                success: true, 
                message: 'Course dropped successfully' 
            });
        }
    });
});

// 10. Get Student's Resources
app.get('/api/student/:id/resources', (req, res) => {
    const studentId = req.params.id;
    
    if (!studentId || isNaN(studentId)) {
        return res.status(400).json({ error: 'Invalid student ID' });
    }
    
    db.getStudentResources(studentId, (err, resources) => {
        if (err) {
            console.error('Resources error:', err);
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(resources);
        }
    });
});

// 11. Record Resource Download
app.post('/api/download-resource', (req, res) => {
    const { studentId, resourceId } = req.body;
    
    if (!studentId || !resourceId) {
        return res.status(400).json({ 
            success: false,
            error: 'Student ID and Resource ID are required' 
        });
    }
    
    db.recordDownload(studentId, resourceId, (err) => {
        if (err) {
            console.error('Download record error:', err);
            res.json({ 
                success: false,
                message: 'Download recorded but count not updated' 
            });
        } else {
            res.json({ 
                success: true, 
                message: 'Download recorded successfully' 
            });
        }
    });
});

// 12. Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: 'Connected'
    });
});

// ========== FRONTEND ROUTES ==========
// These now serve files from the frontend folder

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'register.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'profile.html'));
});

app.get('/units', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'units.html'));
});

app.get('/resources', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'resources.html'));
});

// ========== 404 HANDLER ==========

app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ 
            error: 'API endpoint not found',
            path: req.path
        });
    } else {
        res.redirect('/login');
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`╔══════════════════════════════════════════╗`);
    console.log(`║     Y&M Foundation Student Portal        ║`);
    console.log(`║         Server is running!               ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    console.log(`║  🌐 URL: http://localhost:${PORT}           ║`);
    console.log(`║  📂 Frontend: ../frontend/               ║`);
    console.log(`║  📁 Database: yvonne.db                  ║`);
    console.log(`║  📊 API: http://localhost:${PORT}/api/health ║`);
    console.log(`╚══════════════════════════════════════════╝`);
    console.log(`\nAvailable Pages:`);
    console.log(`  • Login:        http://localhost:${PORT}/login`);
    console.log(`  • Register:     http://localhost:${PORT}/register`);
    console.log(`  • Profile:      http://localhost:${PORT}/profile`);
    console.log(`  • Units:        http://localhost:${PORT}/units`);
    console.log(`  • Resources:    http://localhost:${PORT}/resources`);
});