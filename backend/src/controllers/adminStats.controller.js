const { pool } = require("../db/pool");
const { requireAdmin } = require("../utils/requireAdmin");

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function toMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

async function safeQuery(db, sql, params = []) {
  try {
    const result = await db.query(sql, params);
    return result.rows;
  } catch (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return null;
    }
    throw error;
  }
}

async function loadOverview(db) {
  const rows = await safeQuery(
    db,
    `
    SELECT
      (SELECT COUNT(*)::int FROM public.users u WHERE u.deleted_at IS NULL) AS total_users,
      (SELECT COUNT(*)::int FROM public.users u
       WHERE u.deleted_at IS NULL AND LOWER(COALESCE(u.role, '')) = 'client') AS total_clients,
      (SELECT COUNT(*)::int FROM public.users u
       WHERE u.deleted_at IS NULL AND LOWER(COALESCE(u.role, '')) = 'freelancer') AS total_freelancers,
      (SELECT COUNT(*)::int FROM public.users u
       WHERE u.deleted_at IS NULL AND u.created_at >= NOW() - INTERVAL '7 days') AS new_users_7d,
      (SELECT COUNT(*)::int FROM public.users u
       WHERE u.deleted_at IS NULL AND u.created_at >= NOW() - INTERVAL '30 days') AS new_users_30d,
      (SELECT COUNT(*)::int
       FROM public.identity_verifications iv
       INNER JOIN public.users u ON u.id = iv.user_id AND u.deleted_at IS NULL
       WHERE iv.submitted_for_review_at IS NOT NULL
         AND COALESCE(iv.admin_review_status, 'pending') = 'pending') AS pending_approvals,
      (SELECT COUNT(*)::int FROM public.contract_cancel_requests r
       WHERE r.status = 'pending') AS pending_refunds,
      (SELECT COUNT(*)::int FROM public.contract_disputes d
       WHERE d.status = 'open') AS open_disputes,
      (SELECT COUNT(*)::int FROM public.freelancer_withdrawal_orders w
       WHERE w.status IN ('PENDING_AUTH', 'PROCESSING')) AS pending_withdrawals,
      (SELECT COUNT(*)::int FROM public.contracts c WHERE c.deleted_at IS NULL) AS total_contracts
    `,
  );

  if (!rows?.[0]) {
    return {
      totalUsers: 0,
      totalClients: 0,
      totalFreelancers: 0,
      newUsers7d: 0,
      newUsers30d: 0,
      pendingApprovals: 0,
      pendingRefunds: 0,
      openDisputes: 0,
      pendingWithdrawals: 0,
      totalContracts: 0,
      completedContracts: 0,
      gmvReleased: 0,
      satisfactionRate: 0,
      totalEscrow: 0,
    };
  }

  const row = rows[0];

  let completedContracts = 0;
  let gmvReleased = 0;
  const releasedRows = await safeQuery(
    db,
    `SELECT
       COUNT(*)::int AS completed_contracts,
       COALESCE(SUM(c.agreed_price), 0) AS gmv_released
     FROM public.contracts c
     WHERE c.deleted_at IS NULL AND c.released_at IS NOT NULL`,
  );
  if (releasedRows?.[0]) {
    completedContracts = toInt(releasedRows[0].completed_contracts);
    gmvReleased = toMoney(releasedRows[0].gmv_released);
  } else {
    const fallbackRows = await safeQuery(
      db,
      `SELECT
         COUNT(*)::int AS completed_contracts,
         COALESCE(SUM(c.agreed_price), 0) AS gmv_released
       FROM public.contracts c
       WHERE c.deleted_at IS NULL AND LOWER(COALESCE(c.status, '')) = 'completed'`,
    );
    if (fallbackRows?.[0]) {
      completedContracts = toInt(fallbackRows[0].completed_contracts);
      gmvReleased = toMoney(fallbackRows[0].gmv_released);
    }
  }

  let satisfactionRate = 0;
  const reviewRows = await safeQuery(
    db,
    `SELECT
       CASE
         WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND(100.0 * SUM(CASE WHEN cr.rating >= 4 THEN 1 ELSE 0 END) / COUNT(*), 0)::int
       END AS satisfaction_rate
     FROM public.contract_reviews cr`,
  );
  if (reviewRows?.[0]) {
    satisfactionRate = Math.min(100, toInt(reviewRows[0].satisfaction_rate));
  }

  let totalEscrow = 0;
  const escrowRows = await safeQuery(
    db,
    `SELECT COALESCE(SUM(a.escrow_balance), 0) AS total_escrow
     FROM public.accounts a`,
  );
  if (escrowRows?.[0]) {
    totalEscrow = toMoney(escrowRows[0].total_escrow);
  }

  return {
    totalUsers: toInt(row.total_users),
    totalClients: toInt(row.total_clients),
    totalFreelancers: toInt(row.total_freelancers),
    newUsers7d: toInt(row.new_users_7d),
    newUsers30d: toInt(row.new_users_30d),
    pendingApprovals: toInt(row.pending_approvals),
    pendingRefunds: toInt(row.pending_refunds),
    openDisputes: toInt(row.open_disputes),
    pendingWithdrawals: toInt(row.pending_withdrawals),
    totalContracts: toInt(row.total_contracts),
    completedContracts,
    gmvReleased,
    satisfactionRate,
    totalEscrow,
  };
}

