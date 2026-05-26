const bcrypt = require("bcryptjs");
async function logLoginAttempt(client, { email, ip, success }) {
  await client.query(
    "INSERT INTO public.login_attempts (email, ip_address, success) VALUES ($1, $2, $3)",
    [email, ip || "unknown", success],
  );
}

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

  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === "your-google-client-id") {
    return res.status(501).json({
      message: "Google OAuth ch?a ???c c?u h�nh. C?p nh?t GOOGLE_CLIENT_ID/SECRET trong .env.",
    });
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

function googleCallback(req, res) {

  return res.status(501).json({
    message: "Callback Google OAuth ?ang ? ch? ?? placeholder. C?n tri?n khai trao ??i code l?y token.",
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  googleAuth,
  googleCallback,
};
