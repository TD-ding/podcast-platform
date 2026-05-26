# 前端文档

## 技术栈

- 原生 HTML5 / CSS3 / JavaScript（ES6+）
- 无框架依赖，单页应用通过内联脚本驱动
- CSS 变量统一主题色
- 响应式布局，支持移动端（768px 断点）

## 目录结构

```
frontend/
├── css/
│   └── style.css          # 全局样式（主题变量、导航、卡片、表单、表格、响应式）
├── js/
│   └── api.js             # 公共工具库（HTTP 请求、用户状态、导航渲染、播客操作）
├── uploads/               # 用户上传的音频和封面图（运行时生成）
├── index.html             # 首页 — 播客动态流 + 搜索
├── login.html             # 登录页
├── register.html          # 注册页
├── publish.html           # 发布播客页
├── detail.html            # 播客详情页（播放器 + 评论）
├── my.html                # 我的播客（已发布 + 收藏）
├── hot.html               # 热门排行榜
├── user.html              # 用户主页
├── settings.html          # 个人设置（简介 + 修改密码）
├── notifications.html     # 通知列表
└── admin/
    └── index.html         # 管理员面板
```

## 公共模块 — `js/api.js`

所有页面共享的核心工具函数，通过 `<script src="/js/api.js">` 引入。

### HTTP 请求

| 函数 | 说明 |
|------|------|
| `api(path, options)` | 封装 `fetch`，自动附加 `Authorization` 头，处理 JSON 序列化，401 时自动跳转登录 |
| `uploadWithProgress(path, formData, onProgress)` | 基于 `XMLHttpRequest` 的上传，支持进度回调（百分比） |

### 用户状态

| 函数 | 说明 |
|------|------|
| `getToken()` | 从 `localStorage` 读取 JWT token |
| `getUser()` | 从 `localStorage` 读取用户对象 |
| `setUser(token, user)` | 写入 token 和用户信息到 `localStorage` |
| `clearUser()` | 清除 `localStorage` 中的 token 和用户信息 |
| `isLoggedIn()` | 校验 token 是否存在且未过期（解析 JWT payload 的 `exp` 字段） |
| `isAdmin()` | 判断当前用户角色是否为 admin |
| `logout()` | 清除用户状态并跳转到登录页 |

### UI 渲染

| 函数 | 说明 |
|------|------|
| `renderNav(containerId)` | 根据登录状态渲染导航栏，登录用户显示首页/排行榜/发布/我的/通知/设置；未登录显示登录/注册 |
| `renderPodcastActions(p)` | 生成播客操作按钮（点赞/收藏/评论/分享） |
| `renderCoverImage(p)` | 渲染封面图 HTML |
| `renderPagination(containerId, data, loadFn)` | 渲染分页控件（上一页/页码/下一页） |
| `showLoading(containerId)` | 在指定容器显示加载动画 |
| `loadNotifBadge()` | 加载未读通知数量并显示角标 |

### 交互操作

| 函数 | 说明 |
|------|------|
| `toggleFavorite(podcastId)` | 收藏/取消收藏，更新按钮状态 |
| `sharePodcast(podcastId)` | 复制播客链接到剪贴板 |

### 工具函数

| 函数 | 说明 |
|------|------|
| `escapeHtml(str)` | XSS 防护，转义 HTML 特殊字符 |
| `formatTime(timeStr)` | 时间格式化：刚刚 / N 分钟前 / N 小时前 / 日期 |
| `getAudioType(filename)` | 根据文件扩展名返回 MIME 类型 |
| `handleRedirect()` | 从 URL 参数读取 `redirect` 跳转地址，默认返回 `/` |

## 页面详解

### 首页 (`index.html`)

- 展示所有已审核通过的播客列表
- 支持关键词搜索（搜索框 + Enter 键 / 搜索按钮）
- 分页加载，每页 10 条
- 空状态提示
- 播客卡片包含：头像、用户名、时间、标题、描述、封面图、音频播放器、操作按钮
- 音频标签 `preload="none"` 实现懒加载

