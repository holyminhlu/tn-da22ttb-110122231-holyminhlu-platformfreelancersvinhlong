const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");
const {
  ACCESS_SECRET,
  REFRESH_SECRET,
  ACCESS_EXPIRY,
  REFRESH_EXPIRY,
  getClientIp,
  normalizeEmail,
  signTokens,
  verifyAccessToken,
  persistRefreshToken,
} = require("../utils/authTokens");

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function getGoogleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `http://localhost:${Number(process.env.PORT) || 5000}/api/auth/google/callback`
  );
}

function isGoogleConfigured() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return (
    clientId &&
    clientSecret &&
    clientId !== "your-google-client-id" &&
    clientSecret !== "your-google-client-secret"
  );
}

function safeNextPath(raw) {
  if (!raw || typeof raw !== "string") return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function normalizeOAuthRole(raw) {
  const role = String(raw || "").trim().toLowerCase();
  return role === "freelancer" ? "freelancer" : "client";
}

function encodeOAuthState({ next, role }) {
  return jwt.sign(
    {
      next: safeNextPath(next),
      role: normalizeOAuthRole(role),
    },
    ACCESS_SECRET,
    { expiresIn: "15m" },
  );
}

function decodeOAuthState(state) {
  if (!state) return { next: "/dashboard", role: "client" };
  try {
    const payload = jwt.verify(String(state), ACCESS_SECRET);
    return {
      next: safeNextPath(payload.next),
      role: normalizeOAuthRole(payload.role),
    };
  } catch {
    return { next: "/dashboard", role: "client" };
  }
}

function encodeUserPayload(user) {
  return Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName || null,
      avatarUrl: user.avatarUrl || null,
    }),
  ).toString("base64url");
}

function redirectGoogleError(res, message) {
  const target = new URL("/auth/google/callback", getFrontendUrl());
  target.searchParams.set("error", message);
  return res.redirect(target.toString());
}

function redirectGoogleSuccess(res, { accessToken, refreshToken, user, next }) {
  const target = new URL("/auth/google/callback", getFrontendUrl());
  target.hash = new URLSearchParams({
    accessToken,
    refreshToken,
    user: encodeUserPayload(user),
    next: safeNextPath(next),
  }).toString();
  return res.redirect(target.toString());
}

async function logLoginAttempt(client, { email, ip, success }) {
  await client.query(
    "INSERT INTO public.login_attempts (email, ip_address, success) VALUES ($1, $2, $3)",
    [email, ip || "unknown", success],
  );
}

async function exchangeGoogleCode(code, redirectUri) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Không thể đổi mã Google OAuth.");
  }
  return data;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok || !data.sub || !data.email) {
    throw new Error("Không thể lấy thông tin tài khoản Google.");
  }
  return data;
}

