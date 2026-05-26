import { jest } from "@jest/globals";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.JWT_SECRET = "test-secret-key";
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.PORT = "0";

const dbPath = path.join(__dirname, "../backend/db/podcast.db");

export async function cleanDatabase() {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const walPath = dbPath.replace(".db", ".db-wal");
  const shmPath = dbPath.replace(".db", ".db-shm");
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
}

let _app = null;

export async function getApp() {
  if (!_app) {
    await cleanDatabase();
    const mod = await import("../backend/app.js");
    _app = mod.default;
  }
  return _app;
}

export async function registerUser(request, username = "testuser", password = "test123456") {
  const res = await request
    .post("/api/auth/register")
    .send({ username, password });
  return res.body;
}

export async function loginUser(request, username = "testuser", password = "test123456") {
  const res = await request
    .post("/api/auth/login")
    .send({ username, password });
  return res.body;
}

export async function createPodcast(request, token, title = "Test Podcast") {
  const res = await request
    .post("/api/podcasts")
    .set("Authorization", `Bearer ${token}`)
    .send({ title, description: "A test podcast" });
  return res.body;
}
