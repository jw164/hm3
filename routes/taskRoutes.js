// routes/taskRoutes.js
const express = require('express');
const router = express.Router();

+ const tasks = require('../controllers/taskController.js');

// 开发期防呆：如果函数没导到就直接抛错，避免把 undefined 注册到路由上
['getTasks', 'getTaskById', 'createTask', 'replaceTask', 'deleteTask'].forEach(fn => {
  if (typeof tasks[fn] !== 'function') {
    throw new Error(`tasksController.${fn} is not a function (got ${typeof tasks[fn]})`);
  }
});

router.get('/', tasks.getTasks);
router.get('/:id', tasks.getTaskById);
router.post('/', tasks.createTask);
router.put('/:id', tasks.replaceTask);
router.delete('/:id', tasks.deleteTask);

module.exports = router;


