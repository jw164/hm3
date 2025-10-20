// ==== API Base URL（自动判断本地 or 线上）====
const API_ORIGIN =
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'                 // 本地开发
    : 'https://hm3-api.onrender.com';         // Render 线上
const API_BASE_URL = `${API_ORIGIN}/api`;

// Global
let currentEditUserId = null;
let currentEditTaskId = null;
let allUsers = [];
let allTasks = [];

// -------------------- 小工具 -------------------- //
// 统一获取 JSON；若 204 则返回 {message, data:null}
async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (res.status === 204) return { message: 'No Content', data: null, _status: 204 };
  const json = await res.json().catch(() => ({}));
  return { ...json, _status: res.status };
}

// 任务对象字段“归一化”：兼容 title/status/dueDate/userId 和 name/completed/deadline/assignedUser
function normalizeTask(t = {}) {
  return {
    _id: t._id,
    title: t.title ?? t.name ?? '(no title)',
    description: t.description ?? '',
    status: t.status ?? (t.completed ? 'completed' : 'pending'),
    priority: t.priority ?? 'medium',
    dueDate: t.dueDate ?? t.deadline ?? new Date().toISOString(),
    userId: t.userId ?? t.assignedUser ?? '',
    userObj: t.userId && typeof t.userId === 'object' ? t.userId : null,
    estimatedHours: t.estimatedHours,
    tags: t.tags
  };
}

// Toast
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Date
function formatDate(dateString) {
  const date = new Date(dateString);
  return isNaN(date) ? '-' :
    date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Section 切换
function showSection(sectionName) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`${sectionName}-section`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  if (window.event && event.target) event.target.classList.add('active');
  if (sectionName === 'dashboard') loadDashboard();
  else if (sectionName === 'users') loadUsers();
  else if (sectionName === 'tasks') loadTasks();
}