async function findOrCreateGoogleUser(client, profile, preferredRole, req) {
  const googleId = String(profile.sub);
  const email = normalizeEmail(profile.email);
  const fullName = String(profile.name || profile.given_name || email.split("@")[0]).trim();
  const avatarUrl = profile.picture ? String(profile.picture) : null;
  const ipAddress = getClientIp(req);

  let userResult = await client.query(
    `SELECT u.id, u.email, u.role, up.full_name, up.avatar_url
     FROM public.users u
     LEFT JOIN public.user_profiles up ON up.user_id = u.id
     WHERE u.google_id = $1 AND u.deleted_at IS NULL
     LIMIT 1`,
    [googleId],
  );

  if (userResult.rowCount === 0) {
    userResult = await client.query(
      `SELECT u.id, u.email, u.role, u.google_id, up.full_name, up.avatar_url
       FROM public.users u
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [email],
    );
  }

  if (userResult.rowCount > 0) {
    const existing = userResult.rows[0];
    if (!existing.google_id) {
      await client.query(
        `UPDATE public.users SET google_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [existing.id, googleId],
      );
    }
    if (avatarUrl && !existing.avatar_url) {
      await client.query(
        `UPDATE public.user_profiles SET avatar_url = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
        [existing.id, avatarUrl],
      );
      existing.avatar_url = avatarUrl;
    }
    await logLoginAttempt(client, { email, ip: ipAddress, success: true });
    await client.query(
      `INSERT INTO public.user_login_logs (user_id, ip_address, user_agent)
       VALUES ($1, $2::inet, $3)`,
      [existing.id, ipAddress || null, req.headers["user-agent"] || null],
    );
    return {
      id: existing.id,
      email: existing.email,
      role: existing.role,
      fullName: existing.full_name || fullName,
      avatarUrl: existing.avatar_url || avatarUrl,
    };
  }

  const role = normalizeOAuthRole(preferredRole);
  const passwordHash = await bcrypt.hash(`google-oauth:${googleId}:${crypto.randomUUID()}`, 10);

  const created = await client.query(
    `INSERT INTO public.users (email, password_hash, role, google_id, is_email_verified)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id, email, role`,
    [email, passwordHash, role, googleId],
  );
  const user = created.rows[0];

  await client.query(
    `INSERT INTO public.user_profiles (user_id, full_name, avatar_url)
     VALUES ($1, $2, $3)`,
    [user.id, fullName, avatarUrl],
  );

  if (role === "freelancer") {
    await client.query(
      `INSERT INTO public.freelancer_profiles
        (user_id, availability_status, languages)
       VALUES ($1, 'available', '[]'::jsonb)`,
      [user.id],
    );
  }

  await logLoginAttempt(client, { email, ip: ipAddress, success: true });
  await client.query(
    `INSERT INTO public.user_login_logs (user_id, ip_address, user_agent)
     VALUES ($1, $2::inet, $3)`,
    [user.id, ipAddress || null, req.headers["user-agent"] || null],
  );

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName,
    avatarUrl,
  };
}

async function register(req, res) {

  const { email, password, role, fullName, phone, bio, title, hourlyRate, experienceYears, availabilityStatus } = req.body || {};

  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (!normalizedEmail || !password || !fullName) {
    return res.status(400).json({ message: "Email, m?t kh?u v� h? t�n l� b?t bu?c." });
  }

  if (!["client", "freelancer"].includes(normalizedRole)) {
    return res.status(400).json({ message: "Vai tr� ph?i l� client ho?c freelancer." });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: "M?t kh?u t?i thi?u 8 k� t?." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existsResult = await client.query(
      `SELECT id FROM public.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
      [normalizedEmail],
    );

    if (existsResult.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Email ?� t?n t?i." });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const userResult = await client.query(
      `INSERT INTO public.users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [normalizedEmail, passwordHash, normalizedRole],
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO public.user_profiles (user_id, full_name, phone, bio)
       VALUES ($1, $2, $3, $4)`,
      [user.id, String(fullName).trim(), phone || null, bio || null],
    );

    if (normalizedRole === "freelancer") {
      await client.query(
        `INSERT INTO public.freelancer_profiles
          (user_id, title, hourly_rate, experience_years, availability_status, languages)
         VALUES ($1, $2, $3, $4, $5, '[]'::jsonb)`,
        [
          user.id,
          title || null,
          hourlyRate ? Number(hourlyRate) : null,
          experienceYears !== undefined && experienceYears !== null && experienceYears !== "" ? Number(experienceYears) : null,
          availabilityStatus || "available",
        ],
      );
    }

    const { accessToken, refreshToken } = signTokens(user);
    await persistRefreshToken(client, user.id, refreshToken, req);

    await client.query("COMMIT");

    return res.status(201).json({
      message: "??ng k� th�nh c�ng.",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: String(fullName).trim(),
      },
      tokens: {
        accessToken,
        refreshToken,
        accessExpiry: ACCESS_EXPIRY,
        refreshExpiry: REFRESH_EXPIRY,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Register failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? ??ng k� t�i kho?n l�c n�y." });
  } finally {
    client.release();
  }
}

async function login(req, res) {

  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const ipAddress = getClientIp(req);

  if (!email || !password) {
    return res.status(400).json({ message: "Email v� m?t kh?u l� b?t bu?c." });
  }

  const client = await pool.connect();

  try {
    const userResult = await client.query(
      `SELECT u.id, u.email, u.role, u.password_hash, up.full_name, up.avatar_url
       FROM public.users u
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [email],
    );

    if (userResult.rowCount === 0) {
      await logLoginAttempt(client, { email, ip: ipAddress, success: false });
      return res.status(401).json({ message: "Sai th�ng tin ??ng nh?p." });
    }

    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      await logLoginAttempt(client, { email, ip: ipAddress, success: false });
      return res.status(401).json({ message: "Sai th�ng tin ??ng nh?p." });
    }

    const { accessToken, refreshToken } = signTokens(user);

    await client.query("BEGIN");
    await persistRefreshToken(client, user.id, refreshToken, req);
    await logLoginAttempt(client, { email, ip: ipAddress, success: true });
    await client.query(
      `INSERT INTO public.user_login_logs (user_id, ip_address, user_agent)
       VALUES ($1, $2::inet, $3)`,
      [user.id, ipAddress || null, req.headers["user-agent"] || null],
    );
    await client.query("COMMIT");

    return res.json({
      message: "??ng nh?p th�nh c�ng.",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name || null,
        avatarUrl: user.avatar_url || null,
      },
      tokens: {
        accessToken,
        refreshToken,
        accessExpiry: ACCESS_EXPIRY,
        refreshExpiry: REFRESH_EXPIRY,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Login failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? ??ng nh?p l�c n�y." });
  } finally {
    client.release();
  }
}

async function refresh(req, res) {

  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (!refreshToken) {
    return res.status(400).json({ message: "Thi?u refresh token." });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch {
    return res.status(401).json({ message: "Refresh token kh�ng h?p l? ho?c ?� h?t h?n." });
  }

  const client = await pool.connect();
  try {
    const tokenResult = await client.query(
      `SELECT token
       FROM public.refresh_tokens
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW()
       LIMIT 1`,
      [payload.sub, refreshToken],
    );

    if (tokenResult.rowCount === 0) {
      return res.status(401).json({ message: "Phi�n ??ng nh?p ?� h?t h?n. Vui l�ng ??ng nh?p l?i." });
    }

    const userResult = await client.query(
      `SELECT id, email, role
       FROM public.users
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [payload.sub],
    );
    if (userResult.rowCount === 0) {
      return res.status(401).json({ message: "Ng??i d�ng kh�ng c�n hi?u l?c." });
    }

    const user = userResult.rows[0];
    const accessToken = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
      },
      ACCESS_SECRET,
      { expiresIn: ACCESS_EXPIRY },
    );

    return res.json({
      message: "L�m m?i phi�n th�nh c�ng.",
      tokens: {
        accessToken,
        refreshToken,
        accessExpiry: ACCESS_EXPIRY,
        refreshExpiry: REFRESH_EXPIRY,
      },
    });
  } catch (error) {
    console.error("Refresh failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? l�m m?i phi�n l�c n�y." });
  } finally {
    client.release();
  }
}

