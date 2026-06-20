const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const {
  DEFAULT_NOTIFICATION_PREFS,
  normalizeNotificationPrefs,
  getUserNotificationPrefs,
} = require("../utils/notificationPreferences");

async function getNotificationPreferences(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const db = await pool.connect();
  try {
    const result = await db.query(
      `SELECT notification_prefs
       FROM public.users
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [payload.sub],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    return res.json({
      preferences: normalizeNotificationPrefs(result.rows[0].notification_prefs),
    });
  } catch (error) {
    if (/notification_prefs/.test(String(error.message))) {
      return res.json({ preferences: { ...DEFAULT_NOTIFICATION_PREFS } });
    }
    console.error("getNotificationPreferences failed:", error.message);
    return res.status(500).json({ message: "Không thể tải cài đặt thông báo." });
  } finally {
    db.release();
  }
}

async function updateNotificationPreferences(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const body = req.body && typeof req.body === "object" ? req.body : {};

  const db = await pool.connect();
  try {
    const existing = await getUserNotificationPrefs(db, payload.sub);
    const merged = normalizeNotificationPrefs({ ...existing, ...body });
    const prefsJson = JSON.stringify(merged);

    const result = await db.query(
      `UPDATE public.users
       SET notification_prefs = $2::jsonb,
           updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING notification_prefs`,
      [payload.sub, prefsJson],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    return res.json({
      message: "Đã lưu cài đặt thông báo.",
      preferences: normalizeNotificationPrefs(result.rows[0].notification_prefs),
    });
  } catch (error) {
    if (/notification_prefs/.test(String(error.message))) {
      return res.status(503).json({
        message:
          "Chưa cấu hình cột notification_prefs. Chạy backend/sql/notification_preferences.sql trên PostgreSQL.",
      });
    }
    console.error("updateNotificationPreferences failed:", error.message);
    return res.status(500).json({ message: "Không thể lưu cài đặt thông báo." });
  } finally {
    db.release();
  }
}

module.exports = {
  getNotificationPreferences,
  updateNotificationPreferences,
};
