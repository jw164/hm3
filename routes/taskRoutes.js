// routes/taskRoutes.js
const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  batchUpdateTasks,
  getTaskStats,
  searchTasks,
} = require('../controllers/taskController');

const queryParser = require('../middleware/queryParser');

const router = express.Router();

// 解析 ?where / ?sort / ?select / ?populate 等
router.use(queryParser);

// 列表 & 新建
router.route('/')
  .get(getTasks)
  .post(createTask);

// ✅ 非 ID 路由 —— 一定要放在 `/:id` 之前
router.get('/stats', getTaskStats);
router.get('/search', searchTasks);
router.patch('/batch-update', batchUpdateTasks);

// ✅ ID 路由 —— 一定要放在最后
router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;




