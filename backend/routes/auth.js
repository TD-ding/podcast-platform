import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db/init.js";
import { authMiddleware, signToken } from "../middleware/auth.js";

const USERNAME_REGEX = /^[a-zA-Z0-9_一-龥]{2,20}$/;

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }
    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: "用户名只能包含中英文、数字和下划线，长度 2-20" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "密码长度至少 6 位" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (existing) {
      return res.status(409).json({ error: "用户名已存在" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashed);

    const token = signToken({ id: result.lastInsertRowid, username, role: "user" });
    res.json({ token, user: { id: result.lastInsertRowid, username, role: "user" } });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
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

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar, bio: user.bio },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authMiddleware, (req, res) => {
  const user = db.prepare("SELECT id, username, avatar, bio, role, created_at FROM users WHERE id = ?").get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "用户不存在" });
  }
  res.json(user);
});

export default router;
