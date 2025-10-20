# 任务管理 API (Todo List API)

完整的任务管理系统 RESTful API，基于 Node.js、Express 和 MongoDB 构建。

## 技术栈

- **Node.js** - JavaScript 运行环境
- **Express** - Web 应用框架
- **MongoDB Atlas** - 云数据库
- **Mongoose** - MongoDB ODM
- **dotenv** - 环境变量管理
- **cors** - 跨域资源共享
- **morgan** - HTTP 请求日志

## 功能特性

### 核心功能
- ✅ 用户管理 (Users CRUD)
- ✅ 任务管理 (Tasks CRUD)
- ✅ 高级查询过滤 (where, sort, skip, limit, select)
- ✅ 数据验证和错误处理
- ✅ 双向关联更新（用户-任务）
- ✅ 统计数据接口
- ✅ 批量操作
- ✅ 任务搜索功能

### 查询功能
- **where**: JSON 条件过滤
- **sort**: 排序（支持多字段）
- **skip**: 分页偏移
- **limit**: 限制返回数量 (1-100)
- **select**: 字段选择
- **populate**: 关联查询

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件并配置以下变量：

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todolist?retryWrites=true&w=majority
PORT=3000
NODE_ENV=development
```

### 3. 生成种子数据

运行以下命令生成 20+ 用户和 100+ 任务的测试数据：

```bash
npm run seed
```

### 4. 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动

## API 端点

### 用户接口 (Users)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/users` | 获取所有用户（支持查询参数） |
| GET | `/api/users/:id` | 获取单个用户 |
| POST | `/api/users` | 创建新用户 |
| PUT | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户及其所有任务 |
| GET | `/api/users/:id/tasks` | 获取用户的所有任务 |
| GET | `/api/users/stats` | 获取用户统计信息 |

### 任务接口 (Tasks)

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/tasks` | 获取所有任务（支持查询参数） |
| GET | `/api/tasks/:id` | 获取单个任务 |
| POST | `/api/tasks` | 创建新任务 |
| PUT | `/api/tasks/:id` | 更新任务 |
| DELETE | `/api/tasks/:id` | 删除任务 |
| GET | `/api/tasks/stats` | 获取任务统计信息 |
| GET | `/api/tasks/search` | 搜索任务 |
| PATCH | `/api/tasks/batch-update` | 批量更新任务状态 |

## 使用示例

### 1. 创建用户

```bash
POST /api/users
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "age": 28,
  "role": "user",
  "phoneNumber": "13800138000",
  "address": "北京市朝阳区"
}
```

### 2. 创建任务

```bash
POST /api/tasks
Content-Type: application/json

{
  "title": "完成项目文档",
  "description": "编写完整的API文档",
  "status": "pending",
  "priority": "high",
  "dueDate": "2025-12-31",
  "userId": "用户ID",
  "tags": ["文档", "重要"],
  "estimatedHours": 8
}
```

### 3. 高级查询示例

#### 查询特定状态的任务
```bash
GET /api/tasks?where={"status":"pending"}
```

#### 按优先级排序
```bash
GET /api/tasks?sort={"priority":-1}
```

#### 分页查询
```bash
GET /api/tasks?skip=0&limit=10
```

#### 只返回特定字段
```bash
GET /api/tasks?select=["title","status","dueDate"]
```

#### 组合查询
```bash
GET /api/tasks?where={"status":"in-progress","priority":"high"}&sort={"dueDate":1}&limit=20
```

#### 关联查询用户信息
```bash
GET /api/tasks?populate={"path":"userId","select":"name email"}
```

### 4. 搜索任务

```bash
GET /api/tasks/search?keyword=文档&status=pending&priority=high
```

### 5. 批量更新任务状态

```bash
PATCH /api/tasks/batch-update
Content-Type: application/json

{
  "taskIds": ["任务ID1", "任务ID2", "任务ID3"],
  "status": "completed"
}
```

### 6. 获取统计信息

```bash
# 用户统计
GET /api/users/stats

# 任务统计
GET /api/tasks/stats
```

## 数据模型

### User（用户）

```javascript
{
  name: String (必填, 2-50字符),
  email: String (必填, 唯一, 有效邮箱格式),
  age: Number (0-150),
  role: String (user/admin/manager, 默认: user),
  isActive: Boolean (默认: true),
  phoneNumber: String,
  address: String,
  createdAt: Date (自动生成),
  updatedAt: Date (自动生成)
}
```

### Task（任务）

```javascript
{
  title: String (必填, 3-200字符),
  description: String (最多1000字符),
  status: String (pending/in-progress/completed/cancelled, 默认: pending),
  priority: String (low/medium/high/urgent, 默认: medium),
  dueDate: Date (必填, 不能早于当前日期),
  completedAt: Date,
  userId: ObjectId (必填, 关联用户),
  tags: [String],
  estimatedHours: Number,
  actualHours: Number,
  createdAt: Date (自动生成),
  updatedAt: Date (自动生成)
}
```

## 响应格式

### 成功响应

```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... },
  "count": 10,
  "total": 100,
  "pagination": {
    "skip": 0,
    "limit": 10,
    "hasMore": true
  }
}
```

### 错误响应

```json
{
  "success": false,
  "message": "错误信息",
  "errors": "详细错误描述"
}
```

## HTTP 状态码

- `200` - 成功
- `201` - 创建成功
- `400` - 请求错误（验证失败）
- `404` - 资源未找到
- `500` - 服务器错误

## 数据验证规则

### 用户验证
- ✅ 邮箱必须唯一
- ✅ 邮箱格式验证
- ✅ 用户名长度 2-50 字符
- ✅ 年龄范围 0-150

### 任务验证
- ✅ 标题必填，3-200 字符
- ✅ 截止日期必填且不能早于当前日期
- ✅ 用户 ID 必须存在
- ✅ 状态和优先级枚举验证
- ✅ 工时不能为负数

### 双向关联
- ✅ 删除用户时自动删除其所有任务
- ✅ 创建/更新任务时验证用户存在
- ✅ 查询用户时可关联查询其任务

## 项目结构

```
.
├── config/
│   └── database.js          # 数据库连接配置
├── models/
│   ├── User.js              # 用户模型
│   └── Task.js              # 任务模型
├── controllers/
│   ├── userController.js    # 用户控制器
│   └── taskController.js    # 任务控制器
├── routes/
│   ├── userRoutes.js        # 用户路由
│   └── taskRoutes.js        # 任务路由
├── middleware/
│   ├── queryParser.js       # 查询解析中间件
│   └── errorHandler.js      # 错误处理中间件
├── scripts/
│   └── seed.js              # 种子数据生成脚本
├── server.js                # 服务器主文件
├── package.json             # 项目依赖配置
├── .gitignore              # Git 忽略文件
└── README.md               # 项目文档
```

## 开发说明

### 查询参数示例

1. **复杂条件查询**
```
?where={"status":"pending","priority":{"$in":["high","urgent"]}}
```

2. **多字段排序**
```
?sort={"priority":-1,"dueDate":1}
```

3. **关联查询**
```
?populate={"path":"userId","select":"name email role"}
```

4. **组合使用**
```
?where={"status":"in-progress"}&sort={"dueDate":1}&skip=0&limit=10&populate={"path":"userId","select":"name email"}
```

## 注意事项

1. MongoDB Atlas 连接字符串需要正确配置
2. 确保数据库有足够的存储空间
3. limit 参数最大值为 100
4. 日期格式使用 ISO 8601 标准
5. 删除用户会同时删除其所有任务

## License

ISC

