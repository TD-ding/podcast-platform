import db from "./init.js";

const PODCAST_SELECT = `
  SELECT p.*, u.username, u.avatar,
    (SELECT COUNT(*) FROM likes WHERE podcast_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments WHERE podcast_id = p.id) AS comment_count
  FROM podcasts p JOIN users u ON p.user_id = u.id`;

export function getApprovedPodcasts({ page = 1, limit = 20, keyword = "" } = {}) {
  const offset = (page - 1) * limit;
  let where = "WHERE p.status = 'approved'";
  const params = [];
  if (keyword) {
    where += " AND p.title LIKE ?";
    params.push(`%${keyword}%`);
  }
  const rows = db.prepare(
    `${PODCAST_SELECT} ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS count FROM podcasts ${where}`).get(...params).count;
  return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getPodcastsByUser(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const rows = db.prepare(
    `${PODCAST_SELECT} WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).all(userId, limit, offset);
  const total = db.prepare("SELECT COUNT(*) AS count FROM podcasts WHERE user_id = ?").get(userId).count;
  return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getPublicPodcastsByUser(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const rows = db.prepare(
    `${PODCAST_SELECT} WHERE p.user_id = ? AND p.status = 'approved' ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).all(userId, limit, offset);
  const total = db.prepare("SELECT COUNT(*) AS count FROM podcasts WHERE user_id = ? AND status = 'approved'").get(userId).count;
  return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getFavoritePodcasts(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const rows = db.prepare(
    `${PODCAST_SELECT} JOIN favorites f ON f.podcast_id = p.id
     WHERE f.user_id = ? AND p.status = 'approved'
     ORDER BY f.created_at DESC LIMIT ? OFFSET ?`
  ).all(userId, limit, offset);
  const total = db.prepare(
    "SELECT COUNT(*) AS count FROM favorites f JOIN podcasts p ON f.podcast_id = p.id WHERE f.user_id = ? AND p.status = 'approved'"
  ).get(userId).count;
  return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getHotPodcasts({ limit = 10 } = {}) {
  return db.prepare(
    `${PODCAST_SELECT}
     WHERE p.status = 'approved'
     ORDER BY (p.plays + (SELECT COUNT(*) FROM likes WHERE podcast_id = p.id) * 10) DESC
     LIMIT ?`
  ).all(limit);
}

export function getPodcastById(id) {
  return db.prepare(`${PODCAST_SELECT} WHERE p.id = ?`).get(id);
}

export function getUserLikedIds(userId) {
  const rows = db.prepare("SELECT podcast_id FROM likes WHERE user_id = ?").all(userId);
  return new Set(rows.map(r => r.podcast_id));
}

export function getUserFavoritedIds(userId) {
  const rows = db.prepare("SELECT podcast_id FROM favorites WHERE user_id = ?").all(userId);
  return new Set(rows.map(r => r.podcast_id));
}

export function getComments(podcastId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const rows = db.prepare(
    `SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON c.user_id = u.id
     WHERE c.podcast_id = ? ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
  ).all(podcastId, limit, offset);
  const total = db.prepare("SELECT COUNT(*) AS count FROM comments WHERE podcast_id = ?").get(podcastId).count;
  return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function addComment(userId, podcastId, content) {
  const result = db.prepare(
    "INSERT INTO comments (user_id, podcast_id, content) VALUES (?, ?, ?)"
  ).run(userId, podcastId, content);
  return db.prepare(
    `SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`
  ).get(result.lastInsertRowid);
}

export function deleteComment(commentId, userId) {
  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(commentId);
  if (!comment || (comment.user_id !== userId)) return false;
  db.prepare("DELETE FROM comments WHERE id = ?").run(commentId);
  return true;
}

// Notifications
export function createNotification(userId, type, title, content, link) {
  db.prepare(
    "INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, type, title, content, link || "");
}

export function getNotifications(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const rows = db.prepare(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(userId, limit, offset);
  const total = db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?").get(userId).count;
  return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getUnreadCount(userId) {
  return db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0").get(userId).count;
}

export function markAllRead(userId) {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0").run(userId);
}

export function markRead(notificationId, userId) {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?").run(notificationId, userId);
}
