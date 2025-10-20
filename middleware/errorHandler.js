/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ');
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: message
    });
  }

  // Mongoose 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} 已存在，请使用其他值`
    });
  }

  // Mongoose 无效 ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: '无效的资源 ID'
    });
  }

  // 默认错误
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || '服务器内部错误'
  });
};

module.exports = errorHandler;

