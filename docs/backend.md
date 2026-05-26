# 后端文档

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express 5.x
- **数据库**: SQLite 3（better-sqlite3，WAL 模式）
- **认证**: JWT（jsonwebtoken），bcryptjs 异步加密
- **文件上传**: Multer 2.x（disk storage）
- **模块系统**: ES Modules（`type: "module"`）

## 目录结构

```
backend/
├── app.js                # 入口：Express 配置、路由注册、错误处理、条件监听
├── db/
│   ├── init.js           # 数据库初始化：建表、索引、管理员账号
│   └── queries.js        # 数据查询层：所有 SQL 操作的封装
├── middleware/
│   └── auth.js           # JWT 中间件：认证、管理员校验、token 签发/验证
└── routes/
    ├── auth.js           # 认证路由：注册、登录、用户信息、密码管理
    ├── podcasts.js       # 播客路由：CRUD、点赞、收藏、评论、搜索、排行
    ├── admin.js          # 管理路由：用户管理、内容审核、统计
    └── notifications.js  # 通知路由：列表、未读数、标记已读
```

## 服务器配置

应用入口 `backend/app.js`：

- CORS 限制 `CORS_ORIGIN` 配置的域名
- 静态文件服务：`frontend/` 目录
- 上传文件服务：`/uploads` 路径
- JSON body 解析
- 全局错误处理（MulterError、通用错误）
- 导出 `app` 供测试使用，主模块入口时才启动监听

## 认证机制

### JWT 配置

- 密钥：`process.env.JWT_SECRET`
- 有效期：7 天
- Payload：`{ id, username, role }`

### 中间件

| 中间件 | 文件 | 说明 |
|--------|------|------|
| `authMiddleware` | `middleware/auth.js` | 从 `Authorization: Bearer <token>` 提取并验证 JWT，失败返回 401 |
| `adminMiddleware` | `middleware/auth.js` | 校验 `req.user.role === "admin"`，失败返回 403 |

### 密码存储

使用 `bcryptjs` 的异步 `hash()` / `compare()` 方法，salt rounds = 10。

---

## API 端点

所有 API 路径以 `/api` 为前缀。

通用响应格式：
- 成功：HTTP 2xx + JSON body
- 失败：HTTP 4xx/5xx + `{ error: "错误描述" }`

