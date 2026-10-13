import {
  SESSION_COOKIE, SESSION_MAX_AGE,
  USER_SESSION_COOKIE, USER_SESSION_MAX_AGE,
  APP_NAME
} from "../config.js";
import { esc, html } from "./helpers.js";
import { CSS } from "../styles.js";

export async function hmac(text, secret){
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name:"HMAC", hash:"SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(text)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2,"0"))
    .join("");
}

export async function createSession(env){
  const payload = `admin:${Date.now()}`;
  const signature = await hmac(payload, env.ADMIN_SECRET);
  return btoa(`${payload}.${signature}`);
}

export async function checkSession(request, env){
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));

  if(!match) return false;

  try{
    const decoded = atob(match[1]);
    const separator = decoded.lastIndexOf(".");
    if(separator === -1) return false;

    const payload = decoded.substring(0, separator);
    const signature = decoded.substring(separator + 1);

    const expected = await hmac(payload, env.ADMIN_SECRET);
    if(signature !== expected) return false;

    const parts = payload.split(":");
    if(parts.length !== 2 || parts[0] !== "admin") return false;

    const timestamp = Number(parts[1]);
    if(!Number.isFinite(timestamp)) return false;

    if(Date.now() - timestamp > SESSION_MAX_AGE) return false;

    return true;
  }catch{
    return false;
  }
}

export function getUserSessionToken(request){
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`${USER_SESSION_COOKIE}=([^;]+)`));
  if(!match) return null;
  return match[1];
}

export function generateUserToken(){
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2,"0"))
    .join("");
}

export async function createUserSession(env, userId){
  const token = generateUserToken();
  const expiresAt = new Date(Date.now() + USER_SESSION_MAX_AGE).toISOString();

  await env.DB.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(token, userId, expiresAt).run();

  return { token, expiresAt };
}

export async function checkUserSession(request, env){
  const token = getUserSessionToken(request);
  if(!token) return null;

  try{
    const result = await env.DB.prepare(`
      SELECT
        s.id AS session_id,
        s.token,
        s.user_id,
        s.expires_at,
        u.username,
        u.nama,
        u.role,
        u.status
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
      LIMIT 1
    `).bind(token).first();

    if(!result || result.status !== "active") return null;

    const expires = new Date(result.expires_at).getTime();
    if(!Number.isFinite(expires)) return null;

    if(Date.now() >= expires){
      await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
      return null;
    }

    return result;
  }catch{
    return null;
  }
}

export async function deleteUserSession(request, env){
  const token = getUserSessionToken(request);
  if(!token) return;

  try{
    await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
  }catch{}
}

export function userSessionCookie(token){
  return [
    `${USER_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${Math.floor(USER_SESSION_MAX_AGE / 1000)}`
  ].join("; ");
}

