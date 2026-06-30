const { pool } = require("../db/pool");
const { requireAdmin } = require("../utils/requireAdmin");
const { parseUuidParam } = require("../utils/validators");
const {
  markWithdrawalSucceeded,
  markWithdrawalFailed,
  isMissingSchemaError,
} = require("../services/walletWithdrawPayos.service");
const { notifyUser } = require("../utils/notificationService");
const { resolveBankBin } = require("../utils/vnBankBins");
const {
  REASON_CODES,
  buildWithdrawalRejectMessage,
} = require("../utils/withdrawalRejectReasons");

function schemaHint() {
  return "Chạy backend/sql/freelancer_withdrawal_payos.sql và client_billing_payments.sql trên PostgreSQL.";
}

function normalizeBankBin(rawBin, bankName) {
  const direct = String(rawBin || "").trim();
  if (/^\d{6}$/.test(direct)) return direct;
  const fromName = resolveBankBin(bankName);
  return /^\d{6}$/.test(String(fromName || "")) ? String(fromName) : "";
}

function mapRow(row) {
  const amount = Number(row.amount) || 0;
  const accountLast4 = row.account_last4 || String(row.to_account_number || "").slice(-4);
  const bankBin = normalizeBankBin(row.to_bin, row.bank_name);
  const accountNumber = String(row.to_account_number || "").replace(/\D/g, "");
  const accountName = String(row.account_holder_name || "").trim();
  const addInfo = `WD ${row.reference_id || ""}`.trim();
  const qrUrl =
    bankBin && accountNumber
      ? `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.jpg?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`
      : null;
  return {
    id: row.id,
    user_id: row.user_id,
    reference_id: row.reference_id,
    amount,
    status: row.status,
    bank_name: row.bank_name,
    account_holder_name: row.account_holder_name,
    account_last4: accountLast4,
    to_bin: row.to_bin,
    to_account_number: row.to_account_number,
    description: row.description,
    failure_reason: row.failure_reason,
    transaction_id: row.transaction_id,
    auth_verified_at: row.auth_verified_at,
    paid_at: row.paid_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    requester_name: row.requester_name,
    requester_email: row.requester_email,
    requester_role: row.requester_role,
    freelancer_name: row.requester_name,
    freelancer_email: row.requester_email,
    qr_url: qrUrl,
  };
}

async function loadWithdrawal(db, withdrawalId) {
  const rs = await db.query(
    `SELECT w.*,
            up.full_name AS requester_name,
            u.email AS requester_email,
            u.role AS requester_role
     FROM public.freelancer_withdrawal_orders w
     LEFT JOIN public.user_profiles up ON up.user_id = w.user_id
     LEFT JOIN public.users u ON u.id = w.user_id
     WHERE w.id = $1
     LIMIT 1`,
    [withdrawalId],
  );
  return rs.rows[0] || null;
}

