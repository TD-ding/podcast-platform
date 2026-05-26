# 部署文档

## 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 18 | 推荐使用 LTS 版本 |
| npm | ≥ 9 | 随 Node.js 安装 |
| 操作系统 | Linux / macOS / Windows | 推荐 Linux（生产环境） |

无需安装数据库（SQLite 嵌入式数据库，数据存储在文件中）。

## 环境变量

复制 `.env.example` 为 `.env` 并修改：

```bash
cp .env.example .env
```

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `JWT_SECRET` | 是 | — | JWT 签名密钥，生产环境必须使用强随机字符串 |
| `ADMIN_PASSWORD` | 是 | — | 管理员账号密码，首次启动时创建 admin 用户 |
| `PORT` | 否 | `3000` | 服务监听端口 |
| `CORS_ORIGIN` | 否 | `http://localhost:3000` | 允许的前端域名（CORS） |

**生产环境建议**：
- `JWT_SECRET` 使用 32+ 字符的随机字符串（如 `openssl rand -hex 32`）
- `ADMIN_PASSWORD` 使用强密码

## 本地开发

### 安装依赖

```bash
npm install
```

### 运行

```bash
npm start
```

启动后访问 `http://localhost:3000`。

管理员登录：用户名 `admin`，密码为 `ADMIN_PASSWORD` 环境变量值。

### 运行测试

```bash
npm test
```

测试使用 Jest + supertest，共 47 个用例覆盖认证、播客 CRUD、管理功能。测试使用独立的临时数据库，不会影响开发数据。

### 代码检查

```bash
npm run lint
```

使用 ESLint v9 flat config，检查 `backend/` 和 `test/` 目录。

## Docker 部署

### 构建镜像

```bash
docker build -t podcast-platform .
```

Dockerfile 使用多阶段构建（`node:18-alpine`），以非 root 用户运行。

### docker-compose

```bash
docker-compose up -d
```

`docker-compose.yml` 配置说明：

- **端口映射**：`3000:3000`
- **环境变量**：在 `environment:` 块中显式配置（不使用 `env_file`）
- **持久化卷**：
  - `uploads` — 用户上传的音频和封面图
  - `db-data` — SQLite 数据库文件

修改 `docker-compose.yml` 中的环境变量后重新启动：

```bash
docker-compose down
docker-compose up -d
```

### 单独运行容器

```bash
docker run -d \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret-key \
  -e ADMIN_PASSWORD=your-admin-password \
  -e PORT=3000 \
  -e CORS_ORIGIN=http://your-domain.com \
  -v podcast-uploads:/app/frontend/uploads \
  -v podcast-db:/app/backend/db \
  --name podcast-platform \
  podcast-platform
```

## CI/CD

### CI — 拉取请求检查

文件：`.github/workflows/ci.yml`

触发条件：向 `master` 分支提交 Pull Request

流程：
1. `npm install` — 安装依赖
2. `npm run lint` — 代码检查
3. `npm test` — 运行测试

### CD — 持续部署

文件：`.github/workflows/cd.yml`

触发条件：向 `master` 分支推送

流程：
1. `npm install` — 安装依赖
2. `npm run lint` — 代码检查
3. `npm test` — 运行测试
4. `docker build` — 构建 Docker 镜像

## 生产部署注意事项

### 反向代理

建议在 Node.js 前面使用 Nginx 作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### HTTPS

建议使用 Let's Encrypt / Certbot 配置 SSL 证书，并将 `CORS_ORIGIN` 改为 `https://` 地址。

### 备份

SQLite 数据库文件位于 `backend/db/podcast.db`。定期备份该文件即可：

```bash
# 安全备份（使用 SQLite 自带命令）
sqlite3 backend/db/podcast.db ".backup backup.db"
```

### 文件上传

- 上传目录：`frontend/uploads/`
- 音频文件大小限制：100MB（Multer 配置 + Nginx `client_max_body_size`）
- 封面图大小限制：10MB
- 上传文件名使用随机 hex 字符串（`crypto.randomBytes(12)`），避免路径遍历

### 进程管理

推荐使用 PM2 或 systemd 管理进程：

```bash
# PM2
pm2 start backend/app.js --name podcast-platform
pm2 save
pm2 startup
```

## 项目文件结构总览

```
podcast-platform/
├── backend/           # 后端源码
│   ├── app.js         # 入口
│   ├── db/            # 数据库初始化和查询
│   ├── middleware/     # 认证中间件
│   └── routes/        # API 路由
├── frontend/          # 前端源码
│   ├── css/           # 样式
│   ├── js/            # 公共脚本
│   ├── admin/         # 管理面板
│   └── uploads/       # 用户上传文件（.gitignore）
├── test/              # Jest 测试
├── docs/              # 项目文档
├── .github/workflows/ # CI/CD
├── Dockerfile         # Docker 构建
├── docker-compose.yml # Docker Compose
├── .dockerignore
├── .env.example       # 环境变量示例
├── .gitignore
├── eslint.config.js   # ESLint 配置
└── package.json
```

## 第三方服务

本项目不依赖任何第三方云服务。所有数据存储在本地 SQLite 数据库中，文件存储在本地文件系统中。
