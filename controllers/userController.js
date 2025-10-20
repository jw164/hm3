const User = require('../models/User');
const Task = require('../models/Task');

/**
 * @desc    获取所有用户
 * @route   GET /api/users
 * @access  Public
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { where = {}, sort, skip = 0, limit = 10, select, populate } = req.parsedQuery || {};

    // 构建查询
    let query = User.find(where);

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
    const users = await query;

    // 获取总数
    const total = await User.countDocuments(where);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pagination: {
        skip,
        limit,
        hasMore: skip + users.length < total
      },
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取单个用户
 * @route   GET /api/users/:id
 * @access  Public
 */
exports.getUser = async (req, res, next) => {
  try {
    const { populate } = req.parsedQuery || {};
    
    let query = User.findById(req.params.id);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    const user = await query;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '未找到该用户'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    创建新用户
 * @route   POST /api/users
 * @access  Public
 */
exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新用户
 * @route   PUT /api/users/:id
 * @access  Public
 */
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '未找到该用户'
      });
    }

    res.status(200).json({
      success: true,
      message: '用户更新成功',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    删除用户
 * @route   DELETE /api/users/:id
 * @access  Public
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '未找到该用户'
      });
    }

    // 删除用户的所有任务
    await Task.deleteMany({ userId: user._id });

    // 删除用户
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: '用户及其所有任务已删除',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取用户的所有任务
 * @route   GET /api/users/:id/tasks
 * @access  Public
 */
exports.getUserTasks = async (req, res, next) => {
  try {
    const { sort, skip = 0, limit = 10, select } = req.parsedQuery || {};

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '未找到该用户'
      });
    }

    // 构建查询
    let query = Task.find({ userId: req.params.id });

    if (sort) {
      query = query.sort(sort);
    }

    query = query.skip(skip).limit(limit);

    if (select) {
      query = query.select(select);
    }

    const tasks = await query;
    const total = await Task.countDocuments({ userId: req.params.id });

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
 * @desc    获取用户统计信息
 * @route   GET /api/users/stats
 * @access  Public
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = totalUsers - activeUsers;

    // 按角色统计
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        roleDistribution: roleStats
      }
    });
  } catch (error) {
    next(error);
  }
};

