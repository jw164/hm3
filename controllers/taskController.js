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



/* ===================== 任务统计：GET /api/tasks/stats ===================== */
exports.getTaskStats = async (req, res) => {
  try {
    const total = await Task.countDocuments({});

    // 按状态统计（如果你的模型用 completed 也没关系，下面还会返回 completed 统计）
    const statusStats = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 按优先级统计（若模型没有 priority，返回会是空数组）
    const priorityStats = await Task.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // 未来 7 天到期但未完成
    const upcomingDeadline = new Date();
    upcomingDeadline.setDate(upcomingDeadline.getDate() + 7);

    const upcoming = await Task.countDocuments({
      deadline: { $lte: upcomingDeadline, $gte: new Date() },
      completed: { $ne: true },
    });

    // 已逾期但未完成
    const overdue = await Task.countDocuments({
      deadline: { $lt: new Date() },
      completed: { $ne: true },
    });

    // 同时给出 completed 的分布，方便前端绘图（可选）
    const completedStats = await Task.aggregate([
      { $group: { _id: '$completed', count: { $sum: 1 } } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers: undefined, // 仅占位，前端如果需要用户统计请调用 /api/users/stats
        totalTasks: total,
        statusDistribution: statusStats,
        priorityDistribution: priorityStats,
        upcomingDeadline: upcoming,
        overdueTasks: overdue,
        completedDistribution: completedStats,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: '统计失败', error: String(err) });
  }
};

/* ======================= 任务搜索：GET /api/tasks/search ======================= */
/* 支持：
   ?keyword=xxx &status=pending|in-progress|completed
   &priority=low|medium|high|urgent &userId=<id>
*/
exports.searchTasks = async (req, res) => {
  try {
    const { keyword, status, priority, userId } = req.query;

    const where = {};
    if (keyword) {
      where.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (userId) where.assignedUser = userId;

    const docs = await Task.find(where).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    return res.status(500).json({ success: false, message: '搜索失败', error: String(err) });
  }
};

/* ================= 批量更新：PATCH /api/tasks/batch-update ================= */
/* body: { taskIds: string[], status?: string, completed?: boolean } */
exports.batchUpdateTasks = async (req, res) => {
  try {
    const { taskIds, status, completed } = req.body || {};
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, message: '请提供 taskIds 数组' });
    }

    const toSet = {};
    if (status !== undefined) toSet.status = status;
    if (completed !== undefined) toSet.completed = completed;

    if (Object.keys(toSet).length === 0) {
      return res.status(400).json({ success: false, message: '请至少提供 status 或 completed 字段' });
    }

    const result = await Task.updateMany({ _id: { $in: taskIds } }, { $set: toSet });
    return res
      .status(200)
      .json({ success: true, matched: result.matchedCount, modified: result.modifiedCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: '批量更新失败', error: String(err) });
  }
};




