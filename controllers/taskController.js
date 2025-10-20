// controllers/taskController.js
const Task = require('../models/Task');
const User = require('../models/User');

/** 将可能是字符串的 JSON 参数解析为对象 */
function parseMaybeJSON(val, fallback = undefined) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback ?? val; }
}

/**
 * @desc    获取所有任务
 * @route   GET /api/tasks
 * @access  Public
 *
 * 支持：
 *   ?where={}      (JSON 字符串或对象)
 *   &sort={}       (JSON)
 *   &skip=0&limit=10
 *   &select={}     (JSON)
 *   &populate={}   (JSON，如 {"path":"userId","select":"name email"})
 */
exports.getTasks = async (req, res, next) => {
  try {
    // 兼容 queryParser 中间件 & 直接 query 传参两种情况
    const q = req.parsedQuery || req.query || {};

    const where    = parseMaybeJSON(q.where, {});
    const sort     = parseMaybeJSON(q.sort);
    const select   = parseMaybeJSON(q.select);
    const populate = parseMaybeJSON(q.populate);
    const skip     = Number(q.skip || 0);
    const limit    = Math.min(Number(q.limit || 10), 100);

    let query = Task.find(where);
    if (sort)   query = query.sort(sort);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);

    const [tasks, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Task.countDocuments(where)
    ]);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      pagination: { skip, limit, hasMore: skip + tasks.length < total },
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取单个任务
 * @route   GET /api/tasks/:id
 * @access  Public
 */
exports.getTask = async (req, res, next) => {
  try {
    const q = req.parsedQuery || req.query || {};
    const populate = parseMaybeJSON(q.populate);

    let query = Task.findById(req.params.id);
    if (populate) query = query.populate(populate);

    const task = await query;
    if (!task) return res.status(404).json({ success: false, message: '未找到该任务' });

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    创建新任务
 * @route   POST /api/tasks
 * @access  Public
 *
 * 现在允许不传 userId；传了才校验用户是否存在
 */
exports.createTask = async (req, res, next) => {
  try {
    const { userId, title, status, priority, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'title 必填' });
    }

    // 传了 userId 才校验
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在，无法创建任务' });
      }
    }

    const task = await Task.create({
      ...req.body,
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate: dueDate || new Date()
    });

    await task.populate('userId', 'name email'); // 返回带用户信息
    res.status(201).json({ success: true, message: '任务创建成功', data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新任务
 * @route   PUT /api/tasks/:id
 * @access  Public
 */
exports.updateTask = async (req, res, next) => {
  try {
    // 若更新 userId，仍进行校验（允许清空 userId）
    if (req.body.userId) {
      const user = await User.findById(req.body.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在，无法更新任务' });
      }
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!task) return res.status(404).json({ success: false, message: '未找到该任务' });

    res.status(200).json({ success: true, message: '任务更新成功', data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    删除任务
 * @route   DELETE /api/tasks/:id
 * @access  Public
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: '未找到该任务' });

    await task.deleteOne();
    res.status(200).json({ success: true, message: '任务已删除', data: {} });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    批量更新任务状态
 * @route   PATCH /api/tasks/batch-update
 * @access  Public
 */
exports.batchUpdateTasks = async (req, res, next) => {
  try {
    const { taskIds, status } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, message: '请提供任务 ID 数组' });
    }
    if (!status) {
      return res.status(400).json({ success: false, message: '请提供要更新的状态' });
    }

    const result = await Task.updateMany({ _id: { $in: taskIds } }, { status });
    res.status(200).json({
      success: true,
      message: `成功更新 ${result.modifiedCount} 个任务`,
      data: { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取任务统计信息
 * @route   GET /api/tasks/stats
 * @access  Public
 */
exports.getTaskStats = async (req, res, next) => {
  try {
    const totalTasks = await Task.countDocuments();

    const statusStats = await Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const priorityStats = await Task.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]);

    const upcomingDeadline = new Date();
    upcomingDeadline.setDate(upcomingDeadline.getDate() + 7);

    const tasksWithUpcomingDeadline = await Task.countDocuments({
      dueDate: { $lte: upcomingDeadline, $gte: new Date() },
      status: { $ne: 'completed' }
    });

    const overdueTasks = await Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });

    const tasksPerUser = await Task.aggregate([
      { $group: { _id: '$userId', taskCount: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { userName: '$user.name', userEmail: '$user.email', taskCount: 1 } },
      { $sort: { taskCount: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        statusDistribution: statusStats,
        priorityDistribution: priorityStats,
        upcomingDeadline: tasksWithUpcomingDeadline,
        overdueTasks,
        topUsersWithMostTasks: tasksPerUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    搜索任务
 * @route   GET /api/tasks/search
 * @access  Public
 */
exports.searchTasks = async (req, res, next) => {
  try {
    const { keyword, status, priority, userId } = req.query;

    const query = {};
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    if (status)   query.status = status;
    if (priority) query.priority = priority;
    if (userId)   query.userId = userId;

    const tasks = await Task.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};


