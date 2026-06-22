const { pool } = require("../db/pool");
const { requireAdmin } = require("../utils/requireAdmin");
const { parseUuidParam } = require("../utils/validators");
const {
  refundEscrowToClient,
  releasePaymentToFreelancer,
  settleCancelRefund,
  logWorkflowEvent,
} = require("../utils/workflowSla");

function schemaHint() {
  return "Chạy backend/sql/refund_dispute_center.sql và workflow_sla.sql trên PostgreSQL.";
}

function mapDisputeRow(row) {
  return {
    id: row.id,
    contract_id: row.contract_id,
    reason: row.reason,
    issue_category: row.issue_category,
    desired_resolution: row.desired_resolution,
    desired_resolution_note: row.desired_resolution_note,
    dispute_stage: row.dispute_stage,
    respond_by_at: row.respond_by_at,
    status: row.status,
    resolution: row.resolution,
    admin_notes: row.admin_notes,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    opened_by: row.opened_by,
    agreed_price: row.agreed_price,
    workflow_stage: row.workflow_stage,
    escrow_status: row.escrow_status,
    contract_status: row.contract_status,
    job_title: row.job_title,
    service_title: row.service_title,
    client_id: row.client_id,
    freelancer_id: row.freelancer_id,
    client_name: row.client_name,
    freelancer_name: row.freelancer_name,
    message_count: row.message_count,
    evidence: row.evidence,
  };
}

