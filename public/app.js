// ==== API Base URL（自动判断本地 or 线上）====
const API_ORIGIN =
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'                 // 本地开发
    : 'https://hm3-api.onrender.com';         // Render 线上

// 如果后端路由前缀是 /api（你的 server.js 是这样的），就保留 /api
const API_BASE_URL = `${API_ORIGIN}/api`;

// Global Variables
let currentEditUserId = null;
let currentEditTaskId = null;
let allUsers = [];
let allTasks = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadUsers();
    loadTasks();
});

// ==================== Utility Functions ====================

// Show Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Toggle Section Display
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // Update navigation button state
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // 注意：这里依赖浏览器事件对象存在
    if (window.event && event.target) event.target.classList.add('active');
    
    // Load data based on section
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'users') {
        loadUsers();
    } else if (sectionName === 'tasks') {
        loadTasks();
    }
}

// ==================== Dashboard Functions ====================

async function loadDashboard() {
    try {
        // Load user stats
        const userStatsResponse = await fetch(`${API_BASE_URL}/users/stats`);
        const userStats = await userStatsResponse.json();
        
        if (userStats.success) {
            document.getElementById('total-users').textContent = userStats.data.totalUsers;
            document.getElementById('active-users').textContent = userStats.data.activeUsers;
            document.getElementById('inactive-users').textContent = userStats.data.inactiveUsers;
        }
        
        // Load task stats
        const taskStatsResponse = await fetch(`${API_BASE_URL}/tasks/stats`);
        const taskStats = await taskStatsResponse.json();
        
        if (taskStats.success) {
            document.getElementById('total-tasks').textContent = taskStats.data.totalTasks;
            
            // Status distribution
            const statusDist = taskStats.data.statusDistribution;
            const pending = statusDist.find(s => s._id === 'pending')?.count || 0;
            const inProgress = statusDist.find(s => s._id === 'in-progress')?.count || 0;
            const completed = statusDist.find(s => s._id === 'completed')?.count || 0;
            
            document.getElementById('pending-tasks').textContent = pending;
            document.getElementById('inprogress-tasks').textContent = inProgress;
            document.getElementById('completed-tasks').textContent = completed;
            
            // Upcoming and overdue
            document.getElementById('upcoming-tasks').textContent = taskStats.data.upcomingDeadline;
            document.getElementById('overdue-tasks').textContent = taskStats.data.overdueTasks;
            
            // Priority distribution
            const priorityDist = taskStats.data.priorityDistribution;
            const urgent = priorityDist.find(p => p._id === 'urgent')?.count || 0;
            const high = priorityDist.find(p => p._id === 'high')?.count || 0;
            
            document.getElementById('urgent-tasks').textContent = urgent + high;
            document.getElementById('urgent-count').textContent = urgent;
            document.getElementById('high-count').textContent = high;
            
            // Render charts
            renderStatusChart(statusDist);
            renderPriorityChart(priorityDist);
            
            // Top users
            renderTopUsers(taskStats.data.topUsersWithMostTasks);
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

function renderStatusChart(statusData) {
    const chartDiv = document.getElementById('status-chart');
    const statusNames = {
        'pending': 'Pending',
        'in-progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    
    const total = statusData.reduce((sum, item) => sum + item.count, 0);
    
    chartDiv.innerHTML = statusData.map(item => `
        <div class="chart-bar">
            <div class="chart-label">${statusNames[item._id]}</div>
            <div class="chart-bar-container">
                <div class="chart-bar-fill" style="width: ${(item.count / total * 100)}%">
                    <span class="chart-value">${item.count}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderPriorityChart(priorityData) {
    const chartDiv = document.getElementById('priority-chart');
    const priorityNames = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'High',
        'urgent': 'Urgent'
    };
    
    const total = priorityData.reduce((sum, item) => sum + item.count, 0);
    
    chartDiv.innerHTML = priorityData.map(item => `
        <div class="chart-bar">
            <div class="chart-label">${priorityNames[item._id]}</div>
            <div class="chart-bar-container">
                <div class="chart-bar-fill" style="width: ${(item.count / total * 100)}%">
                    <span class="chart-value">${item.count}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderTopUsers(topUsers) {
    const listDiv = document.getElementById('top-users-list');
    
    if (!topUsers || topUsers.length === 0) {
        listDiv.innerHTML = '<p class="placeholder">No data available</p>';
        return;
    }
    
    listDiv.innerHTML = topUsers.map((user, index) => `
        <div class="top-user-item">
            <div class="top-user-info">
                <div class="top-user-rank">${index + 1}</div>
                <div>
                    <strong>${user.userName}</strong><br>
                    <small>${user.userEmail}</small>
                </div>
            </div>
            <div class="top-user-badge">${user.taskCount} tasks</div>
        </div>
    `).join('');
}

// ==================== User Management Functions ====================

async function loadUsers(page = 1, limit = 10) {
    try {
        const response = await fetch(`${API_BASE_URL}/users?skip=${(page - 1) * limit}&limit=${limit}`);
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.data;
            renderUsersTable(data.data);
            renderPagination('users', page, data.total, limit);
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showToast('Failed to load users', 'error');
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td>${user.age || '-'}</td>
            <td><span class="badge badge-info">${user.role}</span></td>
            <td>
                <span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">
                    ${user.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="editUser('${user._id}')">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteUser('${user._id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function filterUsers() {
    const search = document.getElementById('user-search').value.toLowerCase();
    const role = document.getElementById('user-role-filter').value;
    const status = document.getElementById('user-status-filter').value;
    
    let filtered = allUsers.filter(user => {
        const matchSearch = user.name.toLowerCase().includes(search) || 
                          user.email.toLowerCase().includes(search);
        const matchRole = !role || user.role === role;
        const matchStatus = !status || user.isActive.toString() === status;
        
        return matchSearch && matchRole && matchStatus;
    });
    
    renderUsersTable(filtered);
}

function showCreateUserModal() {
    currentEditUserId = null;
    document.getElementById('user-modal-title').textContent = 'Create User';
    document.getElementById('user-form').reset();
    document.getElementById('user-modal').classList.add('show');
}

async function editUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        const data = await response.json();
        
        if (data.success) {
            const user = data.data;
            currentEditUserId = userId;
            
            document.getElementById('user-modal-title').textContent = 'Edit User';
            document.getElementById('user-name').value = user.name;
            document.getElementById('user-email').value = user.email;
            document.getElementById('user-age').value = user.age || '';
            document.getElementById('user-role').value = user.role;
            document.getElementById('user-phone').value = user.phoneNumber || '';
            document.getElementById('user-address').value = user.address || '';
            document.getElementById('user-active').checked = user.isActive;
            
            document.getElementById('user-modal').classList.add('show');
        }
    } catch (error) {
        console.error('Failed to load user details:', error);
        showToast('Failed to load user details', 'error');
    }
}

async function submitUserForm(event) {
    event.preventDefault();
    
    const userData = {
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        age: parseInt(document.getElementById('user-age').value) || undefined,
        role: document.getElementById('user-role').value,
        phoneNumber: document.getElementById('user-phone').value,
        address: document.getElementById('user-address').value,
        isActive: document.getElementById('user-active').checked
    };
    
    try {
        const url = currentEditUserId 
            ? `${API_BASE_URL}/users/${currentEditUserId}`
            : `${API_BASE_URL}/users`;
        
        const method = currentEditUserId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(currentEditUserId ? 'User updated successfully' : 'User created successfully', 'success');
            closeUserModal();
            loadUsers();
        } else {
            showToast(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Failed to submit user form:', error);
        showToast('Operation failed', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their tasks.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('User deleted successfully', 'success');
            loadUsers();
            loadDashboard(); // Refresh dashboard
        } else {
            showToast(data.message || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
        showToast('Delete failed', 'error');
    }
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('show');
    currentEditUserId = null;
}

// ==================== Task Management Functions ====================

async function loadTasks(page = 1, limit = 12) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks?skip=${(page - 1) * limit}&limit=${limit}&populate={"path":"userId","select":"name email"}`);
        const data = await response.json();
        
        if (data.success) {
            allTasks = data.data;
            renderTasksGrid(data.data);
            renderPagination('tasks', page, data.total, limit);
        }
        
        // Load users list for task creation
        if (allUsers.length === 0) {
            const usersResponse = await fetch(`${API_BASE_URL}/users?limit=100`);
            const usersData = await usersResponse.json();
            if (usersData.success) {
                allUsers = usersData.data;
                populateUserSelect();
            }
        }
    } catch (error) {
        console.error('Failed to load tasks:', error);
        showToast('Failed to load tasks', 'error');
    }
}

function renderTasksGrid(tasks) {
    const grid = document.getElementById('tasks-grid');
    
    if (tasks.length === 0) {
        grid.innerHTML = '<div class="loading-card">No tasks found</div>';
        return;
    }
    
    const statusNames = {
        'pending': 'Pending',
        'in-progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    
    const priorityNames = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'High',
        'urgent': 'Urgent'
    };
    
    grid.innerHTML = tasks.map(task => `
        <div class="task-card priority-${task.priority}">
            <div class="task-header">
                <div>
                    <div class="task-title">${task.title}</div>
                    <span class="badge badge-${getStatusBadgeClass(task.status)}">${statusNames[task.status]}</span>
                    <span class="badge badge-${getPriorityBadgeClass(task.priority)}">${priorityNames[task.priority]}</span>
                </div>
            </div>
            <div class="task-description">${task.description || 'No description'}</div>
            <div class="task-meta">
                <div class="task-meta-item">
                    👤 ${task.userId?.name || 'Unassigned'}
                </div>
                <div class="task-meta-item">
                    📅 Due: ${formatDate(task.dueDate)}
                </div>
                ${task.estimatedHours ? `
                <div class="task-meta-item">
                    ⏱️ Est: ${task.estimatedHours}h
                </div>
                ` : ''}
            </div>
            <div class="task-actions">
                <button class="btn btn-small btn-secondary" onclick="editTask('${task._id}')">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteTask('${task._id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function getStatusBadgeClass(status) {
    const classes = {
        'pending': 'warning',
        'in-progress': 'info',
        'completed': 'success',
        'cancelled': 'secondary'
    };
    return classes[status] || 'secondary';
}

function getPriorityBadgeClass(priority) {
    const classes = {
        'low': 'success',
        'medium': 'info',
        'high': 'warning',
        'urgent': 'danger'
    };
    return classes[priority] || 'secondary';
}

function filterTasks() {
    const search = document.getElementById('task-search').value.toLowerCase();
    const status = document.getElementById('task-status-filter').value;
    const priority = document.getElementById('task-priority-filter').value;
    
    let filtered = allTasks.filter(task => {
        const matchSearch = task.title.toLowerCase().includes(search) ||
                          (task.description && task.description.toLowerCase().includes(search));
        const matchStatus = !status || task.status === status;
        const matchPriority = !priority || task.priority === priority;
        
        return matchSearch && matchStatus && matchPriority;
    });
    
    renderTasksGrid(filtered);
}

function showCreateTaskModal() {
    currentEditTaskId = null;
    document.getElementById('task-modal-title').textContent = 'Create Task';
    document.getElementById('task-form').reset();
    
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('task-duedate').value = tomorrow.toISOString().split('T')[0];
    
    populateUserSelect();
    document.getElementById('task-modal').classList.add('show');
}

function populateUserSelect() {
    const select = document.getElementById('task-user');
    select.innerHTML = '<option value="">Select user...</option>' + 
        allUsers.map(user => `<option value="${user._id}">${user.name} (${user.email})</option>`).join('');
}

async function editTask(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
        const data = await response.json();
        
        if (data.success) {
            const task = data.data;
            currentEditTaskId = taskId;
            
            document.getElementById('task-modal-title').textContent = 'Edit Task';
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-status').value = task.status;
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-duedate').value = new Date(task.dueDate).toISOString().split('T')[0];
            document.getElementById('task-user').value = task.userId._id || task.userId;
            document.getElementById('task-estimated').value = task.estimatedHours || '';
            document.getElementById('task-tags').value = task.tags ? task.tags.join(', ') : '';
            
            populateUserSelect();
            document.getElementById('task-modal').classList.add('show');
        }
    } catch (error) {
        console.error('Failed to load task details:', error);
        showToast('Failed to load task details', 'error');
    }
}

async function submitTaskForm(event) {
    event.preventDefault();
    
    const tags = document.getElementById('task-tags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
    
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        status: document.getElementById('task-status').value,
        priority: document.getElementById('task-priority').value,
        dueDate: document.getElementById('task-duedate').value,
        userId: document.getElementById('task-user').value,
        estimatedHours: parseFloat(document.getElementById('task-estimated').value) || undefined,
        tags: tags.length > 0 ? tags : undefined
    };
    
    try {
        const url = currentEditTaskId 
            ? `${API_BASE_URL}/tasks/${currentEditTaskId}`
            : `${API_BASE_URL}/tasks`;
        
        const method = currentEditTaskId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(currentEditTaskId ? 'Task updated successfully' : 'Task created successfully', 'success');
            closeTaskModal();
            loadTasks();
            loadDashboard(); // Refresh dashboard
        } else {
            showToast(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Failed to submit task form:', error);
        showToast('Operation failed', 'error');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Task deleted successfully', 'success');
            loadTasks();
            loadDashboard(); // Refresh dashboard
        } else {
            showToast(data.message || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('Failed to delete task:', error);
        showToast('Delete failed', 'error');
    }
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('show');
    currentEditTaskId = null;
}

// ==================== Search Functions ====================

async function performAdvancedSearch() {
    const keyword = document.getElementById('advanced-search').value;
    const status = document.getElementById('advanced-status').value;
    const priority = document.getElementById('advanced-priority').value;
    
    if (!keyword && !status && !priority) {
        showToast('Please enter search criteria', 'error');
        return;
    }
    
    try {
        let url = `${API_BASE_URL}/tasks/search?`;
        if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;
        if (status) url += `status=${status}&`;
        if (priority) url += `priority=${priority}&`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            renderSearchResults(data.data);
        } else {
            showToast('Search failed', 'error');
        }
    } catch (error) {
        console.error('Search failed:', error);
        showToast('Search failed', 'error');
    }
}

function renderSearchResults(tasks) {
    const resultsDiv = document.getElementById('search-results');
    
    if (tasks.length === 0) {
        resultsDiv.innerHTML = '<p class="placeholder">No matching tasks found</p>';
        return;
    }
    
    resultsDiv.innerHTML = `
        <h3>Found ${tasks.length} tasks</h3>
        <div class="tasks-grid">
            ${tasks.map(task => `
                <div class="task-card priority-${task.priority}">
                    <div class="task-title">${task.title}</div>
                    <div class="task-description">${task.description || 'No description'}</div>
                    <div class="task-meta">
                        <div class="task-meta-item">📅 ${formatDate(task.dueDate)}</div>
                        <div class="task-meta-item">
                            <span class="badge badge-${getStatusBadgeClass(task.status)}">${task.status}</span>
                            <span class="badge badge-${getPriorityBadgeClass(task.priority)}">${task.priority}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ==================== Pagination Functions ====================

function renderPagination(type, currentPage, total, limit) {
    const totalPages = Math.ceil(total / limit);
    const paginationDiv = document.getElementById(`${type}-pagination`);
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let buttons = '';
    
    // Previous button
    buttons += `<button onclick="changePage('${type}', ${currentPage - 1}, ${limit})" ${currentPage === 1 ? 'disabled' : ''}>« Previous</button>`;
    
    // Page numbers
    for (let i = 1; i <= Math.min(totalPages, 10); i++) {
        buttons += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage('${type}', ${i}, ${limit})">${i}</button>`;
    }
    
    // Next button
    buttons += `<button onclick="changePage('${type}', ${currentPage + 1}, ${limit})" ${currentPage === totalPages ? 'disabled' : ''}>Next »</button>`;
    
    paginationDiv.innerHTML = buttons;
}

function changePage(type, page, limit) {
    if (type === 'users') {
        loadUsers(page, limit);
    } else if (type === 'tasks') {
        loadTasks(page, limit);
    }
}




