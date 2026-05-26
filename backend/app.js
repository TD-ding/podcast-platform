import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const requiredEnv = ["JWT_SECRET", "ADMIN_PASSWORD"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}. Check .env file.`);
    process.exit(1);
  }
}

import "./db/init.js";
import authRoutes from "./routes/auth.js";
import podcastRoutes from "./routes/podcasts.js";
import adminRoutes from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));
app.use("/uploads", express.static(path.join(frontendPath, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/podcasts", podcastRoutes);
app.use("/api/admin", adminRoutes);

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

// Ensure uploads directory exists
const uploadsDir = path.join(frontendPath, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
