import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db/init.js";
import { authMiddleware, SECRET } from "../middleware/auth.js";

const router = Router();

router.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "用户名和密码不能为空" });
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: "用户名长度应在 2-20 之间" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "密码长度至少 6 位" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return res.status(409).json({ error: "用户名已存在" });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashed);

  const token = jwt.sign({ id: result.lastInsertRowid, username, role: "user" }, SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: result.lastInsertRowid, username, role: "user" } });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "用户名和密码不能为空" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) {
    return res.status(401).json({ error: "用户名或密码错误" });
  }
  if (user.status === "banned") {
    return res.status(403).json({ error: "账号已被封禁" });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "用户名或密码错误" });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar, bio: user.bio } });
});

router.get("/me", authMiddleware, (req, res) => {
  const user = db.prepare("SELECT id, username, avatar, bio, role, created_at FROM users WHERE id = ?").get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "用户不存在" });
  }
  res.json(user);
});

export default router;
