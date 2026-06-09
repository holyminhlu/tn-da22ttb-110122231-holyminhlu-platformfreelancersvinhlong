const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { parseUuidParam } = require("../utils/validators");
const { mapNotificationRow } = require("../utils/notificationService");

const VALID_CATEGORIES = new Set(["quote", "order", "message", "review", "system", "all"]);
const VALID_READ_FILTERS = new Set(["all", "unread", "read"]);

async function listNotifications(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const q = String(req.query.q || "").trim();
  const category = String(req.query.category || "all").toLowerCase();
  const readFilter = String(req.query.read || "all").toLowerCase();
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ message: "category không hợp lệ." });
  }
  if (!VALID_READ_FILTERS.has(readFilter)) {
    return res.status(400).json({ message: "read không hợp lệ." });
  }

  const conditions = ["user_id = $1", "deleted_at IS NULL"];
  const params = [payload.sub];
  let paramIdx = 2;

  if (category !== "all") {
    conditions.push(`category = $${paramIdx}`);
    params.push(category);
    paramIdx += 1;
  }

  if (readFilter === "unread") {
    conditions.push("read_at IS NULL");
  } else if (readFilter === "read") {
    conditions.push("read_at IS NOT NULL");
  }

  if (q) {
    conditions.push(`(title ILIKE $${paramIdx} OR body ILIKE $${paramIdx})`);
    params.push(`%${q}%`);
    paramIdx += 1;
  }

  const where = conditions.join(" AND ");

  try {
    const db = await pool.connect();
    try {
      const countResult = await db.query(
        `SELECT COUNT(*)::int AS total FROM public.notifications WHERE ${where}`,
        params,
      );

      const listResult = await db.query(
        `SELECT * FROM public.notifications
         WHERE ${where}
         ORDER BY created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset],
      );

      return res.json({
        notifications: listResult.rows.map(mapNotificationRow),
        total: countResult.rows[0]?.total || 0,
        limit,
        offset,
      });
    } finally {
      db.release();
    }
  } catch (error) {
    console.error("listNotifications failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng notifications. Chạy backend/sql/notifications.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải thông báo." });
  }
}

async function getUnreadCount(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM public.notifications
       WHERE user_id = $1 AND deleted_at IS NULL AND read_at IS NULL`,
      [payload.sub],
    );
    return res.json({ count: result.rows[0]?.count || 0 });
  } catch (error) {
    console.error("getUnreadCount failed:", error.message);
    if (error.code === "42P01") {
      return res.json({ count: 0 });
    }
    return res.status(500).json({ message: "Không thể đếm thông báo chưa đọc." });
  }
}

async function markNotificationRead(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const notificationId = parseUuidParam(req.params.notificationId);
  if (!notificationId) {
    return res.status(400).json({ message: "Mã thông báo không hợp lệ." });
  }

  try {
    const result = await pool.query(
      `UPDATE public.notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [notificationId, payload.sub],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy thông báo." });
    }

    return res.json({ notification: mapNotificationRow(result.rows[0]) });
  } catch (error) {
    console.error("markNotificationRead failed:", error.message);
    return res.status(500).json({ message: "Không thể đánh dấu đã đọc." });
  }
}

async function markAllRead(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  try {
    const result = await pool.query(
      `UPDATE public.notifications
       SET read_at = NOW()
       WHERE user_id = $1 AND deleted_at IS NULL AND read_at IS NULL
       RETURNING id`,
      [payload.sub],
    );
    return res.json({ message: "Đã đánh dấu tất cả là đã đọc.", count: result.rowCount });
  } catch (error) {
    console.error("markAllRead failed:", error.message);
    return res.status(500).json({ message: "Không thể đánh dấu tất cả đã đọc." });
  }
}

async function deleteNotification(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const notificationId = parseUuidParam(req.params.notificationId);
  if (!notificationId) {
    return res.status(400).json({ message: "Mã thông báo không hợp lệ." });
  }

  try {
    const result = await pool.query(
      `UPDATE public.notifications
       SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [notificationId, payload.sub],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy thông báo." });
    }

    return res.json({ message: "Đã xóa thông báo." });
  } catch (error) {
    console.error("deleteNotification failed:", error.message);
    return res.status(500).json({ message: "Không thể xóa thông báo." });
  }
}

async function deleteReadNotifications(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  try {
    const result = await pool.query(
      `UPDATE public.notifications
       SET deleted_at = NOW()
       WHERE user_id = $1 AND deleted_at IS NULL AND read_at IS NOT NULL
       RETURNING id`,
      [payload.sub],
    );
    return res.json({ message: "Đã xóa thông báo đã đọc.", count: result.rowCount });
  } catch (error) {
    console.error("deleteReadNotifications failed:", error.message);
    return res.status(500).json({ message: "Không thể xóa thông báo đã đọc." });
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  deleteReadNotifications,
};
