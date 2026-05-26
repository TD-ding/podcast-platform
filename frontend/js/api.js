const API_BASE = "";

const AUDIO_TYPES = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
};

const USERNAME_REGEX = /^[a-zA-Z0-9_一-龥]{2,20}$/;

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
    alert("登录已过期，请重新登录");
    location.href = "/login.html?redirect=" + encodeURIComponent(location.pathname + location.search);
    throw new Error("登录已过期");
  }
  if (!res.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

function uploadWithProgress(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_BASE + path);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error || "上传失败"));
        }
      } catch {
        reject(new Error("上传失败"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("网络错误")));
    xhr.send(formData);
  });
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

function getAudioType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  return AUDIO_TYPES["." + ext] || "audio/mpeg";
}

function renderNav(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (isLoggedIn()) {
    const user = getUser();
    const adminLink = isAdmin() ? '<a href="/admin/index.html">管理后台</a>' : '';
    el.innerHTML = `
      <a href="/">首页</a>
      <a href="/hot.html">排行榜</a>
      <a href="/publish.html">发布</a>
      <a href="/my.html">我的</a>
      ${adminLink}
      <a href="/notifications.html" id="nav-notif-link" style="position:relative;">🔔<span id="nav-notif-badge" style="display:none;position:absolute;top:-6px;right:-8px;background:var(--danger);color:white;font-size:10px;border-radius:8px;padding:0 5px;min-width:16px;text-align:center;line-height:16px;"></span></a>
      <a href="/settings.html">设置</a>
      <div class="nav-user">
        <a href="/user.html?id=${user.id}" style="font-weight:600;font-size:14px;color:var(--primary);">${escapeHtml(user.username)}</a>
        <button onclick="logout()" class="btn btn-sm btn-outline">退出</button>
      </div>`;
    loadNotifBadge();
  } else {
    el.innerHTML = `
      <a href="/login.html">登录</a>
      <a href="/register.html">注册</a>`;
  }

  const nav = el.closest(".nav");
  const brand = nav.querySelector(".nav-brand");
  if (brand && !nav.querySelector(".nav-toggle")) {
    const btn = document.createElement("button");
    btn.className = "nav-toggle";
    btn.textContent = "☰";
    btn.onclick = () => el.classList.toggle("open");
    brand.insertAdjacentElement("afterend", btn);
  }
}

async function loadNotifBadge() {
  try {
    const data = await api("/api/notifications/unread-count");
    const badge = document.getElementById("nav-notif-badge");
    if (badge && data.count > 0) {
      badge.textContent = data.count > 99 ? "99+" : data.count;
      badge.style.display = "inline-block";
    }
  } catch (_e) { /* ignore */ }
}

function renderPodcastActions(p) {
  const likedClass = p.liked ? "liked" : "";
  const likedSymbol = p.liked ? "♥" : "♡";
  const favSymbol = p.favorited ? "★" : "☆";
  const favClass = p.favorited ? "favorited" : "";
  return `
    <button class="podcast-action ${likedClass}" id="like-btn-${p.id}" onclick="toggleLike(${p.id})">
      ${likedSymbol} <span id="like-count-${p.id}">${p.like_count || 0}</span>
    </button>
    <button class="podcast-action ${favClass}" id="fav-btn-${p.id}" onclick="toggleFavorite(${p.id})">
      ${favSymbol} <span id="fav-count-${p.id}" style="display:none;"></span>
    </button>
    <a href="/detail.html?id=${p.id}" class="podcast-action" style="text-decoration:none;">
      💬 <span>${p.comment_count || 0}</span>
    </a>
    <button class="podcast-action" onclick="sharePodcast(${p.id})">🔗 分享</button>`;
}

function renderCoverImage(p) {
  if (p.cover_image) {
    return `<img src="${p.cover_image}" alt="封面" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:12px;">`;
  }
  return "";
}

async function toggleFavorite(podcastId) {
  if (!isLoggedIn()) { location.href = "/login.html?redirect=" + encodeURIComponent(location.pathname + location.search); return; }
  try {
    const result = await api(`/api/podcasts/${podcastId}/favorite`, { method: "POST" });
    const btn = document.getElementById(`fav-btn-${podcastId}`);
    btn.classList.toggle("favorited", result.favorited);
    btn.childNodes[0].textContent = result.favorited ? "★ " : "☆ ";
  } catch (_e) { /* ignore */ }
}

function sharePodcast(podcastId) {
  const url = `${location.origin}/detail.html?id=${podcastId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert("链接已复制到剪贴板"));
  } else {
    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    alert("链接已复制到剪贴板");
  }
}

function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><div class="loading-spinner"></div><p style="margin-top:12px;color:var(--text-secondary);">加载中...</p></div>';
}

function renderPagination(containerId, data, loadFn) {
  const el = document.getElementById(containerId);
  if (!el || data.totalPages <= 1) { if (el) el.innerHTML = ""; return; }
  let html = "";
  if (data.page > 1) html += `<button class="btn btn-outline btn-sm" onclick="${loadFn}(${data.page - 1})">上一页</button> `;
  html += `<span style="margin:0 12px;font-size:14px;color:var(--text-secondary);">${data.page} / ${data.totalPages}</span>`;
  if (data.page < data.totalPages) html += `<button class="btn btn-outline btn-sm" onclick="${loadFn}(${data.page + 1})">下一页</button>`;
  el.innerHTML = html;
}

function handleRedirect() {
  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");
  if (redirect) return redirect;
  return "/";
}