async function listAdminDisputes(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const status = String(req.query.status || "open").toLowerCase();
  const stage = String(req.query.stage || "all").toLowerCase();
  const q = String(req.query.q || "").trim().slice(0, 120);

  const db = await pool.connect();
  try {
    const params = [];
    const where = ["c.deleted_at IS NULL"];

    if (status !== "all") {
      params.push(status);
      where.push(`d.status = $${params.length}`);
    }
    if (stage !== "all") {
      params.push(stage);
      where.push(`d.dispute_stage = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(j.title ILIKE $${params.length} OR s.title ILIKE $${params.length} OR cup.full_name ILIKE $${params.length} OR fup.full_name ILIKE $${params.length})`,
      );
    }

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
              c.status AS contract_status,
              c.client_id,
              c.freelancer_id,
              j.title AS job_title,
              s.title AS service_title,
              cup.full_name AS client_name,
              fup.full_name AS freelancer_name,
              (SELECT COUNT(*)::int FROM public.contract_dispute_messages m WHERE m.dispute_id = d.id) AS message_count
       FROM public.contract_disputes d
       INNER JOIN public.contracts c ON c.id = d.contract_id
       LEFT JOIN public.jobs j ON j.id = c.job_id
       LEFT JOIN public.services s ON s.id = c.service_id
       LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
       LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
       WHERE ${where.join(" AND ")}
       ORDER BY
         CASE WHEN d.status = 'open' AND d.dispute_stage = 'admin_review' THEN 0 ELSE 1 END,
         d.created_at DESC
       LIMIT 200`,
      params,
    );

    return res.json({
      status,
      stage,
      q,
      total: result.rows.length,
      disputes: result.rows.map(mapDisputeRow),
    });
  } catch (error) {
    console.error("listAdminDisputes failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: schemaHint() });
    }
    return res.status(500).json({ message: "Không thể tải danh sách tranh chấp." });
  } finally {
    db.release();
  }
}

async function loadAdminDispute(db, disputeId) {
  const res = await db.query(
    `SELECT d.*,
            c.client_id,
            c.freelancer_id,
            c.agreed_price,
            c.workflow_stage,
            c.escrow_status,
            c.status AS contract_status,
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
     LIMIT 1`,
    [disputeId],
  );
  return res.rows[0] || null;
}

async function getAdminDisputeDetail(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const disputeId = parseUuidParam(req.params.disputeId);
  if (!disputeId) {
    return res.status(400).json({ message: "Mã tranh chấp không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const dispute = await loadAdminDispute(db, disputeId);
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

    return res.json({
      dispute: mapDisputeRow(dispute),
      messages: messages.rows,
      role: "admin",
    });
  } catch (error) {
    console.error("getAdminDisputeDetail failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: schemaHint() });
    }
    return res.status(500).json({ message: "Không thể tải chi tiết tranh chấp." });
  } finally {
    db.release();
  }
}

async function postAdminDisputeMessage(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const disputeId = parseUuidParam(req.params.disputeId);
  if (!disputeId) {
    return res.status(400).json({ message: "Mã tranh chấp không hợp lệ." });
  }

  const body = String(req.body?.body || "").trim().slice(0, 4000);
  if (!body) {
    return res.status(400).json({ message: "Nội dung tin nhắn không được để trống." });
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const dispute = await loadAdminDispute(db, disputeId);
    if (!dispute) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy tranh chấp." });
    }
    if (String(dispute.status) !== "open") {
      await db.query("ROLLBACK");
      return res.status(409).json({ message: "Tranh chấp đã đóng." });
    }

    const inserted = await db.query(
      `INSERT INTO public.contract_dispute_messages (dispute_id, author_id, author_role, body, attachments)
       VALUES ($1, $2, 'admin', $3, '[]'::jsonb)
       RETURNING id, created_at`,
      [disputeId, payload.sub, body],
    );

    if (String(dispute.dispute_stage || "").toLowerCase() !== "admin_review") {
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
    console.error("postAdminDisputeMessage failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: schemaHint() });
    }
    return res.status(500).json({ message: "Không thể gửi tin nhắn." });
  } finally {
    db.release();
  }
}

async function resolveAdminDispute(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const disputeId = parseUuidParam(req.params.disputeId);
  if (!disputeId) {
    return res.status(400).json({ message: "Mã tranh chấp không hợp lệ." });
  }

  const resolution = String(req.body?.resolution || "").toLowerCase();
  const adminNote = String(req.body?.adminNote || "").trim().slice(0, 4000) || null;
  const clientAmount = Number(req.body?.clientAmount);
  const freelancerAmount = Number(req.body?.freelancerAmount);

  if (!["full_refund", "release", "dismiss", "split"].includes(resolution)) {
    return res.status(400).json({
      message: "Quyết định không hợp lệ. Chọn: full_refund, release, split hoặc dismiss.",
    });
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const dRes = await db.query(
      `SELECT d.*, c.*
       FROM public.contract_disputes d
       INNER JOIN public.contracts c ON c.id = d.contract_id AND c.deleted_at IS NULL
       WHERE d.id = $1 AND d.status = 'open'
       LIMIT 1`,
      [disputeId],
    );
    if (!dRes.rows[0]) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy tranh chấp đang mở." });
    }
    const row = dRes.rows[0];

    if (resolution === "full_refund") {
      await refundEscrowToClient(
        db,
        row,
        adminNote || "Admin: hoàn tiền theo tranh chấp",
        payload.sub,
      );
    } else if (resolution === "release") {
      await releasePaymentToFreelancer(db, row, payload.sub, false);
      await db.query(
        `UPDATE public.contracts
         SET status = 'completed', workflow_stage = 'completion', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [row.contract_id],
      );
    } else if (resolution === "split") {
      const total = Number(row.agreed_price) || 0;
      if (!Number.isFinite(clientAmount) || !Number.isFinite(freelancerAmount)) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Vui lòng nhập số tiền hoàn cho Khách hàng và thanh toán cho Freelancer." });
      }
      if (clientAmount < 0 || freelancerAmount < 0) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Số tiền không được âm." });
      }
      if (Math.round(clientAmount + freelancerAmount) !== Math.round(total)) {
        await db.query("ROLLBACK");
        return res.status(400).json({
          message: `Tổng chia phải bằng giá trị hợp đồng (${total}).`,
        });
      }
      if (String(row.escrow_status) !== "funded") {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Ký quỹ không còn ở trạng thái funded để chia." });
      }
      await settleCancelRefund(
        db,
        row,
        {
          client_refund_amount: clientAmount,
          freelancer_amount: freelancerAmount,
          platform_fee_amount: 0,
          split_type: "admin_split",
          legitimacy: "admin_decided",
        },
        payload.sub,
        adminNote || "Admin phân chia theo tranh chấp",
      );
    } else if (resolution === "dismiss") {
      if (String(row.issue_category || "") === "cancel_rejected") {
        await db.query("ROLLBACK");
        return res.status(409).json({
          message:
            "Không thể bác tranh chấp hủy đơn — hãy phân chia tiền, hoàn cho Khách hàng hoặc giải ngân cho Freelancer.",
        });
      }
      await db.query(
        `UPDATE public.contracts
         SET status = 'active', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [row.contract_id],
      );
    }

    await db.query(
      `UPDATE public.contract_disputes
       SET status = 'resolved',
           resolution = $1,
           dispute_stage = 'decided',
           admin_notes = $2,
           resolved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [resolution, adminNote, disputeId],
    );

    await db.query(
      `INSERT INTO public.contract_dispute_messages (dispute_id, author_id, author_role, body, attachments)
       VALUES ($1, $2, 'system', $3, '[]'::jsonb)`,
      [
        disputeId,
        payload.sub,
        `Quản trị viên đã đóng tranh chấp — quyết định: ${resolution}.${adminNote ? ` Ghi chú: ${adminNote}` : ""}`,
      ],
    );

    await logWorkflowEvent(db, row.contract_id, "dispute_resolved", { resolution, adminNote }, payload.sub);
    await db.query("COMMIT");

    return res.json({
      message: "Đã xử lý tranh chấp.",
      resolution,
      disputeId,
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("resolveAdminDispute failed:", error.message);
    return res.status(500).json({ message: error.message || "Không thể xử lý tranh chấp." });
  } finally {
    db.release();
  }
}

module.exports = {
  listAdminDisputes,
  getAdminDisputeDetail,
  postAdminDisputeMessage,
  resolveAdminDispute,
};
