// routes/taskRoutes.js
const express = require('express');
const router = express.Router();
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

// 列表 & 创建
router.route('/')
  .get(getTasks)
  .post(createTask);

// 统计 & 搜索 & 批量更新
router.get('/stats', getTaskStats);
router.get('/search', searchTasks);
router.patch('/batch-update', batchUpdateTasks);

// 详情 / 更新 / 删除
router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;

