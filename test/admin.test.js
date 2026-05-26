import { jest, describe, it, expect, beforeAll } from "@jest/globals";
import supertest from "supertest";
import { getApp, registerUser, loginUser } from "./setup.js";

let request;
let adminToken;
let userToken;
let userId;

beforeAll(async () => {
  const app = await getApp();
  request = supertest(app);

  const adminData = await loginUser(request, "admin", "test-admin-password");
  adminToken = adminData.token;

  const userData = await registerUser(request, "admintestuser", "password123");
  userToken = userData.token;
  userId = userData.user.id;
});

describe("Admin auth", () => {
  it("should reject non-admin from admin routes", async () => {
    const res = await request
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("should reject unauthenticated from admin routes", async () => {
    const res = await request.get("/api/admin/stats");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/stats", () => {
  it("should return stats for admin", async () => {
    const res = await request
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.userCount).toBeDefined();
    expect(res.body.podcastCount).toBeDefined();
    expect(res.body.pendingCount).toBeDefined();
    expect(res.body.commentCount).toBeDefined();
  });
});

describe("GET /api/admin/users", () => {
  it("should return paginated user list", async () => {
    const res = await request
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.rows).toBeDefined();
    expect(res.body.total).toBeGreaterThan(0);
  });
});

describe("PUT /api/admin/users/:id/status", () => {
  it("should ban a user", async () => {
    const res = await request
      .put(`/api/admin/users/${userId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "banned" });

    expect(res.status).toBe(200);

    const loginRes = await request
      .post("/api/auth/login")
      .send({ username: "admintestuser", password: "password123" });
    expect(loginRes.status).toBe(403);
  });

  it("should unban a user", async () => {
    const res = await request
      .put(`/api/admin/users/${userId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "active" });

    expect(res.status).toBe(200);
  });

  it("should not ban admin", async () => {
    const res = await request
      .put("/api/admin/users/1/status")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "banned" });

    expect(res.status).toBe(403);
  });

  it("should reject invalid status", async () => {
    const res = await request
      .put(`/api/admin/users/${userId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "invalid" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/podcasts", () => {
  it("should return paginated podcast list", async () => {
    const res = await request
      .get("/api/admin/podcasts")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.rows).toBeDefined();
  });
});

describe("PUT /api/admin/podcasts/:id/status", () => {
  it("should reject invalid status", async () => {
    const res = await request
      .put("/api/admin/podcasts/1/status")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "invalid" });

    expect(res.status).toBe(400);
  });
});
