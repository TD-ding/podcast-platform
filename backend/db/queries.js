import db from "./init.js";

const PODCAST_SELECT = `
  SELECT p.*, u.username, u.avatar,
    (SELECT COUNT(*) FROM likes WHERE podcast_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments WHERE podcast_id = p.id) AS comment_count
  FROM podcasts p JOIN users u ON p.user_id = u.id`;

export function getApprovedPodcasts({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const rows = db.prepare(
    `${PODCAST_SELECT}
     WHERE p.status = 'approved'
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(limit, offset);
  const total = db.prepare("SELECT COUNT(*) AS count FROM podcasts WHERE status = 'approved'").get().count;
  return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getPodcastsByUser(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const rows = db.prepare(
    `${PODCAST_SELECT}
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(userId, limit, offset);
  const total = db.prepare("SELECT COUNT(*) AS count FROM podcasts WHERE user_id = ?").get(userId).count;
  return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getPodcastById(id) {
  return db.prepare(`${PODCAST_SELECT} WHERE p.id = ?`).get(id);
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
