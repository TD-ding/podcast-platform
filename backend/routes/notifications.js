import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getNotifications, getUnreadCount, markAllRead, markRead } from "../db/queries.js";

// GET  /            — 分页通知列表
// GET  /unread-count — 未读通知数量
// PUT  /read-all    — 全部标为已读
// PUT  /:id/read    — 标记单条已读

const router = Router();

router.get("/", authMiddleware, (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    res.json(getNotifications(req.user.id, { page, limit }));
  } catch (err) { next(err); }
});

router.get("/unread-count", authMiddleware, (req, res, next) => {
  try {
    res.json({ count: getUnreadCount(req.user.id) });
  } catch (err) { next(err); }
});

router.put("/read-all", authMiddleware, (req, res, next) => {
  try {
    markAllRead(req.user.id);
    res.json({ message: "已全部标为已读" });
  } catch (err) { next(err); }
});

router.put("/:id/read", authMiddleware, (req, res, next) => {
  try {
    markRead(parseInt(req.params.id), req.user.id);
    res.json({ message: "已标为已读" });
  } catch (err) { next(err); }
});

export default router;
