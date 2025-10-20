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

// 智能映射查询条件：兼容旧字段 status/title/dueDate/userId，
// 并把 completed:true/false 转成 $or，同时匹配旧的 status 存法。
function mapWhereKeys(where = {}) {
  const w = { ...where };

  // —— 旧字段 → 标准字段 —— //
  if (w.title && !w.name) {
    w.name = w.title;
    delete w.title;
  }
  if (w.dueDate && !w.deadline) {
    w.deadline = w.dueDate;
    delete w.dueDate;
  }
  if (w.userId && !w.assignedUser) {
    w.assignedUser = w.userId;
    delete w.userId;
  }

  // 如果传了 status 但没传 completed，用 status 推断 completed
  if (w.status !== undefined && w.completed === undefined) {
    const s = String(w.status).toLowerCase();
    w.completed = (s === 'completed' || s === 'done' || s === 'true' || s === '1');
    delete w.status;
  }

  // 若传了 completed（可能是布尔或字符串），构造同时匹配旧 status 的 $or
  if (w.completed !== undefined) {
    const isTrue =
      (typeof w.completed === 'boolean'  && w.completed === true) ||
      (typeof w.completed === 'string'   && ['true', '1', 'completed', 'done'].includes(w.completed.toLowerCase())) ||
      (typeof w.completed === 'number'   && Number(w.completed) === 1);

    // 删掉原 completed，用 $or 同时覆盖两种存法
    delete w.completed;

    w.$or = isTrue
      ? [
          { completed: true },
          { status: { $in: ['completed', 'done', true, 1, 'true'] } }
        ]
      : [
          { completed: false },
          { status: { $in: ['pending', 'todo', 'in-progress', false, 0, 'false'] } }
        ];
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

exports.getTask = exports.getTaskById;
exports.updateTask = exports.replaceTask;






