# PodWave - 播客发布平台

一个类似微博的播客发布平台，支持用户注册登录、发布播客音频、动态流互动（点赞/评论）、管理员后台管理。

## 功能特性

- **用户系统**: 注册、登录、JWT 认证
- **播客发布**: 上传音频文件（MP3/WAV/OGG/M4A/AAC/FLAC），支持拖拽上传
- **动态流**: 类似微博时间线，浏览所有已审核通过的播客
- **互动功能**: 点赞（可取消）、评论
- **我的播客**: 查看自己发布的播客，支持删除
- **管理员后台**: 仪表盘统计、用户管理（封禁/解封）、内容审核（通过/拒绝）

## 技术栈

- **后端**: Node.js + Express（REST API）
- **前端**: HTML + CSS + JavaScript（原生，无框架）
- **数据库**: SQLite（better-sqlite3）
- **文件上传**: multer
- **认证**: JWT（jsonwebtoken）+ bcryptjs
- **代码质量**: ESLint v9+ flat config

## 项目结构

```
├── backend/
│   ├── app.js              # Express 入口
│   ├── db/
│   │   └── init.js         # SQLite 初始化 + 表结构
│   ├── middleware/
│   │   └── auth.js         # JWT 认证 + 管理员权限中间件
│   └── routes/
│       ├── auth.js         # 注册/登录/个人信息
│       ├── podcasts.js     # 播客 CRUD + 点赞 + 评论
│       └── admin.js        # 管理员 API
├── frontend/
│   ├── index.html          # 首页（动态流）
│   ├── login.html          # 登录页
│   ├── register.html       # 注册页
│   ├── publish.html        # 发布播客页
│   ├── my.html             # 我的播客页
│   ├── admin/
│   │   └── index.html      # 管理员后台
│   ├── css/
│   │   └── style.css       # 全局样式
│   ├── js/
│   │   └── api.js          # API 工具函数
│   └── uploads/            # 音频文件上传目录
├── eslint.config.js        # ESLint 配置
└── package.json
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 代码检查
npm run lint
```

服务默认运行在 `http://localhost:3000`

## 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`

## API 概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/register | 用户注册 | - |
| POST | /api/auth/login | 用户登录 | - |
| GET | /api/auth/me | 当前用户信息 | ✓ |
| GET | /api/podcasts | 动态流列表 | - |
| POST | /api/podcasts | 发布播客 | ✓ |
| GET | /api/podcasts/my | 我的播客 | ✓ |
| GET | /api/podcasts/:id | 播客详情 | - |
| DELETE | /api/podcasts/:id | 删除播客 | ✓ |
| POST | /api/podcasts/:id/like | 点赞/取消点赞 | ✓ |
| GET | /api/podcasts/:id/comments | 评论列表 | - |
| POST | /api/podcasts/:id/comments | 发表评论 | ✓ |
| GET | /api/admin/stats | 统计数据 | ✓ Admin |
| GET | /api/admin/users | 用户列表 | ✓ Admin |
| PUT | /api/admin/users/:id/status | 修改用户状态 | ✓ Admin |
| GET | /api/admin/podcasts | 所有播客（含未审核） | ✓ Admin |
| PUT | /api/admin/podcasts/:id/status | 审核播客 | ✓ Admin |
