const jwt = require("jsonwebtoken");
const { parseExpiryToMs } = require("./time");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "24h";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

function getClientIp(req) {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string" && xForwardedFor.length > 0) {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.ip || null;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function signTokens(user) {
  const payload = { sub: user.id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
  return { accessToken, refreshToken, accessExpiry: ACCESS_EXPIRY, refreshExpiry: REFRESH_EXPIRY };
}

function getAccessTokenFromRequest(req) {
  const raw = req.headers.authorization || "";
  if (!raw.startsWith("Bearer ")) return null;
  return raw.slice("Bearer ".length).trim();
}

function verifyAccessToken(req, res) {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ message: "Thiếu access token." });
    return null;
  }
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    res.status(401).json({ message: "Access token không hợp lệ hoặc đã hết hạn." });
    return null;
  }
}

function tryVerifyAccessToken(req) {
  const token = getAccessTokenFromRequest(req);
  if (!token) return null;
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    return null;
  }
}

async function persistRefreshToken(client, userId, refreshToken, req) {
  const expiresAt = new Date(Date.now() + parseExpiryToMs(REFRESH_EXPIRY, 7 * 24 * 60 * 60 * 1000));
  const ipAddress = getClientIp(req);
  const userAgent = req.headers["user-agent"] || null;
  await client.query(
    `INSERT INTO public.refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, refreshToken, expiresAt, ipAddress, userAgent],
  );
}

module.exports = {
  ACCESS_SECRET,
  REFRESH_SECRET,
  ACCESS_EXPIRY,
  REFRESH_EXPIRY,
  getClientIp,
  normalizeEmail,
  signTokens,
  getAccessTokenFromRequest,
  verifyAccessToken,
  tryVerifyAccessToken,
  persistRefreshToken,
};