// -------------------- Dashboard -------------------- //
async function loadDashboard() {
  // 小工具：统计 tasks 的数量（where 支持 MP3 的 JSON 查询）
  const countWhere = async (whereObj) => {
    const url = `${API_BASE_URL}/tasks?count=true&where=${encodeURIComponent(JSON.stringify(whereObj))}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return 0;
      const j = await res.json().catch(() => ({}));
      return typeof j.data === 'number' ? j.data : 0;
    } catch { return 0; }
  };

  try {
    // 1) 用户总数
    const usersCntRes = await fetch(`${API_BASE_URL}/users?count=true`);
    const usersCntJson = await usersCntRes.json().catch(()=>({}));
    const totalUsers = usersCntJson.data ?? 0;
    document.getElementById('total-users').textContent = totalUsers;
    document.getElementById('active-users').textContent = '-';
    document.getElementById('inactive-users').textContent = '-';

    // 2) 先尝试后端 /tasks/metrics（如果你已经实现了）
    let metricsOk = false;
    try {
      const mRes = await fetch(`${API_BASE_URL}/tasks/metrics`);
      if (mRes.ok) {
        const mJson = await mRes.json();
        if (mJson && mJson.data) {
          const m = mJson.data;
          document.getElementById('total-tasks').textContent = m.total ?? '-';
          document.getElementById('inprogress-tasks').textContent = m.pending ?? '-';
          document.getElementById('completed-tasks').textContent = m.completed ?? '-';
          document.getElementById('pending-tasks').textContent = m.pending ?? '-';
          document.getElementById('upcoming-tasks').textContent = m.upcoming ?? '-';
          document.getElementById('overdue-tasks').textContent = m.overdue ?? '-';

          const urgent = (m.priority?.urgent || 0);
          const high = (m.priority?.high || 0);
          document.getElementById('urgent-tasks').textContent = urgent + high;
          document.getElementById('urgent-count').textContent = urgent;
          document.getElementById('high-count').textContent = high;

          const statusDist = [
            { _id: 'pending',     count: m.pending || 0 },
            { _id: 'in-progress', count: m.inProgress || 0 },
            { _id: 'completed',   count: m.completed || 0 },
          ];
          renderStatusChart(statusDist);
          const prioDist = Object.entries(m.priority || {}).map(([k, v]) => ({ _id: k, count: v }));
          renderPriorityChart(prioDist);
          renderTopUsers(m.topUsers || []);
          metricsOk = true;
        }
      }
    } catch {/* ignore */}

    // 3) 如果没有 metrics，就用前端组合查询兜底计算
    if (!metricsOk) {
      // 所有任务
      const total = await countWhere({});

      // completed=true 或 status=completed/done 都算“已完成”
      const completed = await countWhere({
        $or: [
          { completed: true },
          { status: { $in: ['completed', 'done', true, 1, 'true'] } }
        ]
      });

      // 未完成
      const pending = total - completed;

      // 未来 7 天到期（仅未完成）：兼容 deadline / dueDate
      const now = new Date().toISOString();
      const soon = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      const upcoming = await countWhere({
        $and: [
          { $or: [
            { completed: false },
            { status: { $in: ['pending', 'todo', 'in-progress', false, 0, 'false'] } }
          ]},
          { $or: [
            { deadline: { $gte: now, $lte: soon } },
            { dueDate:  { $gte: now, $lte: soon } }
          ]}
        ]
      });

      // 逾期（仅未完成）
      const overdue = await countWhere({
        $and: [
          { $or: [
            { completed: false },
            { status: { $in: ['pending', 'todo', 'in-progress', false, 0, 'false'] } }
          ]},
          { $or: [
            { deadline: { $lt: now } },
            { dueDate:  { $lt: now } }
          ]}
        ]
      });

      // 优先级分布
      const prios = ['urgent', 'high', 'medium', 'low'];
      const prioCounts = {};
      for (const p of prios) {
        prioCounts[p] = await countWhere({ priority: p });
      }

      // 更新 UI
      document.getElementById('total-tasks').textContent = total;
      document.getElementById('inprogress-tasks').textContent = pending;
      document.getElementById('completed-tasks').textContent = completed;
      document.getElementById('pending-tasks').textContent = pending;
      document.getElementById('upcoming-tasks').textContent = upcoming;
      document.getElementById('overdue-tasks').textContent = overdue;

      document.getElementById('urgent-tasks').textContent = (prioCounts.urgent || 0) + (prioCounts.high || 0);
      document.getElementById('urgent-count').textContent = prioCounts.urgent || 0;
      document.getElementById('high-count').textContent = prioCounts.high || 0;

      const statusDist = [
        { _id: 'pending',     count: pending },
        { _id: 'in-progress', count: 0 },
        { _id: 'completed',   count: completed },
      ];
      renderStatusChart(statusDist);

      const prioDist = prios.map(p => ({ _id: p, count: prioCounts[p] || 0 }));
      renderPriorityChart(prioDist);

      renderTopUsers([]); // 没有后端聚合时，先置空
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    showToast('Failed to load dashboard data', 'error');
  }
}

// -------------------- Users -------------------- //
async function loadUsers(page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;
    const cntRes = await fetchJSON(`${API_BASE_URL}/users?count=true`);
    const total = cntRes.data ?? 0;

    const listRes = await fetchJSON(`${API_BASE_URL}/users?skip=${skip}&limit=${limit}`);
    const list = Array.isArray(listRes.data) ? listRes.data : [];
    allUsers = list;

    renderUsersTable(list);
    renderPagination('users', page, total, limit);
  } catch (error) {
    console.error('Failed to load users:', error);
    showToast('Failed to load users', 'error');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">No users found</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>${u.age ?? '-'}</td>
      <td><span class="badge badge-info">${u.role ?? 'user'}</span></td>
      <td><span class="badge ${u.isActive ? 'badge-success' : 'badge-danger'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="btn btn-small btn-secondary" onclick="editUser('${u._id}')">Edit</button>
        <button class="btn btn-small btn-danger" onclick="deleteUser('${u._id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function filterUsers() {
  const search = document.getElementById('user-search').value.toLowerCase();
  const role = document.getElementById('user-role-filter').value;
  const status = document.getElementById('user-status-filter').value;
  const filtered = allUsers.filter(u => {
    const matchSearch = (u.name ?? '').toLowerCase().includes(search) || (u.email ?? '').toLowerCase().includes(search);
    const matchRole = !role || (u.role === role);
    const matchStatus = !status || String(!!u.isActive) === status;
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
    const resp = await fetchJSON(`${API_BASE_URL}/users/${userId}`);
    const user = resp.data;
    if (!user) return showToast(resp.message || 'Failed to load user', 'error');

    currentEditUserId = userId;
    document.getElementById('user-modal-title').textContent = 'Edit User';
    document.getElementById('user-name').value = user.name || '';
    document.getElementById('user-email').value = user.email || '';
    document.getElementById('user-age').value = user.age || '';
    document.getElementById('user-role').value = user.role || 'user';
    document.getElementById('user-phone').value = user.phoneNumber || '';
    document.getElementById('user-address').value = user.address || '';
    document.getElementById('user-active').checked = !!user.isActive;
    document.getElementById('user-modal').classList.add('show');
  } catch (e) {
    console.error(e);
    showToast('Failed to load user details', 'error');
  }
}

async function submitUserForm(e) {
  e.preventDefault();
  const userData = {
    name: document.getElementById('user-name').value,
    email: document.getElementById('user-email').value,
    age: parseInt(document.getElementById('user-age').value) || undefined,
    role: document.getElementById('user-role').value,
    phoneNumber: document.getElementById('user-phone').value,
    address: document.getElementById('user-address').value,
    isActive: document.getElementById('user-active').checked
  };
  const url = currentEditUserId ? `${API_BASE_URL}/users/${currentEditUserId}` : `${API_BASE_URL}/users`;
  const method = currentEditUserId ? 'PUT' : 'POST';
  const resp = await fetchJSON(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData) });
  if (resp._status >= 200 && resp._status < 300) {
    showToast(currentEditUserId ? 'User updated successfully' : 'User created successfully', 'success');
    closeUserModal();
    loadUsers();
  } else {
    showToast(resp.message || 'Operation failed', 'error');
  }
}

async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user? This will also unassign their tasks.')) return;
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE' });
  if (res.status === 204 || res.ok) {
    showToast('User deleted successfully', 'success');
    loadUsers();
    loadDashboard();
  } else {
    const j = await res.json().catch(()=>({}));
    showToast(j.message || 'Delete failed', 'error');
  }
}

function closeUserModal() {
  document.getElementById('user-modal').classList.remove('show');
  currentEditUserId = null;
}

// -------------------- Tasks -------------------- //
async function loadTasks(page = 1, limit = 12) {
  try {
    const skip = (page - 1) * limit;
    const cntRes = await fetchJSON(`${API_BASE_URL}/tasks?count=true`);
    const total = cntRes.data ?? 0;

    const listRes = await fetchJSON(`${API_BASE_URL}/tasks?skip=${skip}&limit=${limit}`);
    const raw = Array.isArray(listRes.data) ? listRes.data : [];
    allTasks = raw.map(normalizeTask);

    renderTasksGrid(allTasks);
    renderPagination('tasks', page, total, limit);

    if (allUsers.length === 0) {
      const usersRes = await fetchJSON(`${API_BASE_URL}/users?limit=100`);
      if (Array.isArray(usersRes.data)) {
        allUsers = usersRes.data;
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
  if (!tasks.length) {
    grid.innerHTML = '<div class="loading-card">No tasks found</div>';
    return;
  }
  const statusNames = { 'pending': 'Pending', 'in-progress': 'In Progress', 'completed': 'Completed', 'cancelled': 'Cancelled' };
  const priorityNames = { 'low': 'Low', 'medium': 'Medium', 'high': 'High', 'urgent': 'Urgent' };
  grid.innerHTML = tasks.map(task => `
    <div class="task-card priority-${task.priority}">
      <div class="task-header">
        <div>
          <div class="task-title">${task.title}</div>
          <span class="badge badge-${getStatusBadgeClass(task.status)}">${statusNames[task.status] || task.status}</span>
          <span class="badge badge-${getPriorityBadgeClass(task.priority)}">${priorityNames[task.priority] || task.priority}</span>
        </div>
      </div>
      <div class="task-description">${task.description || 'No description'}</div>
      <div class="task-meta">
        <div class="task-meta-item">👤 ${task.userObj?.name || task.userId || 'Unassigned'}</div>
        <div class="task-meta-item">📅 Due: ${formatDate(task.dueDate)}</div>
        ${task.estimatedHours ? `<div class="task-meta-item">⏱️ Est: ${task.estimatedHours}h</div>` : ''}
      </div>
      <div class="task-actions">
        <button class="btn btn-small btn-secondary" onclick="editTask('${task._id}')">Edit</button>
        <button class="btn btn-small btn-danger" onclick="deleteTask('${task._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function getStatusBadgeClass(status) {
  const cls = { 'pending': 'warning', 'in-progress': 'info', 'completed': 'success', 'cancelled': 'secondary' };
  return cls[status] || 'secondary';
}
function getPriorityBadgeClass(priority) {
  const cls = { 'low': 'success', 'medium': 'info', 'high': 'warning', 'urgent': 'danger' };
  return cls[priority] || 'secondary';
}

function filterTasks() {
  const search = document.getElementById('task-search').value.toLowerCase();
  const status = document.getElementById('task-status-filter').value;
  const priority = document.getElementById('task-priority-filter').value;
  const filtered = allTasks.filter(task => {
    const matchSearch = (task.title ?? '').toLowerCase().includes(search) ||
                        (task.description ?? '').toLowerCase().includes(search);
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
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('task-duedate').value = tomorrow.toISOString().split('T')[0];
  populateUserSelect();
  document.getElementById('task-modal').classList.add('show');
}

function populateUserSelect() {
  const select = document.getElementById('task-user');
  select.innerHTML = '<option value="">Select user...</option>' +
    allUsers.map(u => `<option value="${u._id}">${u.name} (${u.email})</option>`).join('');
}

async function editTask(taskId) {
  try {
    const data = await fetchJSON(`${API_BASE_URL}/tasks/${taskId}`);
    const t = data.data;
    if (!t) return showToast(data.message || 'Failed to load task', 'error');

    const task = normalizeTask(t);
    currentEditTaskId = taskId;

    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-duedate').value = new Date(task.dueDate).toISOString().split('T')[0];
    document.getElementById('task-user').value = task.userObj?._id || task.userId || '';
    document.getElementById('task-estimated').value = task.estimatedHours || '';
    document.getElementById('task-tags').value = Array.isArray(task.tags) ? task.tags.join(', ') : '';
    populateUserSelect();
    document.getElementById('task-modal').classList.add('show');
  } catch (e) {
    console.error(e);
    showToast('Failed to load task details', 'error');
  }
}

async function submitTaskForm(e) {
  e.preventDefault();
  const tags = document.getElementById('task-tags').value
    .split(',').map(s => s.trim()).filter(Boolean);
  const taskData = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-description').value,
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    dueDate: document.getElementById('task-duedate').value,
    userId: document.getElementById('task-user').value,
    estimatedHours: parseFloat(document.getElementById('task-estimated').value) || undefined,
    tags: tags.length ? tags : undefined
  };
  const url = currentEditTaskId ? `${API_BASE_URL}/tasks/${currentEditTaskId}` : `${API_BASE_URL}/tasks`;
  const method = currentEditTaskId ? 'PUT' : 'POST';
  const resp = await fetchJSON(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) });
  if (resp._status >= 200 && resp._status < 300) {
    showToast(currentEditTaskId ? 'Task updated successfully' : 'Task created successfully', 'success');
    closeTaskModal();
    loadTasks();
    loadDashboard();
  } else {
    showToast(resp.message || 'Operation failed', 'error');
  }
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, { method: 'DELETE' });
  if (res.status === 204 || res.ok) {
    showToast('Task deleted successfully', 'success');
    loadTasks();
    loadDashboard();
  } else {
    const j = await res.json().catch(()=>({}));
    showToast(j.message || 'Delete failed', 'error');
  }
}

