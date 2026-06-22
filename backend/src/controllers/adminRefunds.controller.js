const { pool } = require("../db/pool");
const { requireAdmin } = require("../utils/requireAdmin");
const { parseUuidParam } = require("../utils/validators");
const { settleCancelRefund, logWorkflowEvent } = require("../utils/workflowSla");
const { computeRefundSettlement } = require("../utils/refundSettlement");

function schemaHint() {
  return "Chạy backend/sql/workflow_sla.sql, refund_dispute_center.sql và refund_settlement.sql trên PostgreSQL.";
}

function mapRefundRow(row) {
  return {
    id: row.id,
    contract_id: row.contract_id,
    reason: row.reason,
    reason_code: row.reason_code,
    detail: row.detail,
    refund_method: row.refund_method,
    status: row.status,
    respond_by_at: row.respond_by_at,
    freelancer_response: row.freelancer_response,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    requested_by: row.requested_by,
    agreed_price: row.agreed_price,
    escrow_status: row.escrow_status,
    workflow_stage: row.workflow_stage,
    contract_status: row.contract_status,
    job_title: row.job_title,
    service_title: row.service_title,
    client_id: row.client_id,
    freelancer_id: row.freelancer_id,
    client_name: row.client_name,
    freelancer_name: row.freelancer_name,
    client_email: row.client_email,
    freelancer_email: row.freelancer_email,
    legitimacy: row.legitimacy,
    split_type: row.split_type,
    penalty_percent: row.penalty_percent,
    work_done_percent: row.work_done_percent,
    client_refund_amount: row.client_refund_amount,
    freelancer_amount: row.freelancer_amount,
    platform_fee_amount: row.platform_fee_amount,
    workflow_stage_at_request: row.workflow_stage_at_request,
    had_progress_at_request: row.had_progress_at_request,
    admin_note: row.admin_note,
  };
}

