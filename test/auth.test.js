import { jest, describe, it, expect, beforeAll, beforeEach, afterEach } from "@jest/globals";
import supertest from "supertest";
import { getApp, cleanDatabase, registerUser, loginUser } from "./setup.js";

let request;

beforeAll(async () => {
  const app = await getApp();
  request = supertest(app);
});

describe("POST /api/auth/register", () => {
  it("should register a new user", async () => {
    const res = await request
      .post("/api/auth/register")
      .send({ username: "newuser", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("newuser");
    expect(res.body.user.role).toBe("user");
  });

  it("should reject empty username", async () => {
    const res = await request
      .post("/api/auth/register")
      .send({ username: "", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("should reject short password", async () => {
    const res = await request
      .post("/api/auth/register")
      .send({ username: "user2", password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("6");
  });

  it("should reject invalid username characters", async () => {
    const res = await request
      .post("/api/auth/register")
      .send({ username: "bad user!", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("用户名");
  });

  it("should reject duplicate username", async () => {
    await registerUser(request, "dupuser", "password123");
    const res = await request
      .post("/api/auth/register")
      .send({ username: "dupuser", password: "password123" });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await registerUser(request, "loginuser", "password123");
  });

  it("should login with correct credentials", async () => {
    const data = await loginUser(request, "loginuser", "password123");
    expect(data.token).toBeDefined();
    expect(data.user.username).toBe("loginuser");
  });

  it("should reject wrong password", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ username: "loginuser", password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("should reject nonexistent user", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ username: "nonexistent", password: "password123" });

    expect(res.status).toBe(401);
  });

  it("should reject empty fields", async () => {
    const res = await request
      .post("/api/auth/login")
      .send({ username: "", password: "" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("should return user info with valid token", async () => {
    const { token } = await registerUser(request, "meuser", "password123");
    const res = await request
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("meuser");
  });

  it("should reject request without token", async () => {
    const res = await request.get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("should reject invalid token", async () => {
    const res = await request
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.status).toBe(401);
  });
});

describe("PUT /api/auth/profile", () => {
  it("should update bio", async () => {
    const { token } = await registerUser(request, "biouser", "password123");
    const res = await request
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ bio: "Hello world" });

    expect(res.status).toBe(200);
    expect(res.body.bio).toBe("Hello world");
  });

  it("should reject without auth", async () => {
    const res = await request
      .put("/api/auth/profile")
      .send({ bio: "test" });

    expect(res.status).toBe(401);
  });
});

describe("PUT /api/auth/password", () => {
  it("should change password", async () => {
    await registerUser(request, "pwduser", "oldpassword");
    const { token } = await loginUser(request, "pwduser", "oldpassword");
    const res = await request
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ oldPassword: "oldpassword", newPassword: "newpassword123" });

    expect(res.status).toBe(200);

    const loginRes = await request
      .post("/api/auth/login")
      .send({ username: "pwduser", password: "newpassword123" });
    expect(loginRes.status).toBe(200);
  });

  it("should reject wrong old password", async () => {
    await registerUser(request, "pwduser2", "password123");
    const { token } = await loginUser(request, "pwduser2", "password123");
    const res = await request
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ oldPassword: "wrong", newPassword: "newpassword123" });

    expect(res.status).toBe(401);
  });

  it("should reject short new password", async () => {
    await registerUser(request, "pwduser3", "password123");
    const { token } = await loginUser(request, "pwduser3", "password123");
    const res = await request
      .put("/api/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ oldPassword: "password123", newPassword: "12" });

    expect(res.status).toBe(400);
  });
});