### 登录页 (`login.html`)

- 用户名 + 密码表单
- 已登录用户自动跳转
- 支持 `?redirect=` 参数，登录后返回原页面
- 错误信息展示

### 注册页 (`register.html`)

- 用户名 + 密码 + 确认密码表单
- 前端校验：用户名格式（中英文/数字/下划线，2-20 字）、密码匹配
- 注册成功自动登录并跳转

### 发布页 (`publish.html`)

- 需登录，未登录跳转登录页
- 上传区域：点击或拖拽上传音频文件
- 支持上传封面图（可选）
- 音频格式限制：MP3, WAV, OGG, M4A, AAC, FLAC（最大 100MB）
- 封面格式限制：JPG, PNG, GIF, WebP（最大 10MB）
- 上传进度条
- 发布成功提示并跳转到"我的播客"

### 详情页 (`detail.html`)

- 根据 URL 参数 `?id=` 加载播客详情
- 完整播放器 + 封面图 + 描述
- 显示播放次数
- 点赞/收藏/评论/分享操作
- 评论区：加载更多（分页）、发表评论、删除评论（自己或管理员）
- 未登录用户可查看但不可评论，提示登录

### 我的播客 (`my.html`)

- 需登录
- 双标签切换："我发布的" / "我的收藏"
- "我发布的"显示审核状态（已通过/审核中/已拒绝）
- 支持删除播客

### 热门排行 (`hot.html`)

- 按综合热度排序（播放量 + 点赞数 × 10）
- 前 3 名高亮显示
- 每条播客包含播放器和操作按钮

### 用户主页 (`user.html`)

- 根据 URL 参数 `?id=` 显示用户信息
- 展示用户名、简介、注册时间
- 列出该用户所有已审核通过的播客

### 个人设置 (`settings.html`)

- 需登录
- 修改个人简介（最多 200 字）
- 修改密码（需输入当前密码 + 新密码 + 确认新密码）

### 通知页 (`notifications.html`)

- 需登录
- 显示所有通知（审核结果、评论、点赞）
- 未读通知高亮显示
- "全部已读"按钮
- 点击带链接的通知可跳转

## 数据流

```
用户操作 → 内联脚本调用 api() → fetch / XHR → 后端 API
                                                    ↓
                                              返回 JSON
                                                    ↓
                                      api() 解析响应 → 更新 DOM
```

1. 页面加载时调用 `renderNav()` 渲染导航
2. 各页面通过 `api()` 函数请求数据
3. `api()` 自动附加 `Authorization: Bearer <token>` 头
4. 后端返回 JSON 数据
5. 前端通过 `innerHTML` / `insertAdjacentHTML` 动态渲染
6. 所有用户输入通过 `escapeHtml()` 转义防止 XSS

## 事件处理模式

- **表单提交**：`addEventListener("submit", ...)`，`e.preventDefault()` 阻止默认行为
- **按钮点击**：`onclick` 属性调用全局函数
- **拖拽上传**：`dragover` / `dragleave` / `drop` 事件
- **键盘事件**：Enter 键触发搜索 / 发送评论
- **登录状态检查**：页面顶部 `if (!isLoggedIn())` 跳转

## 样式体系

CSS 变量定义在 `:root` 中：

| 变量 | 用途 | 值 |
|------|------|------|
| `--primary` | 主色调 | `#ff6b35`（橙色） |
| `--primary-hover` | 主色悬停 | `#e55a2b` |
| `--bg` | 页面背景 | `#f5f5f5` |
| `--card-bg` | 卡片背景 | `#ffffff` |
| `--danger` | 危险/错误 | `#e74c3c`（红色） |
| `--success` | 成功 | `#27ae60`（绿色） |
| `--warning` | 警告 | `#f39c12`（黄色） |

响应式断点：768px，移动端导航折叠为汉堡菜单。
