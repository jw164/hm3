# API 使用示例集合

本文档提供了详细的 API 调用示例，帮助快速上手使用。

## 目录
- [用户管理](#用户管理)
- [任务管理](#任务管理)
- [高级查询](#高级查询)
- [统计接口](#统计接口)

---

## 用户管理

### 1. 获取所有用户（基础）

```bash
curl -X GET http://localhost:3000/api/users
```

响应：
```json
{
  "success": true,
  "count": 10,
  "total": 26,
  "pagination": {
    "skip": 0,
    "limit": 10,
    "hasMore": true
  },
  "data": [...]
}
```

### 2. 创建用户

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "李明",
    "email": "liming@example.com",
    "age": 30,
    "role": "manager",
    "phoneNumber": "13900139000",
    "address": "上海市浦东新区"
  }'
```

### 3. 更新用户

```bash
curl -X PUT http://localhost:3000/api/users/USER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "age": 31,
    "isActive": false
  }'
```

### 4. 获取用户的所有任务

```bash
curl -X GET "http://localhost:3000/api/users/USER_ID/tasks?limit=20&sort={\"dueDate\":1}"
```

### 5. 删除用户

```bash
curl -X DELETE http://localhost:3000/api/users/USER_ID
```

---

## 任务管理

### 1. 创建任务

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "开发新功能模块",
    "description": "实现用户权限管理功能",
    "status": "pending",
    "priority": "high",
    "dueDate": "2025-11-30T23:59:59.999Z",
    "userId": "USER_ID",
    "tags": ["开发", "后端"],
    "estimatedHours": 16
  }'
```

### 2. 更新任务状态

```bash
curl -X PUT http://localhost:3000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "actualHours": 14
  }'
```

### 3. 批量更新任务状态

```bash
curl -X PATCH http://localhost:3000/api/tasks/batch-update \
  -H "Content-Type: application/json" \
  -d '{
    "taskIds": ["TASK_ID_1", "TASK_ID_2", "TASK_ID_3"],
    "status": "in-progress"
  }'
```

### 4. 搜索任务

```bash
# 按关键词搜索
curl -X GET "http://localhost:3000/api/tasks/search?keyword=开发"

# 组合搜索
curl -X GET "http://localhost:3000/api/tasks/search?keyword=文档&status=pending&priority=high"
```

---

## 高级查询

### 1. 条件过滤 (where)

#### 查询特定状态的任务
```bash
curl -X GET 'http://localhost:3000/api/tasks?where={"status":"pending"}'
```

#### 查询高优先级或紧急任务
```bash
curl -X GET 'http://localhost:3000/api/tasks?where={"priority":{"$in":["high","urgent"]}}'
```

#### 查询即将到期的任务（7天内）
```bash
# 需要替换 DATE_7_DAYS_LATER 为实际日期
curl -X GET 'http://localhost:3000/api/tasks?where={"dueDate":{"$lte":"2025-10-24T00:00:00.000Z"},"status":{"$ne":"completed"}}'
```

#### 查询特定用户的进行中任务
```bash
curl -X GET 'http://localhost:3000/api/tasks?where={"userId":"USER_ID","status":"in-progress"}'
```

### 2. 排序 (sort)

#### 按截止日期升序
```bash
curl -X GET 'http://localhost:3000/api/tasks?sort={"dueDate":1}'
```

#### 按优先级降序，然后按创建时间降序
```bash
curl -X GET 'http://localhost:3000/api/tasks?sort={"priority":-1,"createdAt":-1}'
```

#### 按更新时间倒序
```bash
curl -X GET 'http://localhost:3000/api/tasks?sort={"updatedAt":-1}'
```

### 3. 分页 (skip & limit)

#### 第一页（每页10条）
```bash
curl -X GET 'http://localhost:3000/api/tasks?skip=0&limit=10'
```

#### 第二页
```bash
curl -X GET 'http://localhost:3000/api/tasks?skip=10&limit=10'
```

#### 第三页
```bash
curl -X GET 'http://localhost:3000/api/tasks?skip=20&limit=10'
```

### 4. 字段选择 (select)

#### 只返回标题、状态和截止日期
```bash
curl -X GET 'http://localhost:3000/api/tasks?select=["title","status","dueDate"]'
```

#### 排除描述字段
```bash
curl -X GET 'http://localhost:3000/api/tasks?select={"-description":0}'
```

### 5. 关联查询 (populate)

#### 查询任务并包含用户信息
```bash
curl -X GET 'http://localhost:3000/api/tasks?populate={"path":"userId","select":"name email role"}'
```

#### 查询用户并包含所有任务
```bash
curl -X GET 'http://localhost:3000/api/users/USER_ID?populate={"path":"tasks"}'
```

### 6. 组合查询

#### 查询进行中的高优先级任务，按截止日期排序，分页显示
```bash
curl -X GET 'http://localhost:3000/api/tasks?where={"status":"in-progress","priority":"high"}&sort={"dueDate":1}&skip=0&limit=10&populate={"path":"userId","select":"name email"}'
```

#### 查询活跃用户，按创建时间倒序，只返回基本信息
```bash
curl -X GET 'http://localhost:3000/api/users?where={"isActive":true}&sort={"createdAt":-1}&select=["name","email","role"]&limit=20'
```

#### 查询未完成的紧急任务，包含用户信息
```bash
curl -X GET 'http://localhost:3000/api/tasks?where={"priority":"urgent","status":{"$ne":"completed"}}&sort={"dueDate":1}&populate={"path":"userId"}'
```

---

## 统计接口

### 1. 用户统计

```bash
curl -X GET http://localhost:3000/api/users/stats
```

响应示例：
```json
{
  "success": true,
  "data": {
    "totalUsers": 26,
    "activeUsers": 21,
    "inactiveUsers": 5,
    "roleDistribution": [
      { "_id": "user", "count": 10 },
      { "_id": "admin", "count": 8 },
      { "_id": "manager", "count": 8 }
    ]
  }
}
```

### 2. 任务统计

```bash
curl -X GET http://localhost:3000/api/tasks/stats
```

响应示例：
```json
{
  "success": true,
  "data": {
    "totalTasks": 110,
    "statusDistribution": [
      { "_id": "pending", "count": 28 },
      { "_id": "in-progress", "count": 27 },
      { "_id": "completed", "count": 29 },
      { "_id": "cancelled", "count": 26 }
    ],
    "priorityDistribution": [
      { "_id": "low", "count": 25 },
      { "_id": "medium", "count": 30 },
      { "_id": "high", "count": 28 },
      { "_id": "urgent", "count": 27 }
    ],
    "upcomingDeadline": 15,
    "overdueTasks": 8,
    "topUsersWithMostTasks": [
      {
        "_id": "USER_ID",
        "userName": "张三",
        "userEmail": "user1@example.com",
        "taskCount": 6
      }
    ]
  }
}
```

---

## 常见场景示例

### 场景1：获取当前用户的待办任务看板

```bash
# 待处理任务
curl -X GET 'http://localhost:3000/api/tasks?where={"userId":"USER_ID","status":"pending"}&sort={"priority":-1,"dueDate":1}&limit=20'

# 进行中任务
curl -X GET 'http://localhost:3000/api/tasks?where={"userId":"USER_ID","status":"in-progress"}&sort={"dueDate":1}'

# 已完成任务（最近10个）
curl -X GET 'http://localhost:3000/api/tasks?where={"userId":"USER_ID","status":"completed"}&sort={"completedAt":-1}&limit=10'
```

### 场景2：获取项目紧急任务列表

```bash
curl -X GET 'http://localhost:3000/api/tasks?where={"priority":"urgent","status":{"$nin":["completed","cancelled"]}}&sort={"dueDate":1}&populate={"path":"userId","select":"name email"}'
```

### 场景3：获取逾期未完成任务

```bash
# 当前日期之前且未完成
curl -X GET 'http://localhost:3000/api/tasks?where={"dueDate":{"$lt":"2025-10-17T00:00:00.000Z"},"status":{"$nin":["completed","cancelled"]}}&sort={"dueDate":1}&populate={"path":"userId"}'
```

### 场景4：团队任务分配情况

```bash
# 获取任务统计（包含每个用户的任务数）
curl -X GET http://localhost:3000/api/tasks/stats
```

---

## JavaScript/Node.js 示例

使用 `axios` 或 `fetch`：

```javascript
// 使用 fetch
const getTasks = async () => {
  const response = await fetch('http://localhost:3000/api/tasks?where={"status":"pending"}&limit=10', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log(data);
};

// 创建任务
const createTask = async (taskData) => {
  const response = await fetch('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  });
  
  const data = await response.json();
  return data;
};

// 使用示例
createTask({
  title: '新任务',
  description: '任务描述',
  status: 'pending',
  priority: 'high',
  dueDate: new Date('2025-12-31'),
  userId: '用户ID',
  tags: ['开发'],
  estimatedHours: 8
});
```

---

## Python 示例

使用 `requests` 库：

```python
import requests
import json

BASE_URL = 'http://localhost:3000/api'

# 获取任务
def get_tasks(where=None, sort=None, limit=10):
    params = {'limit': limit}
    if where:
        params['where'] = json.dumps(where)
    if sort:
        params['sort'] = json.dumps(sort)
    
    response = requests.get(f'{BASE_URL}/tasks', params=params)
    return response.json()

# 创建任务
def create_task(task_data):
    response = requests.post(
        f'{BASE_URL}/tasks',
        json=task_data,
        headers={'Content-Type': 'application/json'}
    )
    return response.json()

# 使用示例
result = get_tasks(
    where={'status': 'pending', 'priority': 'high'},
    sort={'dueDate': 1},
    limit=20
)
print(result)
```

---

## 错误处理示例

```javascript
const handleApiCall = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('错误:', data.message);
      if (data.errors) {
        console.error('详细错误:', data.errors);
      }
    } else {
      console.log('成功:', data.data);
    }
  } catch (error) {
    console.error('网络错误:', error);
  }
};
```

---

## 注意事项

1. 所有日期使用 ISO 8601 格式
2. ObjectId 使用 24 位十六进制字符串
3. 查询参数需要进行 URL 编码
4. limit 最大值为 100
5. 删除操作不可撤销，请谨慎使用