async function loadUsersByRole(db) {
  const rows = await safeQuery(
    db,
    `SELECT LOWER(COALESCE(u.role, 'unknown')) AS role, COUNT(*)::int AS count
     FROM public.users u
     WHERE u.deleted_at IS NULL
     GROUP BY 1
     ORDER BY count DESC`,
  );
  if (!rows) return [];
  return rows.map((r) => ({
    role: r.role,
    count: toInt(r.count),
  }));
}

const STAGE_LABELS = {
  selection: "Chọn freelancer",
  escrow: "Chờ nạp Escrow",
  funded: "Đã nạp (Funded)",
  execution: "Thực hiện",
  delivery: "Bàn giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  disputed: "Tranh chấp",
};

async function loadContractsByStage(db) {
  const rows = await safeQuery(
    db,
    `SELECT COALESCE(c.workflow_stage, 'unknown') AS stage, COUNT(*)::int AS count
     FROM public.contracts c
     WHERE c.deleted_at IS NULL
     GROUP BY 1
     ORDER BY count DESC`,
  );
  if (!rows) return [];
  return rows.map((r) => ({
    stage: r.stage,
    label: STAGE_LABELS[r.stage] || r.stage,
    count: toInt(r.count),
  }));
}

async function loadQueueStats(db) {
  const refunds = { pending: 0, resolved: 0 };
  const refundRows = await safeQuery(
    db,
    `SELECT
       COUNT(*) FILTER (WHERE r.status = 'pending')::int AS pending,
       COUNT(*) FILTER (WHERE r.status IN ('approved', 'auto_approved', 'rejected'))::int AS resolved
     FROM public.contract_cancel_requests r`,
  );
  if (refundRows?.[0]) {
    refunds.pending = toInt(refundRows[0].pending);
    refunds.resolved = toInt(refundRows[0].resolved);
  }

  const disputes = { open: 0, resolved: 0 };
  const disputeRows = await safeQuery(
    db,
    `SELECT
       COUNT(*) FILTER (WHERE d.status = 'open')::int AS open,
       COUNT(*) FILTER (WHERE d.status IN ('resolved', 'dismissed'))::int AS resolved
     FROM public.contract_disputes d`,
  );
  if (disputeRows?.[0]) {
    disputes.open = toInt(disputeRows[0].open);
    disputes.resolved = toInt(disputeRows[0].resolved);
  }

  const withdrawals = { pending: 0, paid: 0, failed: 0 };
  const withdrawalRows = await safeQuery(
    db,
    `SELECT
       COUNT(*) FILTER (WHERE w.status IN ('PENDING_AUTH', 'PROCESSING'))::int AS pending,
       COUNT(*) FILTER (WHERE w.status = 'SUCCEEDED')::int AS paid,
       COUNT(*) FILTER (WHERE w.status IN ('FAILED', 'CANCELLED'))::int AS failed
     FROM public.freelancer_withdrawal_orders w`,
  );
  if (withdrawalRows?.[0]) {
    withdrawals.pending = toInt(withdrawalRows[0].pending);
    withdrawals.paid = toInt(withdrawalRows[0].paid);
    withdrawals.failed = toInt(withdrawalRows[0].failed);
  }

  return { refunds, disputes, withdrawals };
}

async function loadDailyTrend(db, sql, days = 30) {
  const rows = await safeQuery(db, sql, [days]);
  if (!rows) return [];
  return rows.map((r) => ({
    date: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
    count: toInt(r.count),
    amount: r.amount != null ? toMoney(r.amount) : undefined,
  }));
}

