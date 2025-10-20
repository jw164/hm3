// controllers/taskController.js
const Task = require('../models/Task');
const User = require('../models/User');

/* ----------------------------- helpers ----------------------------- */
function sendSuccess(res, status = 200, message = 'OK', data = null) {
  return res.status(status).json({ message, data });
}
function sendError(res, status = 500, message = 'Server error', data = null) {
  return res.status(status).json({ message, data });
}
function safeParseJSON(raw, fallback = undefined) {
  if (raw === undefined) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
function toInt(val, def) {
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
}

/** 兼容你的字段 -> 统一为作业规范字段 */
function normalizeInput(payload = {}) {
  const name      = payload.name      ?? payload.title;
  const deadline  = payload.deadline  ?? payload.dueDate;
  const completed = payload.completed ?? (payload.status ? String(payload.status).toLowerCase() === 'completed' : false);
  const assignedUser = payload.assignedUser ?? payload.userId ?? '';
  const assignedUserName = payload.assignedUserName ?? payload.userName ?? 'unassigned';

  return {
    name,
    description: payload.description ?? '',
    deadline,
    completed,
    assignedUser,
    assignedUserName,
  };
}

/** 兼容 where 中的“别名字段” */
function mapWhereKeys(where = {}) {
  const w = { ...where };
  if (w.title && !w.name) { w.name = w.title; delete w.title; }
  if (w.dueDate && !w.deadline) { w.deadline = w.dueDate; delete w.dueDate; }
  if (w.userId && !w.assignedUser) { w.assignedUser = w.userId; delete w.userId; }
  if (w.status !== undefined && w.completed === undefined) {
    const s = String(w.status).toLowerCase();
    w.completed = (s === 'completed' || s === 'true' || s === '1');
    delete w.status;
  }
  return w;
}

/** keep task/user references consistent */
async function attachTaskToUser(taskDoc, userId) {
  if (!userId) return;
  const user = await User.findById(userId);
  if (!user) return;
  // 仅未完成任务才进入 pendingTasks
  if (taskDoc.completed === false) {
    const tid = String(taskDoc._id);
    if (!user.pendingTasks.map(String).includes(tid)) {
      user.pendingTasks.push(tid);
      await user.save();
    }
  }
}
async function detachTaskFromUser(taskDoc, userId) {
  if (!userId) return;
  const user = await User.findById(userId);
  if (!user) return;
  const tid = String(taskDoc._id);
  const before = user.pendingTasks.length;
  user.pendingTasks = user.pendingTasks.filter(id => String(id) !== tid);
  if (user.pendingTasks.length !== before) {
    await user.save();
  }
}

/* --------------------------------- GET / --------------------------------- */
exports.getTasks = async (req, res) => {
  try {
    let where  = safeParseJSON(req.query.where, {});
    where = mapWhereKeys(where);

    const sort   = safeParseJSON(req.query.sort, undefined);
    const select = safeParseJSON(req.query.select, undefined);
    const skip   = toInt(req.query.skip, 0);
    const limit  = toInt(req.query.limit, 100); // MP3: tasks 默认 100
    const count  = String(req.query.count).toLowerCase() === 'true';

    if (count) {
      const n = await Task.countDocuments(where || {});
      return sendSuccess(res, 200, 'OK', n);
    }

    let q = Task.find(where || {});
    if (sort)   q = q.sort(sort);
    if (select) q = q.select(select);
    if (skip)   q = q.skip(skip);
    if (limit)  q = q.limit(limit);

    const docs = await q.exec();
    return sendSuccess(res, 200, 'OK', docs);
  } catch (err) {
    return sendError(res, 500, 'Failed to fetch tasks');
  }
};

/* ------------------------------ GET /:id --------------------------------- */
exports.getTaskById = async (req, res) => {
  try {
    const select = safeParseJSON(req.query.select, undefined);
    const q = select ? Task.findById(req.params.id).select(select)
                     : Task.findById(req.params.id);
    const doc = await q.exec();
    if (!doc) return sendError(res, 404, 'Task not found');
    return sendSuccess(res, 200, 'OK', doc);
  } catch {
    return sendError(res, 400, 'Invalid task id');
  }
};

/* -------------------------------- POST / --------------------------------- */
exports.createTask = async (req, res) => {
  try {
    const body = normalizeInput(req.body || {});
    // 必填校验（兼容）
    if (!body.name || !body.deadline) {
      return sendError(res, 400, 'Task must include name (or title) and deadline (or dueDate)');
    }

    const task = new Task(body);
    const saved = await task.save();

    // 双向引用：若指定 assignedUser，则维护 pendingTasks
    if (saved.assignedUser) {
      await attachTaskToUser(saved, saved.assignedUser);
    }
    return sendSuccess(res, 201, 'Created', saved);
  } catch (err) {
    return sendError(res, 500, 'Failed to create task');
  }
};

/* -------------------------------- PUT /:id ------------------------------- */
exports.replaceTask = async (req, res) => {
  try {
    const id = req.params.id;
    const oldTask = await Task.findById(id);
    if (!oldTask) return sendError(res, 404, 'Task not found');

    const body = normalizeInput(req.body || {});
    if (!body.name || !body.deadline) {
      return sendError(res, 400, 'Task must include name (or title) and deadline (or dueDate)');
    }

    const updated = await Task.findByIdAndUpdate(id, body, { new: true });

    const oldUser = oldTask.assignedUser || '';
    const newUser = updated.assignedUser || '';

    if (oldUser && oldUser !== newUser) {
      await detachTaskFromUser(updated, oldUser);
    }
    if (newUser) {
      if (updated.completed === false) await attachTaskToUser(updated, newUser);
      else await detachTaskFromUser(updated, newUser);
    }

    return sendSuccess(res, 200, 'OK', updated);
  } catch (err) {
    return sendError(res, 500, 'Failed to update task');
  }
};

/* ------------------------------ DELETE /:id ------------------------------ */
exports.deleteTask = async (req, res) => {
  try {
    const id = req.params.id;
    const toDelete = await Task.findById(id);
    if (!toDelete) return sendError(res, 404, 'Task not found');

    if (toDelete.assignedUser) {
      await detachTaskFromUser(toDelete, toDelete.assignedUser);
    }
    await Task.findByIdAndDelete(id);
    return res.status(204).send(); // No Content
  } catch (err) {
    return sendError(res, 500, 'Failed to delete task');
  }
};




