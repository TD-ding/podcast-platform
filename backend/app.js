import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

import "./db/init.js";
import authRoutes from "./routes/auth.js";
import podcastRoutes from "./routes/podcasts.js";
import adminRoutes from "./routes/admin.js";
import notificationRoutes from "./routes/notifications.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));
app.use("/uploads", express.static(path.join(frontendPath, "uploads")));

// Auth: register, login, profile, password
app.use("/api/auth", authRoutes);

// Podcasts: CRUD, like, favorite, comments, search, hot
app.use("/api/podcasts", podcastRoutes);

// Admin: user management, content review, stats
app.use("/api/admin", adminRoutes);

// Notifications: list, unread count, mark read
app.use("/api/notifications", notificationRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(`[Error] ${err.message}`);

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "文件大小超过限制（最大 100MB）" });
    }
    return res.status(400).json({ error: `上传错误: ${err.message}` });
  }

  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? "服务器内部错误" : err.message });
});

const uploadsDir = path.join(frontendPath, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export default app;

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  const requiredEnv = ["JWT_SECRET", "ADMIN_PASSWORD"];
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      console.error(`Missing required env var: ${key}. Check .env file.`);
      process.exit(1);
    }
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
