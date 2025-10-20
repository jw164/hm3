// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// routes
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// ========== App ==========
const app = express();

// Render / 反向代理后获取正确的协议和 IP
app.set('trust proxy', 1);

// -------- CORS --------
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins.length ? allowedOrigins : true, // 没配就全放行
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: false,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// -------- Middlewares --------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (NODE_ENV === 'development') app.use(morgan('dev'));

// -------- Static --------
// 你的前端静态文件（GitHub Pages 已托管前端时，这段不影响）
app.use(express.static(path.join(__dirname, 'public')));

// -------- Health checks --------
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API 运行正常',
    timestamp: new Date().toISOString(),
  });
});

// API welcome
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
      taskSearch: '/api/tasks/search',
    },
  });
});

// -------- Routes --------
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

// (可选) 根路径跳到前端首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: '未找到请求的资源' });
});

// 错误处理中间件
app.use(errorHandler);

// ========== Bootstrap: 先连库，再启动 ==========
async function start() {
  try {
    await connectDB(); // 这里会读取 process.env.MONGODB_URI
    const server = app.listen(PORT, () => {
      const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      console.log(`\n✅ Server is running on ${host}`);
      console.log(`🌱 Env: ${NODE_ENV}`);
      console.log(`🧾 API: ${host}/api`);
    });

    // 未捕获的 Promise
    process.on('unhandledRejection', (err) => {
      console.error('UnhandledRejection:', err?.message || err);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    console.error('❌ 启动失败:', err?.message || err);
    process.exit(1);
  }
}

start();

module.exports = app;