async function listAdminWithdrawals(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const status = String(req.query.status || "pending").toLowerCase();
  const audience = String(req.query.audience || "freelancer").toLowerCase();
  const q = String(req.query.q || "").trim().slice(0, 120);
  if (!["all", "freelancer", "client"].includes(audience)) {
    return res.status(400).json({ message: "Bộ lọc đối tượng không hợp lệ." });
  }
  const db = await pool.connect();
  try {
    const where = [];
    const params = [];

    if (status === "pending") {
      where.push(`w.status = 'PROCESSING'`);
    } else if (status === "completed") {
      where.push(`w.status = 'SUCCEEDED'`);
    } else if (status === "failed") {
      where.push(`w.status IN ('FAILED', 'CANCELLED')`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(w.reference_id ILIKE $${params.length} OR up.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR w.bank_name ILIKE $${params.length})`,
      );
    }
    if (audience !== "all") {
      params.push(audience);
      where.push(`LOWER(COALESCE(u.role, '')) = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await db.query(
      `SELECT w.*,
              up.full_name AS requester_name,
              u.email AS requester_email,
              u.role AS requester_role
       FROM public.freelancer_withdrawal_orders w
       LEFT JOIN public.user_profiles up ON up.user_id = w.user_id
       LEFT JOIN public.users u ON u.id = w.user_id
       ${whereSql}
       ORDER BY
         CASE
           WHEN w.status = 'PROCESSING' THEN 0
           WHEN w.status = 'SUCCEEDED' THEN 1
           ELSE 2
         END,
         w.created_at DESC
       LIMIT 200`,
      params,
    );

    return res.json({
      status,
      audience,
      q,
      total: result.rows.length,
      requests: result.rows.map(mapRow),
    });
  } catch (error) {
    console.error("listAdminWithdrawals failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({ message: schemaHint() });
    }
    return res.status(500).json({ message: "Không thể tải yêu cầu rút tiền." });
  } finally {
    db.release();
  }
}

async function getAdminWithdrawalDetail(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;
  const withdrawalId = parseUuidParam(req.params.withdrawalId);
  if (!withdrawalId) return res.status(400).json({ message: "Mã yêu cầu không hợp lệ." });
  const db = await pool.connect();
  try {
    const row = await loadWithdrawal(db, withdrawalId);
    if (!row) return res.status(404).json({ message: "Không tìm thấy yêu cầu rút tiền." });
    return res.json({ request: mapRow(row), role: "admin" });
  } catch (error) {
    console.error("getAdminWithdrawalDetail failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({ message: schemaHint() });
    }
    return res.status(500).json({ message: "Không thể tải chi tiết yêu cầu." });
  } finally {
    db.release();
  }
}

async function resolveAdminWithdrawal(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;
  const withdrawalId = parseUuidParam(req.params.withdrawalId);
  if (!withdrawalId) return res.status(400).json({ message: "Mã yêu cầu không hợp lệ." });

  const resolution = String(req.body?.resolution || "").toLowerCase();
  const adminNote = String(req.body?.adminNote || "").trim().slice(0, 2000);
  const rejectReason = String(req.body?.rejectReason || "").trim();
  if (!["approve", "reject"].includes(resolution)) {
    return res.status(400).json({ message: "Quyết định không hợp lệ. Chọn duyệt hoặc từ chối." });
  }
  if (resolution === "reject") {
    if (!rejectReason || !REASON_CODES.has(rejectReason)) {
      return res.status(400).json({ message: "Vui lòng chọn lý do từ chối hợp lệ." });
    }
    if (rejectReason === "other" && !adminNote) {
      return res.status(400).json({ message: "Vui lòng nhập ghi chú khi chọn lý do Khác." });
    }
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const row = await loadWithdrawal(db, withdrawalId);
    if (!row) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy yêu cầu rút tiền." });
    }
    if (String(row.status) !== "PROCESSING") {
      await db.query("ROLLBACK");
      return res.status(409).json({ message: "Yêu cầu không còn ở trạng thái chờ admin duyệt." });
    }

    if (resolution === "approve") {
      await markWithdrawalSucceeded(db, row, {
        payoutId: row.payos_payout_id || "manual-transfer",
        txId: row.payos_tx_id || null,
        txState: "COMPLETED_MANUAL",
      });
      if (adminNote) {
        await db.query(
          `UPDATE public.freelancer_withdrawal_orders
           SET description = COALESCE(description, '') || $2,
               updated_at = NOW()
           WHERE id = $1`,
          [withdrawalId, ` | Admin note: ${adminNote}`],
        );
      }
      await notifyUser(db, {
        recipientId: row.user_id,
        actorId: payload.sub,
        category: "payment",
        action: "withdrawal_completed",
        title: "Yêu cầu rút tiền đã hoàn tất",
        body: `Admin đã duyệt chuyển khoản ${Number(row.amount).toLocaleString("vi-VN")}đ về tài khoản ${row.bank_name} (${row.account_last4 || "****"}).`,
        href: "/payments",
        entityType: "withdrawal",
        entityId: row.id,
      });
      await db.query("COMMIT");
      return res.json({ message: "Đã duyệt yêu cầu rút tiền.", resolution: "approve" });
    }

    await markWithdrawalFailed(
      db,
      row,
      buildWithdrawalRejectMessage(rejectReason, adminNote),
      true,
    );
    const rejectMessage = buildWithdrawalRejectMessage(rejectReason, adminNote);
    await notifyUser(db, {
      recipientId: row.user_id,
      actorId: payload.sub,
      category: "payment",
      action: "withdrawal_rejected",
      title: "Yêu cầu rút tiền bị từ chối",
      body: `Yêu cầu rút ${Number(row.amount).toLocaleString("vi-VN")}đ về ${row.bank_name} bị từ chối. Lý do: ${rejectMessage}. Số dư đã hoàn lại ví nếu đã bị trừ khi xác nhận PIN.`,
      href: "/payments",
      entityType: "withdrawal",
      entityId: row.id,
    });
    await db.query("COMMIT");
    return res.json({ message: "Đã từ chối yêu cầu và hoàn lại ví.", resolution: "reject" });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("resolveAdminWithdrawal failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({ message: schemaHint() });
    }
    return res.status(500).json({ message: "Không thể xử lý yêu cầu rút tiền." });
  } finally {
    db.release();
  }
}

module.exports = {
  listAdminWithdrawals,
  getAdminWithdrawalDetail,
  resolveAdminWithdrawal,
};

