const DEFAULT_NOTIFICATION_PREFS = {
  orders: true,
  messages: true,
  quotes: true,
};

/** Thông báo hệ thống / thanh toán — luôn gửi bất kể toggle. */
const ALWAYS_ALLOW_ACTIONS = new Set([
  "identity_review_approved",
  "identity_review_rejected",
  "identity_review_submitted",
  "security_new_login",
  "withdrawal_completed",
  "withdrawal_rejected",
  "withdrawal_failed",
  "job_hidden_by_admin",
  "job_unhidden_by_admin",
  "job_deleted_by_admin",
]);

function normalizeNotificationPrefs(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    orders: source.orders !== false,
    messages: source.messages !== false,
    quotes: source.quotes !== false,
  };
}

function getPrefKeyForNotification({ category, action }) {
  const normalizedAction = String(action || "").toLowerCase();
  const normalizedCategory = String(category || "").toLowerCase();

  if (ALWAYS_ALLOW_ACTIONS.has(normalizedAction)) return null;
  if (normalizedCategory === "system") return null;

  if (normalizedCategory === "message" || normalizedAction === "message_received") {
    return "messages";
  }
  if (normalizedCategory === "quote" || normalizedAction.startsWith("quote_")) {
    return "quotes";
  }
  if (
    normalizedCategory === "order" ||
    normalizedCategory === "payment" ||
    normalizedCategory === "review"
  ) {
    return "orders";
  }

  return null;
}

async function getUserNotificationPrefs(db, userId) {
  try {
    const result = await db.query(
      `SELECT notification_prefs FROM public.users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [userId],
    );
    if (result.rowCount === 0) return { ...DEFAULT_NOTIFICATION_PREFS };
    return normalizeNotificationPrefs(result.rows[0].notification_prefs);
  } catch (error) {
    if (/notification_prefs/.test(String(error.message))) {
      return { ...DEFAULT_NOTIFICATION_PREFS };
    }
    throw error;
  }
}

async function isInAppNotificationAllowed(db, userId, { category, action }) {
  const prefKey = getPrefKeyForNotification({ category, action });
  if (!prefKey) return true;

  const prefs = await getUserNotificationPrefs(db, userId);
  return prefs[prefKey] !== false;
}

module.exports = {
  DEFAULT_NOTIFICATION_PREFS,
  normalizeNotificationPrefs,
  getPrefKeyForNotification,
  getUserNotificationPrefs,
  isInAppNotificationAllowed,
};
