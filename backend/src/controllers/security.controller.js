const bcrypt = require("bcryptjs");
const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { parseUserAgent } = require("../utils/parseUserAgent");
const { notifyUser } = require("../utils/notificationService");

function normalizeEmail(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

async function loadUserSecurityRow(db, userId) {
  const result = await db.query(
    `SELECT
       u.id,
       u.email,
       u.google_id,
       u.password_user_set_at,
       u.recovery_email,
       u.recovery_phone,
       u.login_alerts_enabled,
       u.deactivated_at,
       u.deleted_at,
       up.phone AS profile_phone
     FROM public.users u
     LEFT JOIN public.user_profiles up ON up.user_id = u.id
     WHERE u.id = $1 AND u.deleted_at IS NULL
     LIMIT 1`,
    [userId],
  );
  return result.rows[0] || null;
}

async function verifyUserPassword(db, userId, password) {
  const result = await db.query(
    `SELECT password_hash, google_id, password_user_set_at
     FROM public.users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [userId],
  );
  if (result.rowCount === 0) return { ok: false, status: 404, message: "Không tìm thấy người dùng." };
  const row = result.rows[0];
  if (row.google_id && !row.password_user_set_at) {
    return {
      ok: false,
      status: 400,
      message: "Tài khoản Google chưa có mật khẩu VLC. Hãy tạo mật khẩu trước khi thực hiện thao tác này.",
    };
  }
  const match = await bcrypt.compare(String(password), row.password_hash);
  if (!match) {
    return { ok: false, status: 401, message: "Mật khẩu không đúng." };
  }
  return { ok: true };
}

function mapAuthSummary(row) {
  const isGoogleAccount = Boolean(row.google_id);
  const hasLocalPassword = Boolean(row.password_user_set_at);
  return {
    isGoogleAccount,
    hasLocalPassword,
    isGoogleOnly: isGoogleAccount && !hasLocalPassword,
    loginAlertsEnabled: row.login_alerts_enabled !== false,
    isDeactivated: Boolean(row.deactivated_at),
  };
}

async function getSecurityOverview(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const db = await pool.connect();
  try {
    const row = await loadUserSecurityRow(db, payload.sub);
    if (!row) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    const sessions = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM public.refresh_tokens
       WHERE user_id = $1
         AND expires_at > NOW()
         AND COALESCE(is_revoked, false) = false`,
      [payload.sub],
    );

    return res.json({
      auth: mapAuthSummary(row),
      recovery: {
        loginEmail: row.email,
        profilePhone: row.profile_phone || null,
        recoveryEmail: row.recovery_email || null,
        recoveryPhone: row.recovery_phone || null,
      },
      linkedAccounts: [
        {
          provider: "google",
          label: "Google",
          linked: Boolean(row.google_id),
          email: row.google_id ? row.email : null,
        },
      ],
      activeSessions: sessions.rows[0]?.count ?? 0,
      features: {
        totp2fa: false,
        passkey: false,
        backupCodes: false,
      },
    });
  } catch (error) {
    console.error("getSecurityOverview failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message: "Thiếu cột bảo mật. Chạy backend/sql/account_security.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải cài đặt bảo mật." });
  } finally {
    db.release();
  }
}

async function listSessions(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const currentToken = String(
    req.query.currentRefreshToken || req.headers["x-refresh-token"] || "",
  ).trim();

  const db = await pool.connect();
  try {
    const result = await db.query(
      `SELECT id, ip_address, user_agent, created_at, expires_at, token
       FROM public.refresh_tokens
       WHERE user_id = $1
         AND expires_at > NOW()
         AND COALESCE(is_revoked, false) = false
       ORDER BY created_at DESC
       LIMIT 50`,
      [payload.sub],
    );

    const items = result.rows.map((row) => {
      const parsed = parseUserAgent(row.user_agent);
      return {
        id: row.id,
        ipAddress: row.ip_address || null,
        userAgent: row.user_agent || null,
        deviceLabel: parsed.label,
        browser: parsed.browser,
        os: parsed.os,
        deviceType: parsed.device,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isCurrent: Boolean(currentToken && row.token === currentToken),
      };
    });

    return res.json({ items });
  } catch (error) {
    console.error("listSessions failed:", error.message);
    return res.status(500).json({ message: "Không thể tải phiên đăng nhập." });
  } finally {
    db.release();
  }
}

async function revokeSession(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const sessionId = req.params.sessionId;
  const currentToken = String(req.body?.currentRefreshToken || "").trim();
  const db = await pool.connect();
  try {
    const target = await db.query(
      `SELECT id, token FROM public.refresh_tokens
       WHERE id = $1 AND user_id = $2 AND COALESCE(is_revoked, false) = false
       LIMIT 1`,
      [sessionId, payload.sub],
    );
    if (target.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy phiên đăng nhập." });
    }
    if (currentToken && target.rows[0].token === currentToken) {
      return res.status(400).json({ message: "Không thể đăng xuất phiên hiện tại tại đây. Dùng Đăng xuất." });
    }

    await db.query(
      `UPDATE public.refresh_tokens
       SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [sessionId, payload.sub],
    );
    return res.json({ message: "Đã đăng xuất thiết bị." });
  } catch (error) {
    console.error("revokeSession failed:", error.message);
    return res.status(500).json({ message: "Không thể đăng xuất thiết bị." });
  } finally {
    db.release();
  }
}

async function revokeOtherSessions(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const currentToken = String(req.body?.currentRefreshToken || "").trim();
  if (!currentToken) {
    return res.status(400).json({ message: "Thiếu refresh token phiên hiện tại." });
  }

  const db = await pool.connect();
  try {
    await db.query(
      `UPDATE public.refresh_tokens
       SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND token <> $2 AND COALESCE(is_revoked, false) = false`,
      [payload.sub, currentToken],
    );
    return res.json({ message: "Đã đăng xuất tất cả thiết bị khác." });
  } catch (error) {
    console.error("revokeOtherSessions failed:", error.message);
    return res.status(500).json({ message: "Không thể đăng xuất các thiết bị khác." });
  } finally {
    db.release();
  }
}

async function listLoginHistory(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const db = await pool.connect();
  try {
    const row = await loadUserSecurityRow(db, payload.sub);
    if (!row) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    const successLogs = await db.query(
      `SELECT id, ip_address::text AS ip_address, user_agent, logged_in_at AS at, true AS success
       FROM public.user_login_logs
       WHERE user_id = $1
       ORDER BY logged_in_at DESC
       LIMIT $2`,
      [payload.sub, limit],
    );

    let failedLogs = { rows: [] };
    try {
      failedLogs = await db.query(
        `SELECT id, ip_address::text AS ip_address, NULL::text AS user_agent, attempted_at AS at, false AS success
         FROM public.login_attempts
         WHERE LOWER(email) = LOWER($1) AND success = false
         ORDER BY attempted_at DESC
         LIMIT $2`,
        [row.email, limit],
      );
    } catch {
      /* login_attempts optional */
    }

    const items = [...successLogs.rows, ...failedLogs.rows]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit)
      .map((entry) => {
        const parsed = parseUserAgent(entry.user_agent);
        return {
          id: entry.id,
          success: Boolean(entry.success),
          ipAddress: entry.ip_address || null,
          deviceLabel: parsed.label,
          at: entry.at,
        };
      });

    return res.json({ items });
  } catch (error) {
    console.error("listLoginHistory failed:", error.message);
    return res.status(500).json({ message: "Không thể tải lịch sử đăng nhập." });
  } finally {
    db.release();
  }
}

async function updateRecoverySettings(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const body = req.body || {};
  const db = await pool.connect();
  try {
    const sets = [];
    const params = [payload.sub];
    let idx = 2;

    if (body.recoveryEmail !== undefined) {
      const email = normalizeEmail(body.recoveryEmail);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Email khôi phục không hợp lệ." });
      }
      sets.push(`recovery_email = $${idx}`);
      params.push(email || null);
      idx += 1;
    }

    if (body.recoveryPhone !== undefined) {
      const phone = String(body.recoveryPhone || "").trim().slice(0, 40);
      sets.push(`recovery_phone = $${idx}`);
      params.push(phone || null);
      idx += 1;
    }

    if (body.loginAlertsEnabled !== undefined) {
      sets.push(`login_alerts_enabled = $${idx}`);
      params.push(Boolean(body.loginAlertsEnabled));
      idx += 1;
    }

    if (sets.length === 0) {
      return res.status(400).json({ message: "Không có thay đổi." });
    }

    sets.push("updated_at = CURRENT_TIMESTAMP");
    await db.query(`UPDATE public.users SET ${sets.join(", ")} WHERE id = $1`, params);

    const row = await loadUserSecurityRow(db, payload.sub);
    return res.json({
      message: "Đã cập nhật thông tin khôi phục.",
      recovery: {
        loginEmail: row.email,
        profilePhone: row.profile_phone || null,
        recoveryEmail: row.recovery_email || null,
        recoveryPhone: row.recovery_phone || null,
      },
      auth: mapAuthSummary(row),
    });
  } catch (error) {
    console.error("updateRecoverySettings failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message: "Thiếu cột bảo mật. Chạy backend/sql/account_security.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể cập nhật thông tin khôi phục." });
  } finally {
    db.release();
  }
}

async function deactivateAccount(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const password = String(req.body?.currentPassword || "");
  const confirm = String(req.body?.confirm || "");
  if (confirm !== "DEACTIVATE") {
    return res.status(400).json({ message: 'Nhập xác nhận "DEACTIVATE" để tạm khóa tài khoản.' });
  }

  const db = await pool.connect();
  try {
    const row = await loadUserSecurityRow(db, payload.sub);
    if (!row) return res.status(404).json({ message: "Không tìm thấy người dùng." });
    if (!row.google_id || row.password_user_set_at) {
      if (!password) return res.status(400).json({ message: "Vui lòng nhập mật khẩu để xác nhận." });
      const check = await verifyUserPassword(db, payload.sub, password);
      if (!check.ok) return res.status(check.status).json({ message: check.message });
    }

    await db.query("BEGIN");
    await db.query(
      `UPDATE public.users
       SET deactivated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [payload.sub],
    );
    await db.query(
      `UPDATE public.refresh_tokens
       SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND COALESCE(is_revoked, false) = false`,
      [payload.sub],
    );
    await db.query("COMMIT");

    return res.json({
      message: "Đã tạm khóa tài khoản. Liên hệ hỗ trợ để kích hoạt lại.",
      requireLogout: true,
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("deactivateAccount failed:", error.message);
    return res.status(500).json({ message: "Không thể tạm khóa tài khoản." });
  } finally {
    db.release();
  }
}

async function deleteAccount(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const password = String(req.body?.currentPassword || "");
  const confirm = String(req.body?.confirm || "");
  if (confirm !== "DELETE") {
    return res.status(400).json({ message: 'Nhập xác nhận "DELETE" để xóa tài khoản vĩnh viễn.' });
  }

  const db = await pool.connect();
  try {
    const row = await loadUserSecurityRow(db, payload.sub);
    if (!row) return res.status(404).json({ message: "Không tìm thấy người dùng." });
    if (!row.google_id || row.password_user_set_at) {
      if (!password) return res.status(400).json({ message: "Vui lòng nhập mật khẩu để xác nhận." });
      const check = await verifyUserPassword(db, payload.sub, password);
      if (!check.ok) return res.status(check.status).json({ message: check.message });
    }

    await db.query("BEGIN");
    const anonEmail = `deleted+${payload.sub}@invalid.local`;
    await db.query(
      `UPDATE public.users
       SET email = $2,
           deleted_at = CURRENT_TIMESTAMP,
           google_id = NULL,
           deactivated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [payload.sub, anonEmail],
    );
    await db.query(
      `UPDATE public.refresh_tokens
       SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [payload.sub],
    );
    await db.query("COMMIT");

    return res.json({
      message: "Đã xóa tài khoản vĩnh viễn.",
      requireLogout: true,
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("deleteAccount failed:", error.message);
    return res.status(500).json({ message: "Không thể xóa tài khoản." });
  } finally {
    db.release();
  }
}

module.exports = {
  getSecurityOverview,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  listLoginHistory,
  updateRecoverySettings,
  deactivateAccount,
  deleteAccount,
};
