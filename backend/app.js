import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