function closeTaskModal() {
  document.getElementById('task-modal').classList.remove('show');
  currentEditTaskId = null;
}

// -------------------- Search -------------------- //
async function performAdvancedSearch() {
  const keyword = document.getElementById('advanced-search').value;
  const status = document.getElementById('advanced-status').value;
  const priority = document.getElementById('advanced-priority').value;
  if (!keyword && !status && !priority) return showToast('Please enter search criteria', 'error');

  const q = new URLSearchParams();
  if (keyword) q.append('keyword', keyword);
  if (status) q.append('status', status);
  if (priority) q.append('priority', priority);

  try {
    const data = await fetchJSON(`${API_BASE_URL}/tasks/search?${q.toString()}`);
    if (Array.isArray(data.data)) renderSearchResults(data.data.map(normalizeTask));
    else showToast('Search failed', 'error');
  } catch (e) {
    console.error(e);
    showToast('Search failed', 'error');
  }
}

function renderSearchResults(tasks) {
  const resultsDiv = document.getElementById('search-results');
  if (!tasks.length) {
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

// -------------------- Pagination -------------------- //
function renderPagination(type, currentPage, total, limit) {
  const totalPages = Math.ceil((total || 0) / limit);
  const el = document.getElementById(`${type}-pagination`);
  if (totalPages <= 1) return (el.innerHTML = '');

  let html = '';
  html += `<button onclick="changePage('${type}', ${currentPage - 1}, ${limit})" ${currentPage === 1 ? 'disabled' : ''}>« Previous</button>`;
  const maxPages = Math.min(totalPages, 10);
  for (let i = 1; i <= maxPages; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage('${type}', ${i}, ${limit})">${i}</button>`;
  }
  html += `<button onclick="changePage('${type}', ${currentPage + 1}, ${limit})" ${currentPage === totalPages ? 'disabled' : ''}>Next »</button>`;
  el.innerHTML = html;
}

function changePage(type, page, limit) {
  if (type === 'users') loadUsers(page, limit);
  else if (type === 'tasks') loadTasks(page, limit);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  loadUsers();
  loadTasks();
});