通用分页响应：
```json
{
  "rows": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### 认证 — `/api/auth`

#### `POST /api/auth/register` 注册

**请求体**：
```json
{ "username": "string", "password": "string" }
```

**校验规则**：
- 用户名：非空，匹配 `/^[a-zA-Z0-9_一-龥]{2,20}$/`
- 密码：长度 ≥ 6

**成功响应** `200`：
```json
{ "token": "jwt...", "user": { "id": 1, "username": "alice", "role": "user" } }
```

**错误码**：`400`（参数无效）、`409`（用户名已存在）

#### `POST /api/auth/login` 登录

**请求体**：
```json
{ "username": "string", "password": "string" }
```

**成功响应** `200`：
```json
{ "token": "jwt...", "user": { "id": 1, "username": "alice", "role": "user", "avatar": "", "bio": "" } }
```

**错误码**：`400`（空字段）、`401`（用户名或密码错误）、`403`（账号被封禁）

#### `GET /api/auth/me` 获取当前用户信息 🔒

**成功响应** `200`：
```json
{ "id": 1, "username": "alice", "avatar": "", "bio": "", "role": "user", "created_at": "2026-01-01 00:00:00" }
```

#### `GET /api/auth/user/:id` 获取指定用户公开信息

**成功响应** `200`：同上

**错误码**：`404`（用户不存在）

#### `PUT /api/auth/profile` 更新个人简介 🔒

**请求体**：
```json
{ "bio": "string" }
```

**校验规则**：bio ≤ 200 字

**成功响应** `200`：
```json
{ "id": 1, "username": "alice", "avatar": "", "bio": "新简介", "role": "user" }
```

#### `PUT /api/auth/password` 修改密码 🔒

**请求体**：
```json
{ "oldPassword": "string", "newPassword": "string" }
```

**校验规则**：newPassword ≥ 6 位，oldPassword 必须正确

**错误码**：`400`（参数无效）、`401`（旧密码错误）

---

### 播客 — `/api/podcasts`

#### `POST /api/podcasts` 发布播客 🔒

**Content-Type**: `multipart/form-data`

**字段**：
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `audio` | File | 是 | 音频文件（MP3/WAV/OGG/M4A/AAC/FLAC，≤100MB） |
| `cover` | File | 否 | 封面图（JPG/PNG/GIF/WebP） |
| `title` | string | 是 | 标题 |
| `description` | string | 否 | 描述 |

**成功响应** `200`：播客对象（status 为 `pending`，需审核）

**错误码**：`400`（无音频/无标题/格式不支持）

#### `GET /api/podcasts` 已审核播客列表

**查询参数**：
| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `page` | int | 1 | 页码 |
| `limit` | int | 20 | 每页条数（最大 50） |
| `keyword` | string | — | 搜索关键词（标题模糊匹配） |

**请求头**（可选）：`Authorization: Bearer <token>` — 已登录用户会附加 `liked`/`favorited` 状态

**成功响应** `200`：分页对象，rows 中每条包含 `username`、`like_count`、`comment_count`，以及已登录时的 `liked`、`favorited`

#### `GET /api/podcasts/hot` 热门排行榜

返回最多 20 条按综合热度排序的播客（热度 = plays + likes × 10）。

**成功响应** `200`：数组

#### `GET /api/podcasts/favorites` 收藏列表 🔒

**查询参数**：`page`、`limit`（同上）

**成功响应** `200`：分页对象

#### `GET /api/podcasts/my` 我的播客 🔒

返回当前用户的所有播客（包含 pending/rejected 状态）。

**查询参数**：`page`、`limit`

**成功响应** `200`：分页对象，含 `liked`/`favorited` 状态

#### `GET /api/podcasts/user/:userId` 指定用户的已审核播客

**查询参数**：`page`、`limit`

**成功响应** `200`：分页对象

#### `GET /api/podcasts/:id` 播客详情

每次访问（非爬虫 User-Agent）播放量 +1。已登录用户附加 `liked`/`favorited` 状态。

**成功响应** `200`：播客对象

**错误码**：`404`（不存在）

#### `DELETE /api/podcasts/:id` 删除播客 🔒

仅播客作者或管理员可删除。使用事务级联删除 likes、comments、favorites，并清理文件。

**成功响应** `200`：`{ "message": "删除成功" }`

**错误码**：`403`（无权限）、`404`（不存在）

#### `POST /api/podcasts/:id/like` 点赞/取消点赞 🔒

切换点赞状态。

**成功响应** `200`：
```json
{ "liked": true }
// 或
{ "liked": false }
```

**副作用**：点赞时给播客作者发送通知

#### `POST /api/podcasts/:id/favorite` 收藏/取消收藏 🔒

切换收藏状态。

**成功响应** `200`：
```json
{ "favorited": true }
// 或
{ "favorited": false }
```

#### `GET /api/podcasts/:id/comments` 评论列表

**查询参数**：`page`（默认 1）、`limit`（默认 20）

**成功响应** `200`：分页对象，每条评论含 `username`、`avatar`

#### `POST /api/podcasts/:id/comments` 发表评论 🔒

**请求体**：
```json
{ "content": "string" }
```

**成功响应** `200`：评论对象（含 `username`）

**副作用**：给播客作者发送通知

**错误码**：`400`（内容为空）、`404`（播客不存在）

#### `DELETE /api/podcasts/:podcastId/comments/:commentId` 删除评论 🔒

仅评论作者或管理员可删除。

**成功响应** `200`：`{ "message": "删除成功" }`

**错误码**：`403`（无权限）

---

### 管理 — `/api/admin`

所有管理路由需要管理员认证（`authMiddleware` + `adminMiddleware`）。

#### `GET /api/admin/stats` 平台统计

**成功响应** `200`：
```json
{ "userCount": 100, "podcastCount": 50, "pendingCount": 5, "commentCount": 200 }
```

#### `GET /api/admin/users` 用户列表

**查询参数**：`page`（默认 1）、`limit`（默认 20）

**成功响应** `200`：分页对象

#### `PUT /api/admin/users/:id/status` 修改用户状态

**请求体**：
```json
{ "status": "active" }
```

**status 可选值**：`active`、`banned`

**错误码**：`400`（无效状态）、`403`（不能修改管理员）、`404`（用户不存在）

#### `GET /api/admin/podcasts` 播客列表（含待审核）

**查询参数**：`page`、`limit`

**成功响应** `200`：分页对象

#### `PUT /api/admin/podcasts/:id/status` 审核播客

**请求体**：
```json
{ "status": "approved" }
```

**status 可选值**：`approved`、`rejected`、`pending`

**副作用**：审核通过/拒绝时给作者发送通知

---

### 通知 — `/api/notifications`

#### `GET /api/notifications` 通知列表 🔒

**查询参数**：`page`（默认 1）、`limit`（默认 20）

**成功响应** `200`：分页对象，每条含 `type`（like/comment/review）、`title`、`content`、`link`、`is_read`

#### `GET /api/notifications/unread-count` 未读数量 🔒

**成功响应** `200`：
```json
{ "count": 3 }
```

#### `PUT /api/notifications/read-all` 全部标记已读 🔒

#### `PUT /api/notifications/:id/read` 标记单条已读 🔒

---

## 数据模型

### users 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| username | TEXT UNIQUE | 用户名 |
| password | TEXT | bcrypt 哈希密码 |
| avatar | TEXT | 头像（预留） |
| bio | TEXT | 个人简介 |
| role | TEXT | 角色：`user` / `admin` |
| status | TEXT | 状态：`active` / `banned` |
| created_at | TEXT | 注册时间 |

### podcasts 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| user_id | INTEGER FK→users.id | 作者 |
| title | TEXT | 标题 |
| description | TEXT | 描述 |
| audio_path | TEXT | 音频文件路径（`/uploads/xxx.mp3`） |
| cover_image | TEXT | 封面图路径 |
| duration | INTEGER | 时长（秒） |
| plays | INTEGER | 播放次数 |
| status | TEXT | 状态：`pending` / `approved` / `rejected` |
| created_at | TEXT | 创建时间 |

### likes 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| user_id | INTEGER FK | 点赞用户 |
| podcast_id | INTEGER FK | 播客 |
| created_at | TEXT | 点赞时间 |

UNIQUE(user_id, podcast_id) — 每个用户对每条播客只能有一个点赞记录。

### favorites 表

结构与 likes 相同，用于收藏。

### comments 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| user_id | INTEGER FK | 评论者 |
| podcast_id | INTEGER FK | 播客 |
| content | TEXT | 评论内容 |
| created_at | TEXT | 评论时间 |

### notifications 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| user_id | INTEGER FK | 接收通知的用户 |
| type | TEXT | 通知类型：`like` / `comment` / `review` |
| title | TEXT | 通知标题 |
| content | TEXT | 通知内容 |
| link | TEXT | 跳转链接 |
| is_read | INTEGER | 0=未读，1=已读 |
| created_at | TEXT | 创建时间 |

### 数据库索引

```sql
idx_podcasts_user_id      ON podcasts(user_id)
idx_podcasts_status       ON podcasts(status)
idx_podcasts_created_at   ON podcasts(created_at)
idx_likes_podcast_id      ON likes(podcast_id)
idx_likes_user_podcast    ON likes(user_id, podcast_id)
idx_favorites_podcast_id  ON favorites(podcast_id)
idx_favorites_user_podcast ON favorites(user_id, podcast_id)
idx_comments_podcast_id   ON comments(podcast_id)
idx_notifications_user_id ON notifications(user_id)
idx_notifications_user_unread ON notifications(user_id, is_read)
```

## 错误处理

全局错误处理中间件（`app.js`）：

| 错误类型 | HTTP 状态 | 响应 |
|----------|-----------|------|
| MulterError (LIMIT_FILE_SIZE) | 413 | `{ error: "文件大小超过限制（最大 100MB）" }` |
| MulterError (其他) | 400 | `{ error: "上传错误: <message>" }` |
| 业务错误（带 `err.status`） | 自定义 | `{ error: "<message>" }` |
| 未知错误 | 500 | `{ error: "服务器内部错误" }` |

## 安全措施

- JWT 密钥从环境变量读取，不硬编码
- 密码使用 bcrypt 异步哈希
- 用户输入通过 `escapeHtml()` 防止 XSS
- SQL 使用参数化查询（`prepare().run()`）防止注入
- CORS 限制可信域名
- 爬虫 User-Agent 不计入播放量
- 搜索关键词中 `%` 和 `_` 被转义
