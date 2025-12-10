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
    const resourcesList = document.getElementById('resourcesList');
    const dashboardIcon = document.getElementById('dashboardIcon');
    const dashboardDropdown = document.getElementById('dashboardDropdown');
    
    // State management
    let resources = [];
    let downloadedResources = new Set();

    // Initialize
    setupDashboard();
    loadResources();
    loadDownloadHistory();

    // Dashboard functionality
    dashboardIcon.addEventListener('mouseenter', showDashboard);
    dashboardIcon.addEventListener('mouseleave', hideDashboard);

    // Click outside to close dashboard
    document.addEventListener('click', function(event) {
        if (!dashboardIcon.contains(event.target) && !dashboardDropdown.contains(event.target)) {
            hideDashboard();
        }
    });

    // Function to load resources
    async function loadResources() {
        showLoadingState();
        
        try {
            const response = await fetch(`/api/student/${userId}/resources`);
            
            if (response.ok) {
                resources = await response.json();
                renderResources();
            } else {
                throw new Error('Failed to load resources');
            }
        } catch (error) {
            console.error('Error loading resources:', error);
            showErrorMessage('Failed to load resources. Please try again later.');
        } finally {
            hideLoadingState();
        }
    }

    // Function to load download history from localStorage
    function loadDownloadHistory() {
        const history = localStorage.getItem(`download_history_${userId}`);
        if (history) {
            downloadedResources = new Set(JSON.parse(history));
        }
    }

    // Function to save download history
    function saveDownloadHistory() {
        localStorage.setItem(
            `download_history_${userId}`,
            JSON.stringify(Array.from(downloadedResources))
        );
    }

    // Function to render resources
    function renderResources() {
        resourcesList.innerHTML = '';
        
        if (resources.length === 0) {
            resourcesList.innerHTML = `
                <div class="no-resources" style="
                    text-align: center;
                    padding: 40px 20px;
                    color: #aaa;
                    font-style: italic;
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                ">
                    <i class="fas fa-folder-open" style="font-size: 48px; margin-bottom: 15px; color: #666;"></i>
                    <h3 style="color: #888; margin: 10px 0;">No Resources Available</h3>
                    <p>Resources will appear here once you register for units.</p>
                    <a href="units.html" style="
                        display: inline-block;
                        margin-top: 15px;
                        padding: 10px 20px;
                        background: #8a2be2;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        transition: 0.3s;
                    ">Register for Units</a>
                </div>
            `;
            return;
        }

        // Group resources by course
        const resourcesByCourse = {};
        resources.forEach(resource => {
            const courseKey = resource.course_name || 'General';
            if (!resourcesByCourse[courseKey]) {
                resourcesByCourse[courseKey] = [];
            }
            resourcesByCourse[courseKey].push(resource);
        });

        // Render resources grouped by course
        Object.entries(resourcesByCourse).forEach(([courseName, courseResources]) => {
            // Course header
            const courseHeader = document.createElement('div');
            courseHeader.className = 'course-header';
            courseHeader.innerHTML = `
                <h3 style="
                    color: #8a2be2;
                    margin: 25px 0 15px 0;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #8a2be2;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <i class="fas fa-book"></i> ${courseName}
                    <span style="
                        font-size: 12px;
                        color: #aaa;
                        background: rgba(255,255,255,0.1);
                        padding: 2px 8px;
                        border-radius: 10px;
                        margin-left: auto;
                    ">${courseResources.length} resource${courseResources.length !== 1 ? 's' : ''}</span>
                </h3>
            `;
            resourcesList.appendChild(courseHeader);

            // Resources for this course
            courseResources.forEach(resource => {
                const isDownloaded = downloadedResources.has(resource.id);
                
                const resourceCard = document.createElement('div');
                resourceCard.className = 'resource-card';
                resourceCard.dataset.resourceId = resource.id;
                
                const resourceInfo = document.createElement('div');
                resourceInfo.className = 'resource-info';
                resourceInfo.style.flexGrow = '1';
                
                resourceInfo.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <i class="fas fa-file-${getFileIcon(resource.file_path)}" 
                           style="color: #00ffff; font-size: 20px;"></i>
                        <div>
                            <strong style="color: white; font-size: 16px;">${resource.title}</strong>
                            <div style="display: flex; gap: 15px; margin-top: 5px;">
                                <span style="font-size: 12px; color: #aaa;">
                                    <i class="fas fa-calendar"></i> ${formatDate(resource.uploaded_at)}
                                </span>
                                <span style="font-size: 12px; color: #aaa;">
                                    <i class="fas fa-download"></i> ${resource.downloads_count || 0} downloads
                                </span>
                                ${isDownloaded ? `
                                <span style="font-size: 12px; color: #00ff00;">
                                    <i class="fas fa-check-circle"></i> Downloaded
                                </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    ${resource.description ? `
                    <p style="
                        color: #ccc;
                        font-size: 14px;
                        margin: 8px 0 0 0;
                        padding: 8px;
                        background: rgba(255,255,255,0.05);
                        border-radius: 4px;
                    ">${resource.description}</p>
                    ` : ''}
                `;
                
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'download-btn';
                downloadBtn.innerHTML = isDownloaded ? 
                    '<i class="fas fa-redo"></i> Download Again' : 
                    '<i class="fas fa-download"></i> Download';
                
                if (isDownloaded) {
                    downloadBtn.style.background = '#666';
                }
                
                downloadBtn.addEventListener('click', () => downloadResource(resource));
                
                resourceCard.appendChild(resourceInfo);
                resourceCard.appendChild(downloadBtn);
                resourcesList.appendChild(resourceCard);
            });
        });

        // Add search functionality
        addSearchFunctionality();
    }

    // Function to download resource
    async function downloadResource(resource) {
        try {
            // Show downloading state
            const downloadBtn = document.querySelector(`[data-resource-id="${resource.id}"] .download-btn`);
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
            downloadBtn.disabled = true;

            // Record download in backend
            await recordDownload(resource.id);

            // Mark as downloaded locally
            downloadedResources.add(resource.id);
            saveDownloadHistory();

            // Update button state
            downloadBtn.innerHTML = '<i class="fas fa-check"></i> Downloaded';
            downloadBtn.style.background = '#00aa00';
            downloadBtn.disabled = false;

            // Show success message
            showSuccessMessage(`Downloaded: ${resource.title}`);

            // Update downloads count visually
            updateDownloadCount(resource.id);

            // Simulate file download (in real app, this would link to actual file)
            simulateFileDownload(resource);

            // Reset button after 3 seconds
            setTimeout(() => {
                downloadBtn.innerHTML = '<i class="fas fa-redo"></i> Download Again';
                downloadBtn.style.background = '#666';
            }, 3000);

        } catch (error) {
            console.error('Download error:', error);
            showErrorMessage(`Failed to download: ${resource.title}`);
            
            // Reset button
            const downloadBtn = document.querySelector(`[data-resource-id="${resource.id}"] .download-btn`);
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
            downloadBtn.disabled = false;
        }
    }

    // Function to record download in backend
    async function recordDownload(resourceId) {
        try {
            const response = await fetch('/api/download-resource', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: userId,
                    resourceId: resourceId
                })
            });

            if (!response.ok) {
                console.warn('Failed to record download on server');
            }
        } catch (error) {
            console.warn('Could not record download on server:', error);
        }
    }

    // Function to simulate file download
    function simulateFileDownload(resource) {
        // In a real application, this would be an actual file download
        // For demo purposes, we'll create a fake download link
        
        const link = document.createElement('a');
        link.href = '#';
        link.download = getFileName(resource.file_path);
        
        // Create a fake blob (in real app, this would be the actual file)
        const blob = new Blob([`This is a simulated download of: ${resource.title}\n\nCourse: ${resource.course_name}\nUploaded: ${resource.uploaded_at}\n\nThis is demo content. In a real application, this would be the actual study material.`], {
            type: getMimeType(resource.file_path)
        });
        
        const url = URL.createObjectURL(blob);
        link.href = url;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
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
            
            .download-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
                min-width: 120px;
                justify-content: center;
            }
            
            .fa-spin {
                animation: fa-spin 1s infinite linear;
            }
            
            @keyframes fa-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
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

    // Function to get file icon based on extension
    function getFileIcon(filePath) {
        const extension = filePath.split('.').pop().toLowerCase();
        
        const iconMap = {
            'pdf': 'pdf',
            'doc': 'word',
            'docx': 'word',
            'ppt': 'powerpoint',
            'pptx': 'powerpoint',
            'xls': 'excel',
            'xlsx': 'excel',
            'txt': 'alt',
            'jpg': 'image',
            'jpeg': 'image',
            'png': 'image',
            'mp4': 'video',
            'mp3': 'audio',
            'zip': 'archive'
        };
        
        return iconMap[extension] || 'file';
    }

    // Function to get file name from path
    function getFileName(filePath) {
        return filePath.split('/').pop() || 'resource';
    }

    // Function to get MIME type
    function getMimeType(filePath) {
        const extension = filePath.split('.').pop().toLowerCase();
        
        const mimeMap = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png'
        };
        
        return mimeMap[extension] || 'application/octet-stream';
    }

    // Function to format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                return 'Today';
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return `${diffDays} days ago`;
            } else {
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch (error) {
            return 'Recent';
        }
    }

    // Function to show loading state
    function showLoadingState() {
        resourcesList.innerHTML = `
            <div style="
                text-align: center;
                padding: 50px 20px;
                color: #aaa;
            ">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3>Loading Resources...</h3>
                <p>Please wait while we fetch your study materials</p>
            </div>
        `;
    }

    // Function to hide loading state
    function hideLoadingState() {
        // Loading state is replaced by renderResources
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
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
        `;
        
        messageDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <div>${message}</div>
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
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
        `;
        
        messageDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div>${message}</div>
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

    // Function to update download count visually
    function updateDownloadCount(resourceId) {
        const resourceCard = document.querySelector(`[data-resource-id="${resourceId}"]`);
        if (resourceCard) {
            const downloadCountSpan = resourceCard.querySelector('.fa-download').parentElement;
            if (downloadCountSpan) {
                const currentCount = parseInt(downloadCountSpan.textContent.match(/\d+/)) || 0;
                downloadCountSpan.innerHTML = `<i class="fas fa-download"></i> ${currentCount + 1} downloads`;
            }
        }
    }

    // Function to add search functionality
    function addSearchFunctionality() {
        // Create search bar
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = `
            margin-bottom: 20px;
            position: relative;
        `;
        
        searchContainer.innerHTML = `
            <div style="position: relative;">
                <input type="text" 
                       id="resourceSearch" 
                       placeholder="Search resources..." 
                       style="
                           width: 100%;
                           padding: 12px 40px 12px 15px;
                           border: none;
                           border-radius: 8px;
                           background: rgba(255,255,255,0.1);
                           color: white;
                           font-size: 16px;
                           outline: none;
                           transition: 0.3s;
                           box-sizing: border-box;
                       ">
                <i class="fas fa-search" style="
                    position: absolute;
                    right: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #aaa;
                "></i>
            </div>
            <div id="searchResults" style="
                color: #aaa;
                font-size: 14px;
                margin-top: 5px;
                padding-left: 5px;
            "></div>
        `;
        
        resourcesList.insertBefore(searchContainer, resourcesList.firstChild);
        
        // Search functionality
        const searchInput = document.getElementById('resourceSearch');
        const searchResults = document.getElementById('searchResults');
        
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            
            if (searchTerm.length === 0) {
                searchResults.textContent = '';
                showAllResources();
                return;
            }
            
            // Filter resources
            const filteredResources = resources.filter(resource => 
                resource.title.toLowerCase().includes(searchTerm) ||
                resource.description?.toLowerCase().includes(searchTerm) ||
                resource.course_name?.toLowerCase().includes(searchTerm)
            );
            
            // Update results count
            searchResults.textContent = `Found ${filteredResources.length} resource${filteredResources.length !== 1 ? 's' : ''}`;
            
            // Show filtered resources
            showFilteredResources(filteredResources);
        });
        
        // Add keyboard shortcut
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                this.value = '';
                searchResults.textContent = '';
                showAllResources();
            }
        });
    }

    // Function to show all resources
    function showAllResources() {
        renderResources();
    }

    // Function to show filtered resources
    function showFilteredResources(filteredResources) {
        resourcesList.innerHTML = '';
        
        if (filteredResources.length === 0) {
            resourcesList.innerHTML = `
                <div style="
                    text-align: center;
                    padding: 40px 20px;
                    color: #aaa;
                    font-style: italic;
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                ">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 15px; color: #666;"></i>
                    <h3 style="color: #888; margin: 10px 0;">No Resources Found</h3>
                    <p>Try different search terms</p>
                </div>
            `;
            return;
        }
        
        // Group filtered resources by course
        const resourcesByCourse = {};
        filteredResources.forEach(resource => {
            const courseKey = resource.course_name || 'General';
            if (!resourcesByCourse[courseKey]) {
                resourcesByCourse[courseKey] = [];
            }
            resourcesByCourse[courseKey].push(resource);
        });
        
        // Render filtered resources
        Object.entries(resourcesByCourse).forEach(([courseName, courseResources]) => {
            const courseHeader = document.createElement('div');
            courseHeader.className = 'course-header';
            courseHeader.innerHTML = `
                <h3 style="
                    color: #8a2be2;
                    margin: 25px 0 15px 0;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #8a2be2;
                ">
                    ${courseName}
                    <span style="
                        font-size: 12px;
                        color: #aaa;
                        background: rgba(255,255,255,0.1);
                        padding: 2px 8px;
                        border-radius: 10px;
                        margin-left: 10px;
                    ">${courseResources.length}</span>
                </h3>
            `;
            resourcesList.appendChild(courseHeader);
            
            courseResources.forEach(resource => {
                const isDownloaded = downloadedResources.has(resource.id);
                
                const resourceCard = document.createElement('div');
                resourceCard.className = 'resource-card';
                resourceCard.dataset.resourceId = resource.id;
                
                const resourceInfo = document.createElement('div');
                resourceInfo.style.flexGrow = '1';
                
                resourceInfo.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <i class="fas fa-file-${getFileIcon(resource.file_path)}" 
                           style="color: #00ffff; font-size: 20px;"></i>
                        <div>
                            <strong style="color: white; font-size: 16px;">${resource.title}</strong>
                            <div style="display: flex; gap: 15px; margin-top: 5px;">
                                <span style="font-size: 12px; color: #aaa;">
                                    <i class="fas fa-book"></i> ${resource.course_name}
                                </span>
                                <span style="font-size: 12px; color: #aaa;">
                                    <i class="fas fa-calendar"></i> ${formatDate(resource.uploaded_at)}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
                
                const downloadBtn = document.createElement('button');
                downloadBtn.innerHTML = isDownloaded ? 
                    '<i class="fas fa-redo"></i> Download Again' : 
                    '<i class="fas fa-download"></i> Download';
                
                if (isDownloaded) {
                    downloadBtn.style.background = '#666';
                }
                
                downloadBtn.addEventListener('click', () => downloadResource(resource));
                
                resourceCard.appendChild(resourceInfo);
                resourceCard.appendChild(downloadBtn);
                resourcesList.appendChild(resourceCard);
            });
        });
    }

    // Auto-refresh resources every 5 minutes
    setInterval(loadResources, 300000);

    // Listen for keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Ctrl+F or Cmd+F to focus search
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            const searchInput = document.getElementById('resourceSearch');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Escape to close dashboard
        if (event.key === 'Escape') {
            hideDashboard();
        }
        
        // R to refresh
        if (event.key === 'r' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            loadResources();
        }
    });

    // Listen for course registration updates
    window.addEventListener('coursesUpdated', function() {
        // Reload resources when courses are updated
        setTimeout(loadResources, 1000); // Small delay to ensure backend is updated
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
            loadResources();
            startY = null;
        }
    });
});