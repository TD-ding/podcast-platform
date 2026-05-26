import { jest, describe, it, expect, beforeAll } from "@jest/globals";
import supertest from "supertest";
import { getApp, registerUser, loginUser } from "./setup.js";

let request;
let userToken;
let adminToken;
let podcastId;

beforeAll(async () => {
  const app = await getApp();
  request = supertest(app);

  const adminData = await loginUser(request, "admin", "test-admin-password");
  adminToken = adminData.token;

  const userData = await registerUser(request, "podcaster", "password123");
  userToken = userData.token;
});

describe("POST /api/podcasts", () => {
  it("should reject without auth", async () => {
    const res = await request
      .post("/api/podcasts")
      .send({ title: "Test" });

    expect(res.status).toBe(401);
  });

  it("should reject without audio file", async () => {
    const res = await request
      .post("/api/podcasts")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "Test" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("音频");
  });

  it("should create a podcast with audio", async () => {
    const res = await request
      .post("/api/podcasts")
      .set("Authorization", `Bearer ${userToken}`)
      .field("title", "My First Podcast")
      .field("description", "A test podcast episode")
      .attach("audio", Buffer.from("fake audio"), "test.mp3");

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("My First Podcast");
    expect(res.body.status).toBe("pending");
    expect(res.body.audio_path).toContain("/uploads/");
    podcastId = res.body.id;
  });
});

describe("GET /api/podcasts", () => {
  it("should return paginated results", async () => {
    const res = await request.get("/api/podcasts");
    expect(res.status).toBe(200);
    expect(res.body.rows).toBeDefined();
    expect(res.body.total).toBeDefined();
    expect(res.body.page).toBeDefined();
  });

  it("should support keyword search", async () => {
    const res = await request.get("/api/podcasts?keyword=First");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/podcasts/my", () => {
  it("should reject without auth", async () => {
    const res = await request.get("/api/podcasts/my");
    expect(res.status).toBe(401);
  });

  it("should return user podcasts", async () => {
    const res = await request
      .get("/api/podcasts/my")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.rows.length).toBeGreaterThan(0);
  });
});

describe("GET /api/podcasts/:id", () => {
  it("should return podcast detail", async () => {
    const res = await request.get(`/api/podcasts/${podcastId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("My First Podcast");
  });

  it("should return 404 for nonexistent", async () => {
    const res = await request.get("/api/podcasts/99999");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/podcasts/:id/like", () => {
  it("should like a podcast", async () => {
    const res = await request
      .post(`/api/podcasts/${podcastId}/like`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(true);
  });

  it("should unlike on second call", async () => {
    const res = await request
      .post(`/api/podcasts/${podcastId}/like`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(false);
  });

  it("should reject without auth", async () => {
    const res = await request.post(`/api/podcasts/${podcastId}/like`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/podcasts/:id/favorite", () => {
  it("should favorite a podcast", async () => {
    const res = await request
      .post(`/api/podcasts/${podcastId}/favorite`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.favorited).toBe(true);
  });

  it("should unfavorite on second call", async () => {
    const res = await request
      .post(`/api/podcasts/${podcastId}/favorite`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.favorited).toBe(false);
  });
});

describe("Comments", () => {
  it("should post a comment", async () => {
    const res = await request
      .post(`/api/podcasts/${podcastId}/comments`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ content: "Great podcast!" });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe("Great podcast!");
  });

  it("should reject empty comment", async () => {
    const res = await request
      .post(`/api/podcasts/${podcastId}/comments`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ content: "" });

    expect(res.status).toBe(400);
  });

  it("should list comments", async () => {
    const res = await request.get(`/api/podcasts/${podcastId}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.rows.length).toBeGreaterThan(0);
  });
});

describe("DELETE /api/podcasts/:id", () => {
  it("should reject without auth", async () => {
    const res = await request.delete(`/api/podcasts/${podcastId}`);
    expect(res.status).toBe(401);
  });

  it("should reject non-owner non-admin", async () => {
    const { token: otherToken } = await registerUser(request, "otheruser", "password123");
    const res = await request
      .delete(`/api/podcasts/${podcastId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("should delete own podcast", async () => {
    const res = await request
      .delete(`/api/podcasts/${podcastId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
  });
});
