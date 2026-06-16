const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { parseUuidParam } = require("../utils/validators");
const { uploadDisputeEvidence } = require("../middleware/disputeEvidenceUpload");
const { SLA_DAYS, addDays } = require("../utils/workflowSla");

function schemaHint(error) {
  const msg = String(error?.message || "").toLowerCase();
  if (
    msg.includes("contract_dispute_messages") ||
    msg.includes("dispute_stage") ||
    msg.includes("updated_at")
  ) {
    return "Chạy backend/sql/refund_dispute_center.sql trên PostgreSQL.";
  }
  if (msg.includes("reason_code")) {
    return "Chạy backend/sql/refund_dispute_center.sql trên PostgreSQL.";
  }
  return "Thiếu cột DB. Chạy backend/sql/refund_dispute_center.sql.";
}

async function listRefundRequests(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const db = await pool.connect();
  try {
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
              c.agreed_price,
              c.escrow_status,
              c.workflow_stage,
              c.job_id,
              c.service_id,
              j.title AS job_title,
              s.title AS service_title,
              CASE WHEN c.client_id = $1 THEN 'client' ELSE 'freelancer' END AS viewer_role,
              CASE WHEN c.client_id = $1 THEN fup.full_name ELSE cup.full_name END AS counterparty_name
       FROM public.contract_cancel_requests r
       INNER JOIN public.contracts c ON c.id = r.contract_id AND c.deleted_at IS NULL
       LEFT JOIN public.jobs j ON j.id = c.job_id
       LEFT JOIN public.services s ON s.id = c.service_id
       LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
       LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
       WHERE c.client_id = $1 OR c.freelancer_id = $1
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [payload.sub],
    );
    return res.json({ requests: result.rows });
  } catch (error) {
    console.error("listRefundRequests failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: schemaHint(error) });
    }
    return res.status(500).json({ message: "Không thể tải yêu cầu hoàn tiền." });
  } finally {
    db.release();
  }
}

async function listDisputes(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const db = await pool.connect();
  try {
    const result = await db.query(
      `SELECT d.id,
              d.contract_id,
              d.reason,
              d.issue_category,
              d.desired_resolution,
              d.desired_resolution_note,
              d.dispute_stage,
              d.respond_by_at,
              d.status,
              d.resolution,
              d.admin_notes,
              d.created_at,
              d.resolved_at,
              d.opened_by,
              c.agreed_price,
              c.workflow_stage,
              c.escrow_status,
              j.title AS job_title,
              s.title AS service_title,
              CASE WHEN c.client_id = $1 THEN 'client' ELSE 'freelancer' END AS viewer_role,
              CASE WHEN c.client_id = $1 THEN fup.full_name ELSE cup.full_name END AS counterparty_name,
              (SELECT COUNT(*)::int FROM public.contract_dispute_messages m WHERE m.dispute_id = d.id) AS message_count
       FROM public.contract_disputes d
       INNER JOIN public.contracts c ON c.id = d.contract_id AND c.deleted_at IS NULL
       LEFT JOIN public.jobs j ON j.id = c.job_id
       LEFT JOIN public.services s ON s.id = c.service_id
       LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
       LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
       WHERE c.client_id = $1 OR c.freelancer_id = $1
       ORDER BY d.created_at DESC
       LIMIT 100`,
      [payload.sub],
    );
    return res.json({ disputes: result.rows });
  } catch (error) {
    console.error("listDisputes failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: schemaHint(error) });
    }
    return res.status(500).json({ message: "Không thể tải tranh chấp." });
  } finally {
    db.release();
  }
}

async function loadDisputeForUser(db, disputeId, userId) {
  const res = await db.query(
    `SELECT d.*,
            c.client_id,
            c.freelancer_id,
            c.agreed_price,
            c.workflow_stage,
            c.escrow_status,
            j.title AS job_title,
            s.title AS service_title,
            cup.full_name AS client_name,
            fup.full_name AS freelancer_name
     FROM public.contract_disputes d
     INNER JOIN public.contracts c ON c.id = d.contract_id AND c.deleted_at IS NULL
     LEFT JOIN public.jobs j ON j.id = c.job_id
     LEFT JOIN public.services s ON s.id = c.service_id
     LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
     LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
     WHERE d.id = $1
       AND (c.client_id = $2 OR c.freelancer_id = $2)
     LIMIT 1`,
    [disputeId, userId],
  );
  return res.rows[0] || null;
}

