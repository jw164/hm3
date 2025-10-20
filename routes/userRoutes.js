const express = require('express');
const router = express.Router();
const parseQuery = require('../middleware/queryParser');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserTasks,
  getUserStats
} = require('../controllers/userController');

// 统计路由需要在 :id 路由之前
router.get('/stats', getUserStats);

// 用户 CRUD 路由
router.route('/')
  .get(parseQuery, getUsers)
  .post(createUser);

router.route('/:id')
  .get(parseQuery, getUser)
  .put(updateUser)
  .delete(deleteUser);

// 获取用户的所有任务
router.get('/:id/tasks', parseQuery, getUserTasks);

module.exports = router;

