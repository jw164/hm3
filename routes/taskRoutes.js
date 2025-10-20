// routes/taskRoutes.js
const express = require('express');
const router = express.Router();

const {
  getTasks,
  getTask,            // 注意：名字必须和 controller 里的函数一致
  createTask,
  updateTask,
  deleteTask,
  batchUpdateTasks,
  getTaskStats,
  searchTasks,
} = require('../controllers/taskController');

// ✅ 1️⃣ 先写“特殊路径”的路由 —— 必须放在最上面
router.get('/stats', getTaskStats);        // 统计信息
router.get('/search', searchTasks);        // 搜索任务
router.patch('/batch-update', batchUpdateTasks); // 批量更新

// ✅ 2️⃣ 然后写“集合资源”的路由（无 ID）
router.route('/')
  .get(getTasks)       // 获取所有任务
  .post(createTask);   // 创建新任务

// ✅ 3️⃣ 最后写“单个资源”的路由（带 ID）
router.route('/:id')
  .get(getTask)        // 根据 ID 获取任务
  .put(updateTask)     // 更新任务
  .delete(deleteTask); // 删除任务

module.exports = router;





