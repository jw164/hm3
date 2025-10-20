const express = require('express');
const router = express.Router();
const parseQuery = require('../middleware/queryParser');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  batchUpdateTasks,
  getTaskStats,
  searchTasks
} = require('../controllers/taskController');

// 特殊路由需要在 :id 路由之前
router.get('/stats', getTaskStats);
router.get('/search', searchTasks);
router.patch('/batch-update', batchUpdateTasks);

// 任务 CRUD 路由
router.route('/')
  .get(parseQuery, getTasks)
  .post(createTask);

router.route('/:id')
  .get(parseQuery, getTask)
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;

