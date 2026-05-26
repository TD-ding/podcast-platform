# PodWave - 播客发布平台

一个类似微博的播客发布平台，支持用户注册登录、发布播客音频、动态流互动、管理员后台管理。

## 功能特性

- **用户系统**: 注册、登录、JWT 认证、个人设置、修改密码
- **播客发布**: 上传音频文件（MP3/WAV/OGG/M4A/AAC/FLAC）+ 封面图，支持拖拽上传，带进度条
- **动态流**: 类似微博时间线，分页浏览所有已审核通过的播客
- **搜索**: 按标题关键词搜索播客
- **互动功能**: 点赞（可取消，状态持久化）、评论（可删除）、收藏/稍后听
- **分享**: 一键复制播客链接分享给朋友
- **通知系统**: 站内通知（审核结果、评论、点赞），导航栏铃铛显示未读数
- **排行榜**: 热门播客排行（按播放量+点赞数加权排序）
- **用户主页**: 点击作者查看其所有播客
- **播客详情页**: 独立页面，大播放器 + 完整评论列表
- **移动端适配**: 汉堡菜单导航
- **管理员后台**: 仪表盘统计、用户管理（封禁/解封）、内容审核（通过/拒绝 + 试听）

## 技术栈

- **后端**: Node.js + Express（REST API）
- **前端**: HTML + CSS + JavaScript（原生，无框架）
- **数据库**: SQLite（better-sqlite3）
- **文件上传**: multer（音频 + 封面图）
- **认证**: JWT（jsonwebtoken）+ bcryptjs（异步）
- **测试**: Jest + supertest（47 个测试）
- **代码质量**: ESLint v9+ flat config
- **容器化**: Docker + docker-compose
- **CI/CD**: GitHub Actions

## 项目结构

```
├── backend/
│   ├── app.js              # Express 入口（全局错误处理）
│   ├── db/
│   │   ├── init.js         # SQLite 初始化 + 表结构 + 索引
│   │   └── queries.js      # 数据库查询层（分页、搜索、事务）
│   ├── middleware/
│   │   └── auth.js         # JWT 认证 + 管理员权限 + signToken/verifyToken
│   └── routes/
│       ├── auth.js         # 注册/登录/个人信息/改密码
│       ├── podcasts.js     # 播客 CRUD + 点赞 + 评论 + 收藏 + 通知
│       ├── admin.js        # 管理员 API（统计/用户/审核）
│       └── notifications.js # 通知 API
├── frontend/
│   ├── index.html          # 首页（动态流 + 搜索）
│   ├── detail.html         # 播客详情页
│   ├── login.html          # 登录页
│   ├── register.html       # 注册页
│   ├── publish.html        # 发布播客页（音频+封面+进度条）
│   ├── my.html             # 我的播客/收藏
│   ├── user.html           # 用户主页
│   ├── settings.html       # 个人设置/改密码
│   ├── notifications.html  # 通知列表
│   ├── hot.html            # 热门排行榜
│   ├── admin/
│   │   └── index.html      # 管理员后台（试听按钮）
│   ├── css/
│   │   └── style.css       # 全局样式（含移动端适配）
│   └── js/
│       └── api.js          # 公共模块（导航、认证、上传进度条）
├── test/
│   ├── setup.js            # 测试辅助
│   ├── auth.test.js        # 认证测试 (15)
│   ├── podcasts.test.js    # 播客测试 (21)
│   └── admin.test.js       # 管理员测试 (11)
├── docs/
│   ├── frontend.md         # 前端文档
│   ├── backend.md          # 后端 API 文档
│   ├── admin-frontend.md   # 管理员面板文档
│   └── deployment.md       # 部署文档
├── Dockerfile              # Multi-stage Docker 构建
├── docker-compose.yml      # Docker 编排
├── .github/workflows/      # CI/CD 配置
├── eslint.config.js        # ESLint v9+ 配置
└── package.json
```

## 快速开始

### 本地运行

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 设置 JWT_SECRET 和 ADMIN_PASSWORD

# 启动服务
npm start

# 代码检查
npm run lint

# 运行测试
npm test
```

### Docker 运行

```bash
# 配置环境变量
cp .env.example .env

# 构建并启动
docker compose up --build

# 停止
docker compose down
```

服务默认运行在 `http://localhost:3000`

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3000 |
| JWT_SECRET | JWT 签名密钥 | 必填（缺失拒绝启动） |
| ADMIN_PASSWORD | 管理员初始密码 | 必填（缺失拒绝启动） |
| CORS_ORIGIN | 允许的前端域名 | http://localhost:3000 |
| UPLOAD_DIR | 上传文件目录 | uploads |
| DB_PATH | 数据库文件路径 | data/podcast.db |

## API 概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 用户注册 | - |
| POST | /api/auth/login | 用户登录 | - |
| GET | /api/auth/me | 当前用户信息 | ✓ |
| PUT | /api/auth/profile | 修改个人资料 | ✓ |
| PUT | /api/auth/password | 修改密码 | ✓ |
| GET | /api/podcasts | 动态流列表（分页+搜索） | - |
| POST | /api/podcasts | 发布播客（音频+封面） | ✓ |
| GET | /api/podcasts/my | 我的播客 | ✓ |
| GET | /api/podcasts/hot | 热门排行榜 | - |
| GET | /api/podcasts/:id | 播客详情 | - |
| DELETE | /api/podcasts/:id | 删除播客 | ✓ |
| POST | /api/podcasts/:id/like | 点赞/取消点赞 | ✓ |
| POST | /api/podcasts/:id/favorite | 收藏/取消收藏 | ✓ |
| GET | /api/podcasts/:id/comments | 评论列表（分页） | - |
| POST | /api/podcasts/:id/comments | 发表评论 | ✓ |
| DELETE | /api/podcasts/:podcastId/comments/:id | 删除评论 | ✓ |
| GET | /api/notifications | 通知列表 | ✓ |
| GET | /api/notifications/unread-count | 未读通知数 | ✓ |
| PUT | /api/notifications/read | 标记已读 | ✓ |
| GET | /api/admin/stats | 统计数据 | ✓ Admin |
| GET | /api/admin/users | 用户列表（分页） | ✓ Admin |
| PUT | /api/admin/users/:id/status | 修改用户状态 | ✓ Admin |
| GET | /api/admin/podcasts | 所有播客（含未审核） | ✓ Admin |
| PUT | /api/admin/podcasts/:id/status | 审核播客 | ✓ Admin |

## 开发流程

| 轮次 | 类型 | 描述 | PR | Commit |
|------|------|------|-----|--------|
| 1 | feat | 初始版本 + 审查修复 | #1 | d05cda5 → 7972858 |
| 2 | refactor | 代码质量优化 | #2 | 93cf312 |
| 3 | feat | 用户体验优化 | #3 | 191808b |
| 4 | feat | 功能增强（收藏/通知/排行） | #4 | 30058ab |
| 5 | fix | Bug修复 | #5 | 8961c8a |
| - | feat | 测试 + Docker + CI | #6 | cb4d69f |
| - | docs | 项目文档 | #7 | - |
