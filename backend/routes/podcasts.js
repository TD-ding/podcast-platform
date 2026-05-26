import { Router } from "express";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import db from "../db/init.js";
import { authMiddleware } from "../middleware/auth.js";
import { getApprovedPodcasts, getPodcastsByUser, getPodcastById, getComments, addComment } from "../db/queries.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../../frontend/uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = crypto.randomBytes(12).toString("hex");
    cb(null, `${safeName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("不支持的音频格式"));
    }
  },
});

const router = Router();

router.post("/", authMiddleware, upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "请上传音频文件" });
  }
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: "标题不能为空" });
  }

  const audioPath = `/uploads/${req.file.filename}`;
  const result = db.prepare(
    "INSERT INTO podcasts (user_id, title, description, audio_path) VALUES (?, ?, ?, ?)"
  ).run(req.user.id, title, description || "", audioPath);

  const podcast = getPodcastById(result.lastInsertRowid);
  res.json(podcast);
});

router.get("/", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  res.json(getApprovedPodcasts({ page, limit }));
});

router.get("/my", authMiddleware, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  res.json(getPodcastsByUser(req.user.id, { page, limit }));
});

router.get("/:id", (req, res) => {
  const podcast = getPodcastById(req.params.id);
  if (!podcast) {
    return res.status(404).json({ error: "播客不存在" });
  }
  db.prepare("UPDATE podcasts SET plays = plays + 1 WHERE id = ?").run(req.params.id);
  res.json(podcast);
});

router.delete("/:id", authMiddleware, (req, res) => {
  const podcast = db.prepare("SELECT * FROM podcasts WHERE id = ?").get(req.params.id);
  if (!podcast) {
    return res.status(404).json({ error: "播客不存在" });
  }
  if (podcast.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "无权删除" });
  }

  const audioAbsPath = path.join(uploadsDir, path.basename(podcast.audio_path));
  try {
    if (fs.existsSync(audioAbsPath)) {
      fs.unlinkSync(audioAbsPath);
    }
  } catch {
    // file cleanup best-effort
  }

  db.prepare("DELETE FROM podcasts WHERE id = ?").run(req.params.id);
  res.json({ message: "删除成功" });
});

// Like
router.post("/:id/like", authMiddleware, (req, res) => {
  const podcast = db.prepare("SELECT id FROM podcasts WHERE id = ?").get(req.params.id);
  if (!podcast) {
    return res.status(404).json({ error: "播客不存在" });
  }

  const existing = db.prepare("SELECT id FROM likes WHERE user_id = ? AND podcast_id = ?")
    .get(req.user.id, req.params.id);

  if (existing) {
    db.prepare("DELETE FROM likes WHERE id = ?").run(existing.id);
    res.json({ liked: false });
  } else {
    db.prepare("INSERT INTO likes (user_id, podcast_id) VALUES (?, ?)").run(req.user.id, req.params.id);
    res.json({ liked: true });
  }
});

router.get("/:id/like-status", authMiddleware, (req, res) => {
  const existing = db.prepare("SELECT id FROM likes WHERE user_id = ? AND podcast_id = ?")
    .get(req.user.id, req.params.id);
  res.json({ liked: !!existing });
});

// Comments
router.get("/:id/comments", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  res.json(getComments(req.params.id, { page, limit }));
});

router.post("/:id/comments", authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "评论内容不能为空" });
  }
  const podcast = db.prepare("SELECT id FROM podcasts WHERE id = ?").get(req.params.id);
  if (!podcast) {
    return res.status(404).json({ error: "播客不存在" });
  }

  const comment = addComment(req.user.id, req.params.id, content.trim());
  res.json(comment);
});

export default router;
