// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const queryParser = require('./middleware/queryParser'); // ✅ 新增

// routes
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

const app = express();
app.set('trust proxy', 1);

// -------- CORS --------
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://jw164.github.io',           // ✅ GitHub Pages
];
const extraFromEnv = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...extraFromEnv])];

app.use(cors({
  origin: (origin, cb) => {
    // 允许无 Origin（如 curl/Render 健康检查）
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.options('*', cors());

// -------- Middlewares --------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (NODE_ENV === 'development') app.use(morgan('dev'));

// ✅ 解析 where/sort/select/populate 等查询参数，供控制器使用 req.parsedQuery
app.use(queryParser);

// -------- Static (可选) --------
app.use(express.static(path.join(__dirname, 'public')));

// -------- Health checks --------
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API 运行正常', timestamp: new Date().toISOString() });
});

// ✅ 非常简易的探活
app.get('/api/ping', (req, res) => res.status(200).send('pong'));

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

// ========== Bootstrap ==========
async function start() {
  try {
    await connectDB(); // 读取 process.env.MONGODB_URI
    const server = app.listen(PORT, () => {
      const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      console.log(`\n✅ Server is running on ${host}`);
      console.log(`🌱 Env: ${NODE_ENV}`);
      console.log(`🧾 API: ${host}/api`);
    });

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


