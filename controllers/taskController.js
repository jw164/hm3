// controllers/tasksController.js
const Task = require('../models/Task');
const User = require('../models/User');

/* ----------------------------- utils/helpers ----------------------------- */
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
    // 解析查询参数
    const where  = safeParseJSON(req.query.where, {});
    const sort   = safeParseJSON(req.query.sort, undefined);
    const select = safeParseJSON(req.query.select, undefined);
    const skip   = toInt(req.query.skip, 0);
    const limit  = toInt(req.query.limit, 100); // MP3 要求：tasks 默认 100
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
// 支持在 /:id 上应用 select
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
    const payload = req.body || {};
    // 必填校验
    if (!payload.name || !payload.deadline) {
      return sendError(res, 400, 'Task must include name and deadline');
    }
    // 设置合理默认值
    const task = new Task({
      name: payload.name,
      description: payload.description ?? '',
      deadline: payload.deadline,
      completed: payload.completed ?? false,
      assignedUser: payload.assignedUser ?? '',
      assignedUserName: payload.assignedUserName ?? 'unassigned',
    });

    const saved = await task.save();

    // 双向引用：若指定 assignedUser，则尝试维护 pendingTasks
    if (saved.assignedUser) {
      await attachTaskToUser(saved, saved.assignedUser);
    }
    return sendSuccess(res, 201, 'Created', saved);
  } catch (err) {
    return sendError(res, 500, 'Failed to create task');
  }
};

/* -------------------------------- PUT /:id ------------------------------- */
// MP3 要求：PUT 语义为“整体替换”
exports.replaceTask = async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};

    if (!body.name || !body.deadline) {
      return sendError(res, 400, 'Task must include name and deadline');
    }

    // 找到旧任务以便处理解绑/改绑
    const oldTask = await Task.findById(id);
    if (!oldTask) return sendError(res, 404, 'Task not found');

    // 构造新的字段（整体替换）
    const next = {
      name: body.name,
      description: body.description ?? '',
      deadline: body.deadline,
      completed: body.completed ?? false,
      assignedUser: body.assignedUser ?? '',
      assignedUserName: body.assignedUserName ?? 'unassigned',
    };

    // 更新
    const updated = await Task.findByIdAndUpdate(id, next, { new: true });

    // 维护双向引用
    const oldUser = oldTask.assignedUser || '';
    const newUser = updated.assignedUser || '';

    // 1) 如果改绑了用户，先从旧用户 pending 里移除
    if (oldUser && oldUser !== newUser) {
      await detachTaskFromUser(updated, oldUser);
    }
    // 2) 根据完成状态与新用户，做相应处理
    if (newUser) {
      if (updated.completed === false) await attachTaskToUser(updated, newUser);
      else await detachTaskFromUser(updated, newUser); // 已完成则不应在 pending 里
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

    // 从用户 pendingTasks 中移除
    if (toDelete.assignedUser) {
      await detachTaskFromUser(toDelete, toDelete.assignedUser);
    }

    await Task.findByIdAndDelete(id);
    // 204: No Content（MP 要求之一）
    return res.status(204).send();
  } catch (err) {
    return sendError(res, 500, 'Failed to delete task');
  }
};