async function getDisputeDetail(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const disputeId = parseUuidParam(req.params.disputeId);
  if (!disputeId) {
    return res.status(400).json({ message: "Mã tranh chấp không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const dispute = await loadDisputeForUser(db, disputeId, payload.sub);
    if (!dispute) {
      return res.status(404).json({ message: "Không tìm thấy tranh chấp." });
    }

    const messages = await db.query(
      `SELECT m.id, m.author_id, m.author_role, m.body, m.attachments, m.created_at,
              up.full_name AS author_name
       FROM public.contract_dispute_messages m
       LEFT JOIN public.user_profiles up ON up.user_id = m.author_id
       WHERE m.dispute_id = $1
       ORDER BY m.created_at ASC`,
      [disputeId],
    );

    const role =
      dispute.client_id === payload.sub
        ? "client"
        : dispute.freelancer_id === payload.sub
          ? "freelancer"
          : null;

    return res.json({
      dispute,
      messages: messages.rows,
      role,
    });
  } catch (error) {
    console.error("getDisputeDetail failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: schemaHint(error) });
    }
    return res.status(500).json({ message: "Không thể tải chi tiết tranh chấp." });
  } finally {
    db.release();
  }
}

function resolveAuthorRole(dispute, userId, userRole) {
  if (userRole === "admin") return "admin";
  if (String(dispute.client_id) === String(userId)) return "client";
  if (String(dispute.freelancer_id) === String(userId)) return "freelancer";
  return null;
}

async function postDisputeMessage(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const disputeId = parseUuidParam(req.params.disputeId);
  if (!disputeId) {
    return res.status(400).json({ message: "Mã tranh chấp không hợp lệ." });
  }

  const body = String(req.body?.body || "").trim().slice(0, 4000);
  if (!body) {
    return res.status(400).json({ message: "Nội dung tin nhắn không được để trống." });
  }

  const attachments = Array.isArray(req.body?.attachments)
    ? req.body.attachments.map((u) => String(u).trim()).filter(Boolean).slice(0, 6)
    : [];

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const dispute = await loadDisputeForUser(db, disputeId, payload.sub);
    if (!dispute) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy tranh chấp." });
    }
    if (String(dispute.status) !== "open") {
      await db.query("ROLLBACK");
      return res.status(409).json({ message: "Tranh chấp đã đóng." });
    }

    const authorRole = resolveAuthorRole(dispute, payload.sub, payload.role);
    if (!authorRole) {
      await db.query("ROLLBACK");
      return res.status(403).json({ message: "Bạn không có quyền gửi tin nhắn." });
    }

    const inserted = await db.query(
      `INSERT INTO public.contract_dispute_messages (dispute_id, author_id, author_role, body, attachments)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, created_at`,
      [disputeId, payload.sub, authorRole, body, JSON.stringify(attachments)],
    );

    if (
      authorRole === "freelancer" &&
      String(dispute.dispute_stage || "").toLowerCase() === "awaiting_response"
    ) {
      await db.query(
        `UPDATE public.contract_disputes
         SET dispute_stage = 'admin_review', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [disputeId],
      );
    }

    await db.query("COMMIT");
    return res.status(201).json({
      message: "Đã gửi tin nhắn.",
      id: inserted.rows[0].id,
      created_at: inserted.rows[0].created_at,
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("postDisputeMessage failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: schemaHint(error) });
    }
    return res.status(500).json({ message: "Không thể gửi tin nhắn." });
  } finally {
    db.release();
  }
}

function uploadEvidence(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const handler = uploadDisputeEvidence.array("files", 6);
  handler(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || "Không thể tải tệp lên." });
    }
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "Chưa chọn tệp bằng chứng." });
    }
    const urls = files.map((f) => `/uploads/disputes/${f.filename}`);
    return res.json({ urls });
  });
}

module.exports = {
  listRefundRequests,
  listDisputes,
  getDisputeDetail,
  postDisputeMessage,
  uploadEvidence,
  SLA_DAYS,
  addDays,
};
