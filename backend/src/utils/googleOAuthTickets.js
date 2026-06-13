const crypto = require("crypto");

/** Phiên OAuth một lần — tránh nhét JWT vào header Location (ERR_RESPONSE_HEADERS_TOO_BIG). */
const tickets = new Map();
const TTL_MS = 5 * 60 * 1000;

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of tickets) {
    if (entry.expiresAt <= now) tickets.delete(key);
  }
}

function createGoogleOAuthTicket(payload) {
  pruneExpired();
  const ticket = crypto.randomBytes(24).toString("base64url");
  tickets.set(ticket, { ...payload, expiresAt: Date.now() + TTL_MS });
  return ticket;
}

function consumeGoogleOAuthTicket(ticket) {
  pruneExpired();
  const key = String(ticket || "").trim();
  if (!key) return null;
  const entry = tickets.get(key);
  tickets.delete(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  const { accessToken, refreshToken, user, next } = entry;
  return { accessToken, refreshToken, user, next };
}

module.exports = { createGoogleOAuthTicket, consumeGoogleOAuthTicket };
