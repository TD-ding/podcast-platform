import { Router } from "express";
import db from "../db/init.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { createNotification } from "../db/queries.js";

// GET  /users/:id/status — 修改用户状态（封禁/解封）
// GET  /users            — 分页用户列表
// PUT  /users/:id/status — 修改用户状态（封禁/解封）
// GET  /podcasts         — 分页播客列表（含待审核）
// PUT  /podcasts/:id/status — 审核播客（通过/拒绝）
// GET  /stats            — 平台统计数据

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get("/users", (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const rows = db.prepare(
      "SELECT id, username, avatar, bio, role, status, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).all(limit, offset);
    const total = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
    res.json({ rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.put("/users/:id/status", (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["active", "banned"].includes(status)) {
      return res.status(400).json({ error: "无效的状态" });
    }
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }
    if (user.role === "admin") {
      return res.status(403).json({ error: "不能修改管理员状态" });
    }
    db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ message: "更新成功" });
  } catch (err) { next(err); }
});

router.get("/podcasts", (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const rows = db.prepare(
      `SELECT p.*, u.username FROM podcasts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    ).all(limit, offset);
    const total = db.prepare("SELECT COUNT(*) AS count FROM podcasts").get().count;
    res.json({ rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.put("/podcasts/:id/status", (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "无效的状态" });
    }
    const podcast = db.prepare("SELECT * FROM podcasts WHERE id = ?").get(req.params.id);
    if (!podcast) {
      return res.status(404).json({ error: "播客不存在" });
    }
    db.prepare("UPDATE podcasts SET status = ? WHERE id = ?").run(status, req.params.id);

    if (status === "approved") {
      createNotification(podcast.user_id, "review", "播客审核通过",
        `你的播客「${podcast.title}」已通过审核`, `/detail.html?id=${podcast.id}`);
    } else if (status === "rejected") {
      createNotification(podcast.user_id, "review", "播客审核未通过",
        `你的播客「${podcast.title}」未通过审核`, `/my.html`);
    }

    res.json({ message: "更新成功" });
  } catch (err) { next(err); }
});

router.get("/stats", (_req, res, next) => {
  try {
    const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
    const podcastCount = db.prepare("SELECT COUNT(*) AS count FROM podcasts").get().count;
    const pendingCount = db.prepare("SELECT COUNT(*) AS count FROM podcasts WHERE status = 'pending'").get().count;
    const commentCount = db.prepare("SELECT COUNT(*) AS count FROM comments").get().count;
    res.json({ userCount, podcastCount, pendingCount, commentCount });
  } catch (err) { next(err); }
});

export default router;
