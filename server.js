require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// 引入路由
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');

// 连接数据库
connectDB();

// 初始化 Express 应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static('public'));

// 日志中间件
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API 运行正常',
    timestamp: new Date().toISOString()
  });
});

// API 根路由
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: '欢迎使用任务管理 API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      tasks: '/api/tasks',
      userStats: '/api/users/stats',
      taskStats: '/api/tasks/stats',
      taskSearch: '/api/tasks/search'
    },
    queryParams: {
      where: '条件过滤 (JSON)',
      sort: '排序 (JSON)',
      skip: '跳过记录数',
      limit: '限制返回数量',
      select: '选择字段 (JSON)',
      populate: '关联查询 (JSON)'
    }
  });
});

// 注册路由
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '未找到请求的资源'
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📱 网页界面: http://localhost:${PORT}`);
  console.log(`📚 API 文档: http://localhost:${PORT}/api`);
});

// 处理未捕获的异常
process.on('unhandledRejection', (err) => {
  console.log(`错误: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;

