import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "podcast.db");

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS podcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    audio_path TEXT NOT NULL,
    cover_image TEXT DEFAULT '',
    duration INTEGER DEFAULT 0,
    plays INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    podcast_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, podcast_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (podcast_id) REFERENCES podcasts(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    podcast_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, podcast_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (podcast_id) REFERENCES podcasts(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    podcast_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (podcast_id) REFERENCES podcasts(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    link TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_podcasts_user_id ON podcasts(user_id);
  CREATE INDEX IF NOT EXISTS idx_podcasts_status ON podcasts(status);
  CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts(created_at);
  CREATE INDEX IF NOT EXISTS idx_likes_podcast_id ON likes(podcast_id);
  CREATE INDEX IF NOT EXISTS idx_likes_user_podcast ON likes(user_id, podcast_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_podcast_id ON favorites(podcast_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_user_podcast ON favorites(user_id, podcast_id);
  CREATE INDEX IF NOT EXISTS idx_comments_podcast_id ON comments(podcast_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
`);

const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')").run("admin", hashed);
}

export default db;
