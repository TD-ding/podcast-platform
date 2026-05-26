import { Router } from "express";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import db from "../db/init.js";
import { authMiddleware, verifyToken } from "../middleware/auth.js";
import {
  getApprovedPodcasts, getPodcastsByUser, getPublicPodcastsByUser,
  getFavoritePodcasts, getHotPodcasts, getPodcastById,
  getUserLikedIds, getUserFavoritedIds, getComments, addComment, deleteComment,
  createNotification,
} from "../db/queries.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../../frontend/uploads");

const AUDIO_MAP = {
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
  ".m4a": "audio/mp4", ".aac": "audio/aac", ".flac": "audio/flac",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(12).toString("hex")}${ext}`);
  },
});

const audioUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(AUDIO_MAP[ext] ? null : new Error("不支持的音频格式"), !!AUDIO_MAP[ext]);
  },
});

function cleanupFile(filePath) {
  try {
    const abs = path.join(uploadsDir, path.basename(filePath));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    // best-effort
  }
}

function attachUserState(data, token) {
  if (!token) return;
  try {
    const decoded = verifyToken(token);
    const likedIds = getUserLikedIds(decoded.id);
    const favIds = getUserFavoritedIds(decoded.id);
    const rows = Array.isArray(data) ? data : data.rows;
    rows.forEach(p => {
      p.liked = likedIds.has(p.id);
      p.favorited = favIds.has(p.id);
    });
  } catch {
    // token invalid
  }
}

const router = Router();

router.post("/", authMiddleware, audioUpload.fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 },
]), (req, res, next) => {
  try {
    const audioFile = req.files?.audio?.[0];
    if (!audioFile) {
      return res.status(400).json({ error: "请上传音频文件" });
    }
    const { title, description } = req.body;
    if (!title) {
      cleanupFile(audioFile.filename);
      return res.status(400).json({ error: "标题不能为空" });
    }

    const audioPath = `/uploads/${audioFile.filename}`;
    const coverFile = req.files?.cover?.[0];
    const coverPath = coverFile ? `/uploads/${coverFile.filename}` : "";

    const result = db.prepare(
      "INSERT INTO podcasts (user_id, title, description, audio_path, cover_image) VALUES (?, ?, ?, ?, ?)"
    ).run(req.user.id, title, description || "", audioPath, coverPath);

    const podcast = getPodcastById(result.lastInsertRowid);
    if (!podcast) {
      cleanupFile(audioFile.filename);
      if (coverFile) cleanupFile(coverFile.filename);
      return res.status(500).json({ error: "发布失败" });
    }
    res.json(podcast);
  } catch (err) {
    if (req.files?.audio?.[0]) cleanupFile(req.files.audio[0].filename);
    if (req.files?.cover?.[0]) cleanupFile(req.files.cover[0].filename);
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const keyword = (req.query.keyword || "").trim();
    const data = getApprovedPodcasts({ page, limit, keyword });
    attachUserState(data, req.headers.authorization?.split(" ")[1]);
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/hot", (req, res, next) => {
  try {
    const rows = getHotPodcasts({ limit: 20 });
    attachUserState(rows, req.headers.authorization?.split(" ")[1]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/favorites", authMiddleware, (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const data = getFavoritePodcasts(req.user.id, { page, limit });
    const likedIds = getUserLikedIds(req.user.id);
    data.rows.forEach(p => { p.liked = likedIds.has(p.id); });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/my", authMiddleware, (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const data = getPodcastsByUser(req.user.id, { page, limit });
    const likedIds = getUserLikedIds(req.user.id);
    const favIds = getUserFavoritedIds(req.user.id);
    data.rows.forEach(p => { p.liked = likedIds.has(p.id); p.favorited = favIds.has(p.id); });
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/user/:userId", (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const data = getPublicPodcastsByUser(req.params.userId, { page, limit });
    attachUserState(data, req.headers.authorization?.split(" ")[1]);
    res.json(data);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const podcast = getPodcastById(req.params.id);
    if (!podcast) {
      return res.status(404).json({ error: "播客不存在" });
    }
    db.prepare("UPDATE podcasts SET plays = plays + 1 WHERE id = ?").run(req.params.id);
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const decoded = verifyToken(token);
        podcast.liked = getUserLikedIds(decoded.id).has(podcast.id);
        podcast.favorited = getUserFavoritedIds(decoded.id).has(podcast.id);
      } catch {
        // ignore
      }
    }
    res.json(podcast);
  } catch (err) { next(err); }
});

router.delete("/:id", authMiddleware, (req, res, next) => {
  try {
    const podcast = db.prepare("SELECT * FROM podcasts WHERE id = ?").get(req.params.id);
    if (!podcast) {
      return res.status(404).json({ error: "播客不存在" });
    }
    if (podcast.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "无权删除" });
    }

    const doDelete = db.transaction(() => {
      db.prepare("DELETE FROM likes WHERE podcast_id = ?").run(req.params.id);
      db.prepare("DELETE FROM comments WHERE podcast_id = ?").run(req.params.id);
      db.prepare("DELETE FROM favorites WHERE podcast_id = ?").run(req.params.id);
      db.prepare("DELETE FROM podcasts WHERE id = ?").run(req.params.id);
    });
    doDelete();

    cleanupFile(podcast.audio_path);
    if (podcast.cover_image) cleanupFile(podcast.cover_image);
    res.json({ message: "删除成功" });
  } catch (err) { next(err); }
});

// Like
router.post("/:id/like", authMiddleware, (req, res, next) => {
  try {
    const podcast = db.prepare("SELECT id, user_id, title FROM podcasts WHERE id = ?").get(req.params.id);
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
      if (podcast.user_id !== req.user.id) {
        createNotification(podcast.user_id, "like", "收到新的点赞",
          `${req.user.username} 赞了你的播客「${podcast.title}」`, `/detail.html?id=${podcast.id}`);
      }
      res.json({ liked: true });
    }
  } catch (err) { next(err); }
});

// Favorite
router.post("/:id/favorite", authMiddleware, (req, res, next) => {
  try {
    const podcast = db.prepare("SELECT id FROM podcasts WHERE id = ?").get(req.params.id);
    if (!podcast) {
      return res.status(404).json({ error: "播客不存在" });
    }

    const existing = db.prepare("SELECT id FROM favorites WHERE user_id = ? AND podcast_id = ?")
      .get(req.user.id, req.params.id);

    if (existing) {
      db.prepare("DELETE FROM favorites WHERE id = ?").run(existing.id);
      res.json({ favorited: false });
    } else {
      db.prepare("INSERT INTO favorites (user_id, podcast_id) VALUES (?, ?)").run(req.user.id, req.params.id);
      res.json({ favorited: true });
    }
  } catch (err) { next(err); }
});

// Comments
router.get("/:id/comments", (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    res.json(getComments(req.params.id, { page, limit }));
  } catch (err) { next(err); }
});

router.post("/:id/comments", authMiddleware, (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "评论内容不能为空" });
    }
    const podcast = db.prepare("SELECT id, user_id, title FROM podcasts WHERE id = ?").get(req.params.id);
    if (!podcast) {
      return res.status(404).json({ error: "播客不存在" });
    }

    const comment = addComment(req.user.id, req.params.id, content.trim());
    if (podcast.user_id !== req.user.id) {
      createNotification(podcast.user_id, "comment", "收到新评论",
        `${req.user.username} 评论了你的播客「${podcast.title}」`, `/detail.html?id=${podcast.id}`);
    }
    res.json(comment);
  } catch (err) { next(err); }
});

router.delete("/:podcastId/comments/:commentId", authMiddleware, (req, res, next) => {
  try {
    const ok = deleteComment(parseInt(req.params.commentId), req.user.id);
    if (!ok) {
      return res.status(403).json({ error: "无权删除此评论" });
    }
    res.json({ message: "删除成功" });
  } catch (err) { next(err); }
});

export { AUDIO_MAP };
export default router;
