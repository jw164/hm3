// routes/taskRoutes.js
const express = require('express');
const {
  getTasks,
  getTask,            // ← 注意这里是 getTask
  createTask,
  updateTask,
  deleteTask,
  batchUpdateTasks,
  getTaskStats,
  searchTasks,
} = require('../controllers/taskController');

const queryParser = require('../middleware/queryParser');

const router = express.Router();

router.use(queryParser);

// 列表 & 新建
router.route('/')
  .get(getTasks)
  .post(createTask);

// 非 ID 路由（一定在 /:id 之前）
router.get('/stats', getTaskStats);
router.get('/search', searchTasks);
router.patch('/batch-update', batchUpdateTasks);

// ID 路由（最后）
router.route('/:id')
  .get(getTask)           // ← 这里用 getTask
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;




