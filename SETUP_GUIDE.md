# 安装和配置指南

本指南将帮助你从零开始设置和运行任务管理 API。

## 前置要求

- Node.js (v14.0 或更高版本)
- npm 或 yarn
- MongoDB Atlas 账户（或本地 MongoDB）

## 详细安装步骤

### 1. 克隆或下载项目

```bash
cd work
```

### 2. 安装依赖

```bash
npm install
```

安装完成后，你会看到以下依赖包：
- express: Web 框架
- mongoose: MongoDB ODM
- dotenv: 环境变量管理
- cors: 跨域支持
- morgan: 日志记录

### 3. 设置 MongoDB Atlas

#### 3.1 创建 MongoDB Atlas 账户

1. 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 注册免费账户
3. 创建一个新的集群（选择免费的 M0 套餐）

#### 3.2 配置数据库访问

1. 在 Atlas 控制台，点击 "Database Access"
2. 添加新的数据库用户：
   - Username: 例如 `todoapi`
   - Password: 创建一个强密码（记住它！）
   - Database User Privileges: 选择 "Read and write to any database"

#### 3.3 配置网络访问

1. 点击 "Network Access"
2. 添加 IP 地址
3. 选择 "Allow Access from Anywhere" (0.0.0.0/0)
   - 注意：生产环境应该只允许特定 IP

#### 3.4 获取连接字符串

1. 点击 "Database"，然后点击 "Connect"
2. 选择 "Connect your application"
3. 复制连接字符串，格式如下：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 4. 配置环境变量

创建 `.env` 文件（项目根目录）：

```bash
# Windows PowerShell
New-Item -Path .env -ItemType File

# 或使用文本编辑器创建
```

在 `.env` 文件中添加以下内容：

```env
MONGODB_URI=mongodb+srv://todoapi:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/todolist?retryWrites=true&w=majority
PORT=3000
NODE_ENV=development
```

**重要提示：**
- 将 `YOUR_PASSWORD` 替换为你在步骤 3.2 中创建的密码
- 将 `cluster0.xxxxx` 替换为你的实际集群地址
- 确保密码中的特殊字符进行了 URL 编码：
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `%` → `%25`

### 5. 生成测试数据

运行种子脚本生成 20+ 用户和 100+ 任务：

```bash
npm run seed
```

你应该看到如下输出：
```
MongoDB 连接成功
清除现有数据...
创建用户数据...
成功创建 26 个用户
创建任务数据...
成功创建 110 个任务
数据库种子数据生成完成！
```

### 6. 启动服务器

#### 开发模式（推荐）
```bash
npm run dev
```

#### 生产模式
```bash
npm start
```

成功启动后，你会看到：
```
服务器运行在端口 3000
环境: development
访问 http://localhost:3000/api 查看 API 信息
MongoDB 已连接: cluster0-xxxxx.mongodb.net
```

### 7. 测试 API

#### 方法1：使用浏览器
访问 `http://localhost:3000/api`

#### 方法2：使用 curl
```bash
# 健康检查
curl http://localhost:3000/health

# 获取所有用户
curl http://localhost:3000/api/users

# 获取所有任务
curl http://localhost:3000/api/tasks
```

#### 方法3：使用 Postman
1. 导入 API 端点
2. 设置 Base URL: `http://localhost:3000`
3. 开始测试各个接口

## 常见问题

### 问题1：MongoDB 连接失败

**错误信息：**
```
MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster
```

**解决方案：**
1. 检查 `.env` 文件中的连接字符串是否正确
2. 确认密码中的特殊字符已进行 URL 编码
3. 检查 MongoDB Atlas 的网络访问设置
4. 确认数据库用户权限正确

### 问题2：端口被占用

**错误信息：**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案：**
1. 更改 `.env` 中的 PORT 值
2. 或者终止占用 3000 端口的进程：
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <进程ID> /F
   ```

### 问题3：依赖安装失败

**解决方案：**
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules
rmdir /s node_modules  # Windows

# 重新安装
npm install
```

### 问题4：种子数据生成失败

**解决方案：**
1. 确认数据库连接正常
2. 检查数据库用户权限（需要读写权限）
3. 查看具体错误信息并相应处理

## 验证安装

运行以下命令确认一切正常：

```bash
# 1. 检查服务器状态
curl http://localhost:3000/health

# 2. 获取用户统计
curl http://localhost:3000/api/users/stats

# 3. 获取任务统计
curl http://localhost:3000/api/tasks/stats

# 4. 测试查询功能
curl "http://localhost:3000/api/tasks?limit=5"
```

如果所有命令都返回正确的 JSON 响应，说明安装成功！

## 下一步

1. 阅读 [README.md](README.md) 了解完整的 API 功能
2. 查看 [API_EXAMPLES.md](API_EXAMPLES.md) 学习具体用法
3. 开始开发你的应用！

## 开发建议

1. **使用 nodemon 进行开发**
   - 已配置在 `npm run dev` 中
   - 代码更改时自动重启服务器

2. **使用 Postman 或 Insomnia**
   - 方便测试 API
   - 可以保存请求历史

3. **查看日志**
   - 开发模式下会显示详细的请求日志
   - 使用 morgan 中间件记录

4. **数据库管理**
   - 使用 MongoDB Compass 可视化管理数据
   - 连接字符串与 `.env` 中相同

## 生产环境部署

生产环境部署时请注意：

1. 设置 `NODE_ENV=production`
2. 使用强密码和安全的连接字符串
3. 限制 MongoDB Atlas 网络访问
4. 配置适当的 CORS 策略
5. 添加速率限制和身份验证
6. 使用 PM2 或类似工具管理进程

## 获取帮助

如果遇到其他问题：
1. 检查控制台错误信息
2. 查看 MongoDB Atlas 日志
3. 确认所有配置正确
4. 检查网络连接

祝你使用愉快！🚀

