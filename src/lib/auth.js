import crypto from 'node:crypto';
import { env } from '../config.js';

const ADMIN_COOKIE_NAME = env.ADMIN_COOKIE_NAME || 'tkb_admin_session';
const ADMIN_SESSION_SECONDS = 12 * 60 * 60;
const DEFAULT_SESSION_SECRET = 'tkb-local-admin-secret-change-me';

function compareStrings(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function getSessionSecret() {
  return (env.ADMIN_SESSION_SECRET || DEFAULT_SESSION_SECRET).trim();
}

function getAdminCredentials() {
  const username = String(env.ADMIN_USERNAME || '').trim();
  const password = String(env.ADMIN_PASSWORD || '').trim();
  return {
    username,
    password,
    configured: Boolean(username && password),
  };
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64').toString('utf8');
}

function signToken(payload) {
  return crypto.createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('hex');
}

export function createAdminSessionToken(username) {
  const issuedAt = Date.now();
  const payload = JSON.stringify({
    username,
    exp: issuedAt + (ADMIN_SESSION_SECONDS * 1000),
  });
  const encodedPayload = base64UrlEncode(payload);
  const signature = signToken(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  const expectedSignature = signToken(encodedPayload);
  if (!compareStrings(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (typeof payload?.username !== 'string' || !payload?.exp || payload.exp <= Date.now()) {
      return null;
    }
    return payload.username;
  } catch {
    return null;
  }
}

export function isAdminConfigured() {
  return getAdminCredentials().configured;
}

export function isAdminAuthenticated(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((entry) => {
      const [key, ...rest] = entry.trim().split('=');
      if (!key || !rest.length) return null;
      return [key, rest.join('=')];
    }).filter(Boolean)
  );
  const sessionToken = cookies[ADMIN_COOKIE_NAME];
  if (!sessionToken) return false;
  return Boolean(verifyAdminSessionToken(decodeURIComponent(sessionToken)));
}

function parseRedirectTarget(value) {
  const redirect = typeof value === 'string' ? value.trim() : '/import';
  return redirect.startsWith('/') ? redirect : '/import';
}

export function requireAdmin(req, res, next) {
  if (!isAdminConfigured()) {
    return res.status(503).json({
      error: 'Tài khoản admin chưa được cấu hình. Thiết lập ADMIN_USERNAME và ADMIN_PASSWORD trong biến môi trường.',
    });
  }

  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({
      error: 'Vui lòng đăng nhập để truy cập chức năng nhập dữ liệu.',
    });
  }

  return next();
}

export function renderAdminLoginPage(message) {
  const defaultMessage = typeof message === 'string' && message.trim()
    ? message
    : 'Vui lòng đăng nhập để truy cập chức năng nhập dữ liệu.';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Đăng nhập quản trị</title>
  <style>
    :root {
      --bg: #0f172a; --panel: #ffffff; --text: #0f172a; --muted: #475569; --primary: #172a3a; --primary-soft: #e2e8f0; --danger: #b91c1c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #e2e8f0, #f8fafc);
      color: var(--text);
    }
    .panel {
      width: min(92vw, 440px); background: var(--panel); border-radius: 18px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
      padding: 2rem;
    }
    h1 { margin: 0 0 0.5rem; font-size: 1.6rem; }
    p { margin: 0 0 1.2rem; color: var(--muted); line-height: 1.5; }
    .error { color: var(--danger); background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 0.8rem 1rem; margin-bottom: 1rem; }
    form { display: grid; gap: 0.9rem; }
    label { font-weight: 600; display: grid; gap: 0.35rem; }
    input {
      width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0.85rem 0.95rem; font-size: 1rem;
    }
    input:focus { outline: 2px solid rgba(23, 42, 58, 0.18); border-color: var(--primary); }
    button {
      border: none; border-radius: 10px; background: var(--primary); color: white; padding: 0.9rem 1rem; font-size: 1rem; font-weight: 700; cursor: pointer;
    }
    button:hover { filter: brightness(1.05); }
    .meta { margin-top: 1rem; font-size: 0.88rem; color: var(--muted); }
  </style>
</head>
<body>
  <main class="panel">
    <h1>Đăng nhập quản trị</h1>
    <p>Trang nhập dữ liệu chỉ dành cho quản trị viên.</p>
    ${isAdminConfigured() ? '' : '<div class="error">Tài khoản admin chưa được cấu hình. Thiết lập ADMIN_USERNAME và ADMIN_PASSWORD trong biến môi trường.</div>'}
    ${!isAdminConfigured() ? '' : `<form method="POST" action="/api/admin/login">
      <input type="hidden" name="redirectTo" value="/import" />
      <label>
        Tên đăng nhập
        <input name="username" type="text" autocomplete="username" required />
      </label>
      <label>
        Mật khẩu
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <button type="submit">Đăng nhập</button>
    </form>`}
    <p class="meta">${defaultMessage}</p>
  </main>
</body>
</html>`;
}

export function loginAdmin(req, res) {
  const { username, password, redirectTo } = req.body || {};
  const credentials = getAdminCredentials();

  if (!credentials.configured) {
    return res.status(503).json({ error: 'Tài khoản admin chưa được cấu hình.' });
  }

  const providedUsername = String(username || '').trim();
  const providedPassword = String(password || '');

  if (!providedUsername || !providedPassword) {
    return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu là bắt buộc.' });
  }

  const usernameMatches = compareStrings(providedUsername, credentials.username);
  const passwordMatches = compareStrings(providedPassword, credentials.password);

  if (!usernameMatches || !passwordMatches) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
  }

  res.cookie(ADMIN_COOKIE_NAME, createAdminSessionToken(providedUsername), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS * 1000,
  });

  return res.redirect(303, parseRedirectTarget(redirectTo));
}

export function logoutAdmin(_req, res) {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' });
  return res.redirect(303, '/import');
}
