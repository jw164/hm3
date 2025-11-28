// routes/todoRoutes.js
const express = require('express');
const router = express.Router();

let todos = [];   // MP3 要求：用内存数组即可，无需数据库
let id = 1;

// GET /todos
router.get('/', (req, res) => {
  res.json(todos);
});

// POST /todos
router.post('/', (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const newTodo = { id: id++, title };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

// DELETE /todos/:id
router.delete('/:id', (req, res) => {
  const todoId = Number(req.params.id);
  todos = todos.filter(t => t.id !== todoId);
  res.json({ success: true });
});

// PUT /todos/:id
router.put('/:id', (req, res) => {
  const todoId = Number(req.params.id);
  const { title } = req.body;

  const todo = todos.find(t => t.id === todoId);
  if (!todo) {
    return res.status(404).json({ error: 'Not found' });
  }

  todo.title = title || todo.title;
  res.json(todo);
});

module.exports = router;