export function clearUserSessionCookie(){
  return [
    `${USER_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0"
  ].join("; ");
}

export async function hashUserPassword(password){
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2,"0")).join("");
}

export async function verifyUserPassword(password, passwordHash){
  const hash = await hashUserPassword(password);
  return hash === passwordHash;
}

export async function loginUser(env, username, password){
  if(!username || !password){
    return { success: false, error: "Username dan password wajib diisi." };
  }

  try{
    const user = await env.DB.prepare(`
      SELECT id, username, password_hash, nama, role, status
      FROM users
      WHERE username = ?
      LIMIT 1
    `).bind(username.trim()).first();

    if(!user){
      return { success: false, error: "Username atau password salah." };
    }

    if(user.status !== "active"){
      return { success: false, error: "Akun tidak aktif." };
    }

    const valid = await verifyUserPassword(password, user.password_hash);
    if(!valid){
      return { success: false, error: "Username atau password salah." };
    }

    const session = await createUserSession(env, user.id);
    return {
      success: true,
      user: { id: user.id, username: user.username, nama: user.nama, role: user.role },
      token: session.token,
      expiresAt: session.expiresAt
    };
  }catch{
    return { success: false, error: "Terjadi kesalahan saat login." };
  }
}

export function isUserRole(session){
  return !!(session && session.role === "user");
}

export function isAdminSession(adminSession){
  return adminSession === true;
}

export async function requireAdmin(request, env){
  const adminSession = await checkSession(request, env);
  if(!adminSession) return null;
  return { type: "admin", session: true };
}

export async function requireUser(request, env){
  const userSession = await checkUserSession(request, env);
  if(!userSession || userSession.role !== "user") return null;
  return { type: "user", session: userSession };
}

export async function requireArticleAccess(request, env){
  const adminSession = await checkSession(request, env);
  if(adminSession) return { type: "admin", session: true };

  const userSession = await checkUserSession(request, env);
  if(userSession && userSession.role === "user") return { type: "user", session: userSession };

  return null;
}

export function isAdminAccess(access){
  return !!(access && access.type === "admin");
}

export function isUserAccess(access){
  return !!(access && access.type === "user");
}

export async function requireArticleOwner(env, access, articleId){
  if(!access) return false;
  if(isAdminAccess(access)) return true;
  if(!isUserAccess(access)) return false;

  const article = await env.DB.prepare(`
    SELECT id, author_id FROM artikel WHERE id = ? LIMIT 1
  `).bind(articleId).first();

  if(!article) return false;
  return Number(article.author_id) === Number(access.session.user_id);
}

export function loginPage(error = "") {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login - ${APP_NAME}</title>
<style>${CSS}</style>
</head>
<body>
<div class="login-page">
  <div class="login-card">
    <div class="login-logo">🥑</div>
    <h1>${APP_NAME}</h1>
    <p>Administrator Panel</p>
    ${error ? `<div class="notice notice-danger">${esc(error)}</div>` : ""}
    <form method="POST" action="/login">
      <div class="form-group" style="margin-bottom:18px">
        <label>Password Admin</label>
        <input class="form-control" type="password" name="password" required autocomplete="current-password" autofocus>
      </div>
      <button class="btn btn-primary" style="width:100%" type="submit">🔐 Masuk</button>
    </form>
  </div>
</div>
</body>
</html>`;
}

export function userLoginPage(error = "") {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login User - ${APP_NAME}</title>
<style>${CSS}</style>
</head>
<body>
<div class="login-page">
  <div class="login-card">
    <div class="login-logo">🌱</div>
    <h1>${APP_NAME}</h1>
    <p>Login User</p>
    ${error ? `<div class="notice notice-danger">${esc(error)}</div>` : ""}
    <form method="POST" action="/user-login">
      <div class="form-group" style="margin-bottom:18px">
        <label>Username</label>
        <input class="form-control" type="text" name="username" required autocomplete="username" autofocus>
      </div>
      <div class="form-group" style="margin-bottom:20px">
        <label>Password</label>
        <input class="form-control" type="password" name="password" required autocomplete="current-password">
      </div>
      <button class="btn btn-primary" style="width:100%" type="submit">🔐 Masuk</button>
    </form>
    <div style="text-align:center; margin-top:18px; font-size:12px; color:var(--muted);">
      <a href="/login">Login Administrator</a>
    </div>
  </div>
</div>
</body>
</html>`;
}

export function forbiddenPage(message = "Anda tidak memiliki akses ke halaman ini.") {
  return html(
    layout(
      "Akses Ditolak",
      `
      <div class="card">
        <div class="notice notice-danger">
          <strong>403 — Akses Ditolak</strong>
          <div style="margin-top:8px">${esc(message)}</div>
        </div>
        <div class="actions">
          <a href="/" class="btn btn-secondary">🏠 Dashboard</a>
          <a href="/artikel" class="btn btn-primary">📰 Artikel</a>
        </div>
      </div>
      `,
      "",
      "admin"
    ),
    403
  );
}
