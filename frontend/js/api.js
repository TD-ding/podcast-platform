const API_BASE = "";

async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    if (options.body) {
      options.body = JSON.stringify(options.body);
    }
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (res.status === 401) {
    clearUser();
    location.href = "/login.html";
    throw new Error("登录已过期，请重新登录");
  }
  if (!res.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

function setUser(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearUser();
      return false;
    }
  } catch {
    clearUser();
    return false;
  }
  return true;
}

function isAdmin() {
  const user = getUser();
  return user && user.role === "admin";
}

function logout() {
  clearUser();
  location.href = "/login.html";
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const d = new Date(timeStr + "Z");
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderNav(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (isLoggedIn()) {
    const user = getUser();
    const adminLink = isAdmin() ? '<a href="/admin/index.html">管理后台</a>' : '';
    el.innerHTML = `
      <a href="/publish.html">发布播客</a>
      <a href="/my.html">我的播客</a>
      ${adminLink}
      <div class="nav-user">
        <span class="nav-username">${escapeHtml(user.username)}</span>
        <button onclick="logout()" class="btn btn-sm btn-outline">退出</button>
      </div>`;
  } else {
    el.innerHTML = `
      <a href="/login.html">登录</a>
      <a href="/register.html">注册</a>`;
  }
}

function buildNavHtml() {
  return `<nav class="nav"><div class="nav-inner"><a href="/" class="nav-brand">🎙 PodWave</a><div class="nav-links" id="navLinks"></div></div></nav>`;
}
