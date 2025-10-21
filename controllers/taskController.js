const Task = require('../models/Task');
const User = require('../models/User');

/**
 * @desc    获取所有任务
 * @route   GET /api/tasks
 * @access  Public
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { where = {}, sort, skip = 0, limit = 10, select, populate } = req.parsedQuery || {};

    // 构建查询
    let query = Task.find(where);

    // 应用排序
    if (sort) {
      query = query.sort(sort);
    }

    // 应用分页
    query = query.skip(skip).limit(limit);

    // 应用字段选择
    if (select) {
      query = query.select(select);
    }

    // 应用关联查询
    if (populate) {
      query = query.populate(populate);
    }

    // 执行查询
    const tasks = await query;

    // 获取总数
    const total = await Task.countDocuments(where);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      pagination: {
        skip,
        limit,
        hasMore: skip + tasks.length < total
      },
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
    const { populate } = req.parsedQuery || {};
    
    let query = Task.findById(req.params.id);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    const task = await query;

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '未找到该任务'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    创建新任务
 * @route   POST /api/tasks
 * @access  Public
 */
exports.createTask = async (req, res, next) => {
  try {
    // 验证用户是否存在
    const user = await User.findById(req.body.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在，无法创建任务'
      });
    }

    const task = await Task.create(req.body);

    // 返回带用户信息的任务
    await task.populate('userId', 'name email');

    res.status(201).json({
      success: true,
      message: '任务创建成功',
      data: task
    });
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
    // 如果更新 userId，验证用户是否存在
    if (req.body.userId) {
      const user = await User.findById(req.body.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在，无法更新任务'
        });
      }
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('userId', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '未找到该任务'
      });
    }

    res.status(200).json({
      success: true,
      message: '任务更新成功',
      data: task
    });
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

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '未找到该任务'
      });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: '任务已删除',
      data: {}
    });
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
      return res.status(400).json({
        success: false,
        message: '请提供任务 ID 数组'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: '请提供要更新的状态'
      });
    }

    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { status }
    );

    res.status(200).json({
      success: true,
      message: `成功更新 ${result.modifiedCount} 个任务`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
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

    // 按状态统计
    const statusStats = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 按优先级统计
    const priorityStats = await Task.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // 即将到期的任务（7天内）
    const upcomingDeadline = new Date();
    upcomingDeadline.setDate(upcomingDeadline.getDate() + 7);
    
    const tasksWithUpcomingDeadline = await Task.countDocuments({
      dueDate: { $lte: upcomingDeadline, $gte: new Date() },
      status: { $ne: 'completed' }
    });

    // 已逾期的任务
    const overdueTasks = await Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });

    // 按用户统计任务数
    const tasksPerUser = await Task.aggregate([
      {
        $group: {
          _id: '$userId',
          taskCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userName: '$user.name',
          userEmail: '$user.email',
          taskCount: 1
        }
      },
      {
        $sort: { taskCount: -1 }
      },
      {
        $limit: 10
      }
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

    let query = {};

    // 关键词搜索
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    // 状态筛选
    if (status) {
      query.status = status;
    }

    // 优先级筛选
    if (priority) {
      query.priority = priority;
    }

    // 用户筛选
    if (userId) {
      query.userId = userId;
    }

    const tasks = await Task.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