async function logout(req, res) {

  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (!refreshToken) {
    return res.status(400).json({ message: "Thi?u refresh token." });
  }

  const client = await pool.connect();
  try {
    await client.query(
      `DELETE FROM public.refresh_tokens
       WHERE user_id = $1 AND token = $2`,
      [payload.sub, refreshToken],
    );

    return res.json({ message: "??ng xu?t th�nh c�ng." });
  } catch (error) {
    console.error("Logout failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? ??ng xu?t l�c n�y." });
  } finally {
    client.release();
  }
}

function googleAuth(req, res) {
  if (!isGoogleConfigured()) {
    return res.status(501).json({
      message: "Google OAuth chưa được cấu hình. Cập nhật GOOGLE_CLIENT_ID/SECRET trong .env.",
    });
  }

  const redirectUri = getGoogleRedirectUri();
  const state = encodeOAuthState({
    next: req.query.next,
    role: req.query.role,
  });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

async function googleCallback(req, res) {
  if (!isGoogleConfigured()) {
    return redirectGoogleError(res, "Google OAuth chưa được cấu hình trên máy chủ.");
  }

  const oauthError = req.query.error;
  if (oauthError) {
    return redirectGoogleError(
      res,
      oauthError === "access_denied"
        ? "Bạn đã hủy đăng nhập Google."
        : "Google từ chối yêu cầu đăng nhập.",
    );
  }

  const code = String(req.query.code || "").trim();
  if (!code) {
    return redirectGoogleError(res, "Thiếu mã xác thực từ Google.");
  }

  const { next, role } = decodeOAuthState(req.query.state);
  const redirectUri = getGoogleRedirectUri();
  const client = await pool.connect();

  try {
    const tokenData = await exchangeGoogleCode(code, redirectUri);
    const profile = await fetchGoogleProfile(tokenData.access_token);

    await client.query("BEGIN");
    const user = await findOrCreateGoogleUser(client, profile, role, req);
    const { accessToken, refreshToken } = signTokens(user);
    await persistRefreshToken(client, user.id, refreshToken, req);
    await client.query("COMMIT");

    return redirectGoogleSuccess(res, {
      accessToken,
      refreshToken,
      user,
      next,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Google OAuth callback failed:", error.message);
    return redirectGoogleError(res, error.message || "Không thể đăng nhập bằng Google.");
  } finally {
    client.release();
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  googleAuth,
  googleCallback,
};