async function loadTrends(db) {
  const users = await loadDailyTrend(
    db,
    `SELECT d.day::date AS day, COALESCE(u.cnt, 0)::int AS count
     FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day'::interval) AS d(day)
     LEFT JOIN (
       SELECT DATE(u.created_at) AS day, COUNT(*) AS cnt
       FROM public.users u
       WHERE u.deleted_at IS NULL AND u.created_at >= CURRENT_DATE - ($1::int - 1)
       GROUP BY 1
     ) u ON u.day = d.day::date
     ORDER BY d.day`,
  );

  const contractsCreated = await loadDailyTrend(
    db,
    `SELECT d.day::date AS day, COALESCE(c.cnt, 0)::int AS count
     FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day'::interval) AS d(day)
     LEFT JOIN (
       SELECT DATE(c.created_at) AS day, COUNT(*) AS cnt
       FROM public.contracts c
       WHERE c.deleted_at IS NULL AND c.created_at >= CURRENT_DATE - ($1::int - 1)
       GROUP BY 1
     ) c ON c.day = d.day::date
     ORDER BY d.day`,
  );

  let contractsReleased = await loadDailyTrend(
    db,
    `SELECT d.day::date AS day, COALESCE(c.cnt, 0)::int AS count,
            COALESCE(c.amt, 0) AS amount
     FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day'::interval) AS d(day)
     LEFT JOIN (
       SELECT DATE(c.released_at) AS day, COUNT(*) AS cnt, SUM(c.agreed_price) AS amt
       FROM public.contracts c
       WHERE c.deleted_at IS NULL AND c.released_at IS NOT NULL
         AND c.released_at >= CURRENT_DATE - ($1::int - 1)
       GROUP BY 1
     ) c ON c.day = d.day::date
     ORDER BY d.day`,
  );

  if (!contractsReleased.length) {
    contractsReleased = await loadDailyTrend(
      db,
      `SELECT d.day::date AS day, COALESCE(c.cnt, 0)::int AS count,
              COALESCE(c.amt, 0) AS amount
       FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day'::interval) AS d(day)
       LEFT JOIN (
         SELECT DATE(c.updated_at) AS day, COUNT(*) AS cnt, SUM(c.agreed_price) AS amt
         FROM public.contracts c
         WHERE c.deleted_at IS NULL AND LOWER(COALESCE(c.status, '')) = 'completed'
           AND c.updated_at >= CURRENT_DATE - ($1::int - 1)
         GROUP BY 1
       ) c ON c.day = d.day::date
       ORDER BY d.day`,
    );
  }

  const withdrawals = await loadDailyTrend(
    db,
    `SELECT d.day::date AS day, COALESCE(w.cnt, 0)::int AS count,
            COALESCE(w.amt, 0) AS amount
     FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day'::interval) AS d(day)
     LEFT JOIN (
       SELECT DATE(w.paid_at) AS day, COUNT(*) AS cnt, SUM(w.amount) AS amt
       FROM public.freelancer_withdrawal_orders w
       WHERE w.paid_at IS NOT NULL AND w.paid_at >= CURRENT_DATE - ($1::int - 1)
       GROUP BY 1
     ) w ON w.day = d.day::date
     ORDER BY d.day`,
  );

  return { users, contractsCreated, contractsReleased, withdrawals };
}

const EVENT_LABELS = {
  profile_view: "Xem hồ sơ",
  website_click: "Nhấp website",
  work_invitation: "Mời làm việc",
  service_view: "Xem dịch vụ",
  service_conversion: "Chuyển đổi dịch vụ",
  portfolio_view: "Xem portfolio",
};

async function loadUsage(db) {
  const usage = {
    profileEvents30d: 0,
    profileEventsByType: [],
    chatMessages30d: 0,
    chatConversations: 0,
  };

  const eventRows = await safeQuery(
    db,
    `SELECT e.event_type, COUNT(*)::int AS count
     FROM public.profile_analytics_events e
     WHERE e.created_at >= NOW() - INTERVAL '30 days'
     GROUP BY 1
     ORDER BY count DESC`,
  );
  if (eventRows) {
    usage.profileEventsByType = eventRows.map((r) => ({
      type: r.event_type,
      label: EVENT_LABELS[r.event_type] || r.event_type,
      count: toInt(r.count),
    }));
    usage.profileEvents30d = usage.profileEventsByType.reduce((sum, item) => sum + item.count, 0);
  }

  const chatRows = await safeQuery(
    db,
    `SELECT
       (SELECT COUNT(*)::int FROM public.chat_messages m
        WHERE m.created_at >= NOW() - INTERVAL '30 days') AS messages_30d,
       (SELECT COUNT(*)::int FROM public.chat_conversations) AS conversations`,
  );
  if (chatRows?.[0]) {
    usage.chatMessages30d = toInt(chatRows[0].messages_30d);
    usage.chatConversations = toInt(chatRows[0].conversations);
  }

  return usage;
}

async function getAdminStatsOverview(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const db = await pool.connect();
  try {
    const [overview, usersByRole, contractsByStage, queue, trends, usage] = await Promise.all([
      loadOverview(db),
      loadUsersByRole(db),
      loadContractsByStage(db),
      loadQueueStats(db),
      loadTrends(db),
      loadUsage(db),
    ]);

    return res.json({
      updatedAt: new Date().toISOString(),
      overview,
      usersByRole,
      contractsByStage,
      queue,
      trends,
      usage,
    });
  } catch (error) {
    console.error("getAdminStatsOverview failed:", error.message);
    return res.status(500).json({ message: "Không thể tải báo cáo thống kê." });
  } finally {
    db.release();
  }
}

module.exports = {
  getAdminStatsOverview,
};
