import { Router } from "express";
import db from "../db/init.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get("/users", (_req, res) => {
  const users = db.prepare(
    "SELECT id, username, avatar, bio, role, status, created_at FROM users ORDER BY created_at DESC"
  ).all();
  res.json(users);
});

router.put("/users/:id/status", (req, res) => {
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
});

router.get("/podcasts", (_req, res) => {
  const podcasts = db.prepare(
    `SELECT p.*, u.username FROM podcasts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC`
  ).all();
  res.json(podcasts);
});

router.put("/podcasts/:id/status", (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "无效的状态" });
  }
  const podcast = db.prepare("SELECT * FROM podcasts WHERE id = ?").get(req.params.id);
  if (!podcast) {
    return res.status(404).json({ error: "播客不存在" });
  }
  db.prepare("UPDATE podcasts SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ message: "更新成功" });
});

router.get("/stats", (_req, res) => {
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const podcastCount = db.prepare("SELECT COUNT(*) AS count FROM podcasts").get().count;
  const pendingCount = db.prepare("SELECT COUNT(*) AS count FROM podcasts WHERE status = 'pending'").get().count;
  const commentCount = db.prepare("SELECT COUNT(*) AS count FROM comments").get().count;
  res.json({ userCount, podcastCount, pendingCount, commentCount });
});

export default router;