async function listAdminRefunds(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const status = String(req.query.status || "pending").toLowerCase();
  const q = String(req.query.q || "").trim().slice(0, 120);

  const db = await pool.connect();
  try {
    const params = [];
    const where = ["c.deleted_at IS NULL"];

    if (status === "pending") {
      where.push(`r.status = 'pending'`);
    } else if (status === "resolved") {
      where.push(`r.status IN ('approved', 'auto_approved', 'rejected')`);
    }

    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(j.title ILIKE $${params.length} OR s.title ILIKE $${params.length} OR cup.full_name ILIKE $${params.length} OR fup.full_name ILIKE $${params.length} OR cu.email ILIKE $${params.length} OR fu.email ILIKE $${params.length})`,
      );
    }

    const result = await db.query(
      `SELECT r.id,
              r.contract_id,
              r.reason,
              r.reason_code,
              r.detail,
              r.refund_method,
              r.status,
              r.respond_by_at,
              r.freelancer_response,
              r.created_at,
              r.resolved_at,
              r.requested_by,
              r.legitimacy,
              r.split_type,
              r.penalty_percent,
              r.work_done_percent,
              r.client_refund_amount,
              r.freelancer_amount,
              r.platform_fee_amount,
              r.workflow_stage_at_request,
              r.had_progress_at_request,
              r.admin_note,
              c.agreed_price,
              c.escrow_status,
              c.workflow_stage,
              c.status AS contract_status,
              c.client_id,
              c.freelancer_id,
              j.title AS job_title,
              s.title AS service_title,
              cup.full_name AS client_name,
              fup.full_name AS freelancer_name,
              cu.email AS client_email,
              fu.email AS freelancer_email
       FROM public.contract_cancel_requests r
       INNER JOIN public.contracts c ON c.id = r.contract_id
       LEFT JOIN public.jobs j ON j.id = c.job_id
       LEFT JOIN public.services s ON s.id = c.service_id
       LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
       LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
       LEFT JOIN public.users cu ON cu.id = c.client_id
       LEFT JOIN public.users fu ON fu.id = c.freelancer_id
       WHERE ${where.join(" AND ")}
       ORDER BY
         CASE
           WHEN r.status = 'pending' AND r.respond_by_at < NOW() THEN 0
           WHEN r.status = 'pending' THEN 1
           ELSE 2
         END,
         r.created_at DESC
       LIMIT 200`,
      params,
    );

    return res.json({
      status,
      q,
      total: result.rows.length,
      requests: result.rows.map(mapRefundRow),
    });
  } catch (error) {
    console.error("listAdminRefunds failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: schemaHint() });
    }
    return res.status(500).json({ message: "Không thể tải yêu cầu hoàn tiền." });
  } finally {
    db.release();
  }
}

async function loadRefundRequest(db, requestId) {
  const result = await db.query(
    `SELECT r.*,
            c.agreed_price,
            c.escrow_status,
            c.workflow_stage,
            c.status AS contract_status,
            c.client_id,
            c.freelancer_id,
            c.job_id,
            c.service_id,
            j.title AS job_title,
            s.title AS service_title,
            cup.full_name AS client_name,
            fup.full_name AS freelancer_name,
            cu.email AS client_email,
            fu.email AS freelancer_email
     FROM public.contract_cancel_requests r
     INNER JOIN public.contracts c ON c.id = r.contract_id AND c.deleted_at IS NULL
     LEFT JOIN public.jobs j ON j.id = c.job_id
     LEFT JOIN public.services s ON s.id = c.service_id
     LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
     LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
     LEFT JOIN public.users cu ON cu.id = c.client_id
     LEFT JOIN public.users fu ON fu.id = c.freelancer_id
     WHERE r.id = $1
     LIMIT 1`,
    [requestId],
  );
  return result.rows[0] || null;
}

async function getAdminRefundDetail(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const requestId = parseUuidParam(req.params.requestId);
  if (!requestId) {
    return res.status(400).json({ message: "Mã yêu cầu không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const row = await loadRefundRequest(db, requestId);
    if (!row) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu hoàn tiền." });
    }

    const events = await db.query(
      `SELECT event_type, payload, created_at
       FROM public.contract_workflow_events
       WHERE contract_id = $1
         AND event_type IN (
           'cancel_refund_requested',
           'cancel_refund_rejected',
           'escrow_refunded',
           'admin_refund_resolved'
         )
       ORDER BY created_at DESC
       LIMIT 20`,
      [row.contract_id],
    );

    return res.json({
      request: mapRefundRow(row),
      events: events.rows,
      role: "admin",
    });
  } catch (error) {
    console.error("getAdminRefundDetail failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: schemaHint() });
    }
    return res.status(500).json({ message: "Không thể tải chi tiết yêu cầu." });
  } finally {
    db.release();
  }
}

async function resolveAdminRefund(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const requestId = parseUuidParam(req.params.requestId);
  if (!requestId) {
    return res.status(400).json({ message: "Mã yêu cầu không hợp lệ." });
  }

  const resolution = String(req.body?.resolution || "").toLowerCase();
  const adminNote = String(req.body?.adminNote || "").trim().slice(0, 2000);
  const legitimacyOverride = String(req.body?.legitimacy || "").toLowerCase();
  const penaltyPercentRaw = req.body?.penaltyPercent;

  if (!["approve", "reject"].includes(resolution)) {
    return res.status(400).json({
      message: "Quyết định không hợp lệ. Chọn: approve hoặc reject.",
    });
  }

  let legitimacy = null;
  if (legitimacyOverride === "legitimate" || legitimacyOverride === "unjustified") {
    legitimacy = legitimacyOverride;
  }

  let penaltyPercent = null;
  if (penaltyPercentRaw !== undefined && penaltyPercentRaw !== null && penaltyPercentRaw !== "") {
    const n = Number(penaltyPercentRaw);
    if (!Number.isFinite(n) || n < 10 || n > 25) {
      return res.status(400).json({ message: "Phí phạt phải từ 10% đến 25%." });
    }
    penaltyPercent = n / 100;
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const row = await loadRefundRequest(db, requestId);
    if (!row) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy yêu cầu hoàn tiền." });
    }
    if (String(row.status) !== "pending") {
      await db.query("ROLLBACK");
      return res.status(409).json({ message: "Yêu cầu đã được xử lý." });
    }
    if (String(row.escrow_status || "") !== "funded") {
      await db.query("ROLLBACK");
      return res.status(409).json({ message: "Chỉ xử lý yêu cầu khi ký quỹ đang được nạp." });
    }

    const contract = {
      id: row.contract_id,
      client_id: row.client_id,
      freelancer_id: row.freelancer_id,
      agreed_price: row.agreed_price,
      job_id: row.job_id,
    };

    if (resolution === "approve") {
      const note = adminNote || "Admin: duyệt phân bổ hoàn tiền";
      const settlement = computeRefundSettlement({
        agreedPrice: row.agreed_price,
        workflowStage: row.workflow_stage_at_request || row.workflow_stage,
        hasProgress: row.had_progress_at_request,
        reasonCode: row.reason_code,
        legitimacyOverride: legitimacy || row.legitimacy,
        penaltyPercent,
      });

      await db.query(
        `UPDATE public.contract_cancel_requests
         SET status = 'approved',
             freelancer_response = COALESCE(NULLIF(freelancer_response, ''), $1),
             resolved_at = CURRENT_TIMESTAMP,
             legitimacy = $3,
             split_type = $4,
             penalty_percent = $5,
             work_done_percent = $6,
             client_refund_amount = $7,
             freelancer_amount = $8,
             platform_fee_amount = $9,
             admin_note = $1
         WHERE id = $2`,
        [
          note,
          requestId,
          settlement.legitimacy,
          settlement.splitType,
          settlement.penaltyPercent,
          settlement.workDonePercent,
          settlement.clientAmount,
          settlement.freelancerAmount,
          settlement.platformFeeAmount,
        ],
      );

      const updatedRequest = (
        await db.query(`SELECT * FROM public.contract_cancel_requests WHERE id = $1`, [requestId])
      ).rows[0];

      await settleCancelRefund(db, contract, updatedRequest, payload.sub, row.reason);
      await logWorkflowEvent(
        db,
        row.contract_id,
        "admin_refund_resolved",
        { resolution: "approve", adminNote: note, requestId, settlement },
        payload.sub,
      );
      await db.query("COMMIT");
      return res.json({
        message: `Đã duyệt phân bổ: Khách hàng ${settlement.clientAmount.toLocaleString("vi-VN")}đ, Freelancer ${settlement.freelancerAmount.toLocaleString("vi-VN")}đ.`,
        resolution: "approve",
        settlement,
      });
    }

    const note = adminNote || "Admin: từ chối yêu cầu hoàn tiền";
    await db.query(
      `UPDATE public.contract_cancel_requests
       SET status = 'rejected',
           freelancer_response = $1,
           resolved_at = CURRENT_TIMESTAMP,
           admin_note = $1
       WHERE id = $2`,
      [note, requestId],
    );
    await logWorkflowEvent(
      db,
      row.contract_id,
      "admin_refund_resolved",
      { resolution: "reject", adminNote: note, requestId },
      payload.sub,
    );
    await db.query("COMMIT");
    return res.json({ message: "Đã từ chối yêu cầu hoàn tiền.", resolution: "reject" });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("resolveAdminRefund failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: schemaHint() });
    }
    return res.status(500).json({ message: "Không thể xử lý yêu cầu hoàn tiền." });
  } finally {
    db.release();
  }
}

module.exports = {
  listAdminRefunds,
  getAdminRefundDetail,
  resolveAdminRefund,
};
