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

// ✅ 先匹配特殊路径
router.get('/stats', getTaskStats);
router.get('/search', searchTasks);
router.patch('/batch-update', batchUpdateTasks);

// ✅ 集合资源
router.route('/')
  .get(getTasks)
  .post(createTask);

// ✅ 单资源（最后）
router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;





