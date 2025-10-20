// routes/taskRoutes.js
const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
  searchTasks,
} = require('../controllers/taskController');

// 列表 & 创建
router.route('/')
  .get(getTasks)
  .post(createTask);

// 统计
router.get('/stats', getTaskStats);

// 搜索
router.get('/search', searchTasks);

// 详情 / 更新 / 删除
router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;


