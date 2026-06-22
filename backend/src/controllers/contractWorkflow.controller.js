const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { parseUuidParam } = require("../utils/validators");
const { buildDefaultServicePackages } = require("../utils/validators");
const {
  isClientIdentityVerified: checkClientIdentityVerified,
  IDV_VERIFY_SELECT,
  queryClientIdentityVerified,
  IDENTITY_NOT_VERIFIED_PAYMENT_MESSAGE,
} = require("../utils/clientIdentityVerified");
const {
  SLA_DAYS,
  addDays,
  isTerminalContract,
  isPreFunded,
  logWorkflowEvent,
  setStageDeadline,
  clearStageDeadlines,
  setEscrowDeadlines,
  markContractCancelled,
  closeJobIfAny,
  refundEscrowToClient,
  settleCancelRefund,
  releasePaymentToFreelancer,
  acceptDeliveryInternal,
  loadPendingCancelRequest,
  loadOpenDispute,
  openCancelRejectionDispute,
} = require("../utils/workflowSla");
const { computeRefundSettlement } = require("../utils/refundSettlement");
const {
  notifyWorkflowAction,
  notifyServiceOrderCreated,
} = require("../utils/notificationService");

const WORKFLOW_STAGES = ["selection", "escrow", "execution", "delivery", "completion"];

function fireWorkflowNotification(db, contract, action, actorId, extra = {}) {
  notifyWorkflowAction(db, contract, action, actorId, extra).catch((err) =>
    console.error(`notifyWorkflowAction ${action}:`, err.message),
  );
}

function terminalResponse(res) {
  return res.status(409).json({ message: "Đơn đã hủy, hết hạn hoặc đã kết thúc — không thể thực hiện thao tác này." });
}

const REFUND_PENDING_MESSAGE =
  "Đơn đang tạm dừng — chờ xử lý yêu cầu hoàn tiền. Freelancer cần phản hồi (đồng ý hoặc phản đối) trước khi tiếp tục công việc.";

async function rejectIfPendingCancelRequest(db, contractId, res) {
  const pending = await loadPendingCancelRequest(db, contractId);
  if (pending) {
    await db.query("ROLLBACK");
    res.status(409).json({
      message: REFUND_PENDING_MESSAGE,
      code: "REFUND_PENDING",
    });
    return true;
  }
  return false;
}

async function ensureClientPaymentAllowed(db, isClient, userId, res) {
  if (!isClient) return true;
  const verified = await queryClientIdentityVerified(db, userId);
  if (verified) return true;
  await db.query("ROLLBACK");
  res.status(403).json({
    message: IDENTITY_NOT_VERIFIED_PAYMENT_MESSAGE,
    code: "IDENTITY_NOT_VERIFIED",
  });
  return false;
}

function dbSchemaMigrationHint(error) {
  const msg = String(error?.message || "").toLowerCase();
  if (msg.includes("accounts") && msg.includes("updated_at")) {
    return "Chạy backend/sql/client_billing_payments.sql trên PostgreSQL.";
  }
  if (msg.includes("contract_milestones") || msg.includes("workflow_stage") || msg.includes("escrow_status")) {
    return "Chạy backend/sql/service_order_workflow.sql trên PostgreSQL.";
  }
  if (msg.includes("stage_deadline_at") || msg.includes("contract_cancel_requests")) {
    return "Chạy backend/sql/workflow_sla.sql trên PostgreSQL.";
  }
  if (msg.includes("contract_progress_entries")) {
    return "Chạy backend/sql/contract_progress_history.sql trên PostgreSQL.";
  }
  if (msg.includes("contract_dispute_messages") || msg.includes("dispute_stage") || msg.includes("reason_code")) {
    return "Chạy backend/sql/refund_dispute_center.sql trên PostgreSQL.";
  }
  if (msg.includes("last_rejected_proposal_text") || msg.includes("proposal_rejection_note")) {
    return "Chạy backend/sql/proposal_rejection_snapshot.sql trên PostgreSQL.";
  }
  if (msg.includes("client_refund_amount") || msg.includes("split_type")) {
    return "Chạy backend/sql/refund_settlement.sql trên PostgreSQL.";
  }
  if (msg.includes("transactions_category_check") || msg.includes("transactions_category")) {
    return "Chạy backend/sql/transactions_refund_categories.sql trên PostgreSQL.";
  }
  return "Chạy backend/sql/service_order_workflow.sql, client_billing_payments.sql và workflow_sla.sql trên PostgreSQL.";
}

async function isClientIdentityVerified(db, userId) {
  const result = await db.query(
    `SELECT ${IDV_VERIFY_SELECT}
     FROM public.users u
     LEFT JOIN public.identity_verifications iv ON iv.user_id = u.id
     LEFT JOIN public.user_profiles up ON up.user_id = u.id
     WHERE u.id = $1 AND u.deleted_at IS NULL
     LIMIT 1`,
    [userId],
  );
  if (result.rowCount === 0) return false;
  const row = result.rows[0];
  return checkClientIdentityVerified(row, {
    phone: row.profile_phone,
    avatar_url: row.profile_avatar_url,
  });
}

function parsePackages(raw, basePrice, deliveryDays) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }
  const normalized = list
    .map((pack) => ({
      id: String(pack?.id || "").trim().toLowerCase(),
      name: String(pack?.name || "").trim(),
      price: Number(pack?.price),
      deliveryDays: Number(pack?.deliveryDays ?? pack?.delivery_days),
      revisions: String(pack?.revisions || "").trim(),
      features: Array.isArray(pack?.features)
        ? pack.features.map((f) => String(f || "").trim()).filter(Boolean)
        : [],
    }))
    .filter((p) => p.id && p.name && Number.isFinite(p.price) && p.price > 0);
  if (normalized.length) return normalized;
  return buildDefaultServicePackages(basePrice, deliveryDays);
}

function parseRevisionLimit(revisionsText) {
  const match = String(revisionsText || "").match(/(\d+)/);
  if (match) return Math.min(20, Math.max(0, Number.parseInt(match[1], 10)));
  return 2;
}

function contractHasUnlimitedRevisions(contract) {
  return Boolean(contract.job_id) && !contract.service_id;
}

function defaultMilestones(totalPrice) {
  const total = Number(totalPrice) || 0;
  const p1 = Math.round(total * 0.3);
  const p2 = Math.round(total * 0.4);
  const p3 = Math.max(0, total - p1 - p2);
  return [
    { title: "Thiết kế / Phân tích yêu cầu", amount: p1, sort_order: 1 },
    { title: "Phát triển & triển khai", amount: p2, sort_order: 2 },
    { title: "Kiểm thử & bàn giao", amount: p3, sort_order: 3 },
  ];
}

async function createFromServiceQuote(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng mới có thể gửi yêu cầu báo giá." });
  }

  const serviceId = parseUuidParam(req.body?.serviceId);
  const packageId = String(req.body?.packageId || "").trim().toLowerCase();
  const clientBrief = String(req.body?.clientBrief || "").trim().slice(0, 8000);
  const milestonesInput = Array.isArray(req.body?.milestones) ? req.body.milestones : [];

  if (!serviceId || !packageId) {
    return res.status(400).json({ message: "Thiếu dịch vụ hoặc gói đã chọn." });
  }
  if (!clientBrief) {
    return res.status(400).json({ message: "Mô tả yêu cầu là bắt buộc." });
  }

  const db = await pool.connect();
  try {
    const verified = await isClientIdentityVerified(db, payload.sub);
    if (!verified) {
      return res.status(403).json({
        message:
          "Hoàn tất xác minh danh tính trước khi thuê dịch vụ. Vào Tài khoản → Xác minh danh tính.",
        code: "IDENTITY_NOT_VERIFIED",
      });
    }

    await db.query("BEGIN");

    const svcRes = await db.query(
      `SELECT s.id, s.title, s.description, s.price, s.delivery_days, s.packages, s.freelancer_id
       FROM public.services s
       INNER JOIN public.users u ON u.id = s.freelancer_id AND u.deleted_at IS NULL AND u.role = 'freelancer'
       WHERE s.id = $1
       LIMIT 1`,
      [serviceId],
    );
    if (svcRes.rowCount === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy dịch vụ." });
    }
    const svc = svcRes.rows[0];
    const packages = parsePackages(svc.packages, svc.price, svc.delivery_days);
    const selected = packages.find((p) => p.id === packageId);
    if (!selected) {
      await db.query("ROLLBACK");
      return res.status(400).json({ message: "Gói dịch vụ không hợp lệ." });
    }

    const jobRes = await db.query(
      `INSERT INTO public.jobs (client_id, title, description, budget, status, category)
       VALUES ($1, $2, $3, $4, 'open', $5)
       RETURNING id`,
      [
        payload.sub,
        `${svc.title} — ${selected.name}`,
        clientBrief,
        selected.price,
        "Service Order",
      ],
    );
    const jobId = jobRes.rows[0].id;

    const contractRes = await db.query(
      `INSERT INTO public.contracts (
         job_id, service_id, client_id, freelancer_id, agreed_price, status,
         workflow_stage, escrow_status, package_snapshot, client_brief, revisions_limit
       )
       VALUES ($1, $2, $3, $4, $5, 'pending', 'selection', 'none', $6::jsonb, $7, $8)
       RETURNING id`,
      [
        jobId,
        serviceId,
        payload.sub,
        svc.freelancer_id,
        selected.price,
        JSON.stringify(selected),
        clientBrief,
        parseRevisionLimit(selected.revisions),
      ],
    );
    const contractId = contractRes.rows[0].id;

    let milestones = milestonesInput
      .map((m, idx) => ({
        title: String(m?.title || "").trim().slice(0, 255),
        amount: Number(m?.amount),
        sort_order: Number(m?.sort_order) || idx + 1,
      }))
      .filter((m) => m.title && Number.isFinite(m.amount) && m.amount > 0)
      .slice(0, 8);

    if (!milestones.length) {
      milestones = defaultMilestones(selected.price);
    }

    for (const m of milestones) {
      await db.query(
        `INSERT INTO public.contract_milestones (contract_id, title, amount, sort_order, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [contractId, m.title, m.amount, m.sort_order],
      );
    }

    await setStageDeadline(db, contractId, SLA_DAYS.AWAIT_PROPOSAL);
    await logWorkflowEvent(db, contractId, "order_created", { slaDays: SLA_DAYS.AWAIT_PROPOSAL }, payload.sub);

    await db.query("COMMIT");
    notifyServiceOrderCreated(
      db,
      { id: contractId, freelancer_id: svc.freelancer_id },
      svc.title,
      payload.sub,
    ).catch((err) => console.error("notifyServiceOrderCreated:", err.message));
    return res.status(201).json({
      message: "Đã gửi yêu cầu báo giá. Freelancer sẽ phản hồi đề xuất.",
      contractId,
      jobId,
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("createFromServiceQuote failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: dbSchemaMigrationHint(error) });
    }
    return res.status(500).json({ message: "Không thể tạo yêu cầu báo giá." });
  } finally {
    db.release();
  }
}

async function countProgressEntries(db, contractId) {
  try {
    const res = await db.query(
      `SELECT COUNT(*)::int AS n
       FROM public.contract_progress_entries
       WHERE contract_id = $1 AND entry_type = 'progress'`,
      [contractId],
    );
    return res.rows[0]?.n ?? 0;
  } catch (err) {
    if (err?.code === "42703" || err?.code === "42P01") return 0;
    throw err;
  }
}

async function loadWorkflowContract(db, contractId, userId) {
  const res = await db.query(
    `SELECT c.*,
            j.title AS job_title,
            s.title AS service_title,
            cup.full_name AS client_name,
            fup.full_name AS freelancer_name,
            fu.email AS freelancer_email
     FROM public.contracts c
     LEFT JOIN public.jobs j ON j.id = c.job_id
     LEFT JOIN public.services s ON s.id = c.service_id
     LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
     LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
     LEFT JOIN public.users fu ON fu.id = c.freelancer_id
     WHERE c.id = $1 AND c.deleted_at IS NULL
       AND (c.client_id = $2 OR c.freelancer_id = $2)
     LIMIT 1`,
    [contractId, userId],
  );
  return res.rows[0] || null;
}

async function loadProgressEntries(db, contractId) {
  const res = await db.query(
    `SELECT e.id,
            e.entry_type,
            e.note,
            e.demo_url,
            e.created_at,
            e.actor_id,
            up.full_name AS actor_name,
            u.role AS actor_role
     FROM public.contract_progress_entries e
     LEFT JOIN public.users u ON u.id = e.actor_id
     LEFT JOIN public.user_profiles up ON up.user_id = e.actor_id
     WHERE e.contract_id = $1
     ORDER BY e.created_at ASC`,
    [contractId],
  );
  return res.rows;
}

async function insertProgressEntry(db, contractId, entryType, note, demoUrl, actorId) {
  await db.query(
    `INSERT INTO public.contract_progress_entries (contract_id, entry_type, note, demo_url, actor_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [contractId, entryType, note, demoUrl, actorId],
  );
}

async function getContractWorkflow(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const contractId = parseUuidParam(req.params.contractId);
  if (!contractId) {
    return res.status(400).json({ message: "Mã hợp đồng không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const contract = await loadWorkflowContract(db, contractId, payload.sub);
    if (!contract) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    const milestones = await db.query(
      `SELECT id, title, amount, sort_order, status, note, created_at, updated_at
       FROM public.contract_milestones
       WHERE contract_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [contractId],
    );

    let review = null;
    if (payload.role === "client" || payload.role === "freelancer") {
      const rev = await db.query(
        `SELECT id, rating, comment, created_at
         FROM public.contract_reviews
         WHERE contract_id = $1
         LIMIT 1`,
        [contractId],
      );
      review = rev.rows[0] || null;
    }

    const role =
      contract.client_id === payload.sub
        ? "client"
        : contract.freelancer_id === payload.sub
          ? "freelancer"
          : null;

    const cancelRequest = await loadPendingCancelRequest(db, contractId);
    const dispute = await loadOpenDispute(db, contractId);
    const progressHistory = await loadProgressEntries(db, contractId);

    return res.json({
      contract,
      milestones: milestones.rows,
      review,
      role,
      stages: WORKFLOW_STAGES,
      cancelRequest,
      dispute,
      progressHistory,
    });
  } catch (error) {
    console.error("getContractWorkflow failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: dbSchemaMigrationHint(error) });
    }
    return res.status(500).json({ message: "Không thể tải tiến trình đơn hàng." });
  } finally {
    db.release();
  }
}

async function patchContractWorkflow(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const contractId = parseUuidParam(req.params.contractId);
  if (!contractId) {
    return res.status(400).json({ message: "Mã hợp đồng không hợp lệ." });
  }

  const action = String(req.body?.action || "").trim();
  const db = await pool.connect();

  try {
    await db.query("BEGIN");
    const contract = await loadWorkflowContract(db, contractId, payload.sub);
    if (!contract) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }

    const isClient = contract.client_id === payload.sub;
    const isFreelancer = contract.freelancer_id === payload.sub;
    const stage = String(contract.workflow_stage || "selection").toLowerCase();

    const skipTerminalCheck = new Set([
      "respond_cancel_request",
    ]);
    if (!skipTerminalCheck.has(action) && isTerminalContract(contract)) {
      await db.query("ROLLBACK");
      return terminalResponse(res);
    }

    if (action === "submit_proposal") {
      if (!isFreelancer) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ freelancer gửi đề xuất." });
      }
      if (stage !== "selection") {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Không ở giai đoạn chốt thỏa thuận." });
      }
      const proposalText = String(req.body?.proposalText || "").trim().slice(0, 8000);
      const proposalBudget =
        req.body?.proposalBudget !== undefined && req.body?.proposalBudget !== ""
          ? Number(req.body.proposalBudget)
          : contract.agreed_price;
      if (!proposalText) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Nội dung đề xuất là bắt buộc." });
      }
      await db.query(
        `UPDATE public.contracts
         SET proposal_text = $1,
             proposal_budget = $2,
             proposal_submitted_at = CURRENT_TIMESTAMP,
             last_rejected_proposal_text = NULL,
             last_rejected_proposal_at = NULL,
             proposal_rejection_note = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [proposalText, proposalBudget, contractId],
      );
      await setStageDeadline(db, contractId, SLA_DAYS.AWAIT_ACCEPT);
      await logWorkflowEvent(db, contractId, "proposal_submitted", {}, payload.sub);
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "submit_proposal", payload.sub);
      return res.json({ message: "Đã gửi đề xuất cho Khách hàng." });
    }

    if (action === "withdraw_proposal") {
      if (!isFreelancer) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ freelancer rút đề xuất." });
      }
      if (stage !== "selection" || !contract.proposal_text) {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Không có đề xuất để rút." });
      }
      await db.query(
        `UPDATE public.contracts
         SET proposal_text = NULL, proposal_budget = NULL, proposal_submitted_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [contractId],
      );
      await setStageDeadline(db, contractId, SLA_DAYS.AWAIT_PROPOSAL);
      await logWorkflowEvent(db, contractId, "proposal_withdrawn", {}, payload.sub);
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "withdraw_proposal", payload.sub);
      return res.json({ message: "Đã rút đề xuất. Bạn có thể gửi lại." });
    }

    if (action === "reject_proposal") {
      if (!isClient) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ khách hàng từ chối đề xuất." });
      }
      if (stage !== "selection" || !contract.proposal_text) {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Không có đề xuất để từ chối." });
      }
      const note = String(req.body?.reason || "").trim().slice(0, 2000);
      const rejectedText = contract.proposal_text;
      await db.query(
        `UPDATE public.contracts
         SET proposal_text = NULL,
             proposal_budget = NULL,
             proposal_submitted_at = NULL,
             last_rejected_proposal_text = $2,
             last_rejected_proposal_at = CURRENT_TIMESTAMP,
             proposal_rejection_note = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [contractId, rejectedText, note || null],
      );
      await setStageDeadline(db, contractId, SLA_DAYS.AWAIT_PROPOSAL);
      await logWorkflowEvent(
        db,
        contractId,
        "proposal_rejected",
        {
          note,
          proposalText: rejectedText,
          proposalBudget: contract.proposal_budget,
        },
        payload.sub,
      );
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "reject_proposal", payload.sub, { rejectionNote: note });
      return res.json({ message: "Đã từ chối đề xuất. Freelancer có thể gửi đề xuất mới." });
    }

    if (action === "cancel_order") {
      if (!isPreFunded(contract)) {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Không thể hủy — ký quỹ đã được nạp." });
      }
      if (stage !== "selection" && stage !== "escrow") {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Chỉ hủy được ở giai đoạn chốt thỏa thuận hoặc ký quỹ (chưa nạp)." });
      }
      const reason = String(req.body?.reason || "").trim().slice(0, 2000);
      const cancelType = isClient ? "rejected" : "withdrawn";
      await markContractCancelled(db, contractId, {
        by: payload.sub,
        type: cancelType,
        reason: reason || "Hủy đơn trước khi nạp ký quỹ",
      });
      await closeJobIfAny(db, contract.job_id);
      await logWorkflowEvent(db, contractId, "order_cancelled", { cancelType, reason }, payload.sub);
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "cancel_order", payload.sub);
      return res.json({ message: "Đã hủy đơn. Không ảnh hưởng uy tín (chưa nạp ký quỹ)." });
    }

    if (action === "accept_proposal") {
      if (!isClient) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ khách hàng chấp nhận đề xuất." });
      }
      if (!contract.proposal_text) {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Freelancer chưa gửi đề xuất." });
      }
      await db.query(
        `UPDATE public.contracts
         SET agreed_price = COALESCE(proposal_budget, agreed_price), updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [contractId],
      );
      await setEscrowDeadlines(db, contractId);
      await logWorkflowEvent(db, contractId, "proposal_accepted", {}, payload.sub);
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "accept_proposal", payload.sub);
      return res.json({ message: "Đã chấp nhận đề xuất. Tiếp theo: nạp ký quỹ (Escrow)." });
    }

    if (action === "fund_escrow") {
      if (!isClient) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ khách hàng nạp ký quỹ." });
      }
      if (!(await ensureClientPaymentAllowed(db, isClient, payload.sub, res))) {
        return;
      }
      if (stage !== "escrow") {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Chưa sẵn sàng nạp ký quỹ." });
      }
      const amount = Number(contract.agreed_price) || 0;
      const acc = await db.query(
        `SELECT id, balance FROM public.accounts WHERE user_id = $1 AND currency = 'VND' LIMIT 1`,
        [payload.sub],
      );
      const balance = Number(acc.rows[0]?.balance) || 0;
      if (balance < amount) {
        await db.query("ROLLBACK");
        return res.status(402).json({
          message: `Số dư không đủ (cần ${amount}, hiện có ${balance}). Nạp thêm tại trang Thanh toán.`,
          code: "INSUFFICIENT_BALANCE",
        });
      }
      await db.query(
        `UPDATE public.accounts SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND currency = 'VND'`,
        [amount, payload.sub],
      );
      await db.query(
        `UPDATE public.contracts
         SET escrow_status = 'funded', workflow_stage = 'execution', status = 'active',
             funded_at = CURRENT_TIMESTAMP, start_date = COALESCE(start_date, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [contractId],
      );
      await clearStageDeadlines(db, contractId);
      await db.query(
        `UPDATE public.contract_milestones SET status = 'funded', updated_at = CURRENT_TIMESTAMP
         WHERE contract_id = $1 AND status = 'pending'`,
        [contractId],
      );
      await logWorkflowEvent(db, contractId, "escrow_funded", { amount }, payload.sub);
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "fund_escrow", payload.sub);
      return res.json({ message: "Đã nạp ký quỹ. Freelancer có thể bắt đầu làm việc." });
    }

    if (action === "update_progress") {
      if (!isFreelancer) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ freelancer cập nhật tiến độ." });
      }
      if (await rejectIfPendingCancelRequest(db, contractId, res)) return;
      const progressNote = String(req.body?.progressNote || "").trim().slice(0, 4000);
      const demoUrl = String(req.body?.demoUrl || "").trim().slice(0, 2000) || null;
      if (!progressNote && !demoUrl) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Cần ghi chú tiến độ hoặc link demo." });
      }
      await insertProgressEntry(
        db,
        contractId,
        "progress",
        progressNote || "Đã cập nhật link demo.",
        demoUrl,
        payload.sub,
      );
      await db.query(
        `UPDATE public.contracts
         SET progress_note = $1, demo_url = COALESCE($2, demo_url), updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [progressNote || contract.progress_note, demoUrl, contractId],
      );
      await db.query(
        `UPDATE public.contract_milestones SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
         WHERE contract_id = $1 AND status = 'funded'`,
        [contractId],
      );
      await logWorkflowEvent(
        db,
        contractId,
        "progress_updated",
        { progressNote, demoUrl },
        payload.sub,
      );
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "update_progress", payload.sub);
      return res.json({ message: "Đã cập nhật tiến độ." });
    }

    if (action === "request_revision") {
      if (!isClient) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ khách hàng yêu cầu chỉnh sửa." });
      }
      if (await rejectIfPendingCancelRequest(db, contractId, res)) return;
      const used = Number(contract.revisions_used) || 0;
      const limit = Number(contract.revisions_limit) || 2;
      if (!contractHasUnlimitedRevisions(contract) && used >= limit) {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Đã hết lượt chỉnh sửa trong gói." });
      }
      const note = String(req.body?.revisionNote || "").trim().slice(0, 2000);
      if (!note) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Vui lòng mô tả yêu cầu chỉnh sửa." });
      }
      await insertProgressEntry(db, contractId, "revision", note, null, payload.sub);
      await db.query(
        `UPDATE public.contracts
         SET revisions_used = revisions_used + 1,
             revision_requested_at = CURRENT_TIMESTAMP,
             delivery_review_deadline_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [contractId],
      );
      await logWorkflowEvent(db, contractId, "revision_requested", { note }, payload.sub);
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "request_revision", payload.sub);
      return res.json({ message: "Đã gửi yêu cầu chỉnh sửa. Đồng hồ tự nghiệm thu tạm dừng." });
    }

    if (action === "mark_delivered") {
      if (!isFreelancer) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ freelancer bàn giao." });
      }
      if (await rejectIfPendingCancelRequest(db, contractId, res)) return;
      if (stage !== "execution") {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Chỉ bàn giao được ở giai đoạn thực hiện." });
      }
      const deliveredAt = contract.delivered_at ? new Date(contract.delivered_at) : new Date();
      const reviewDeadline = addDays(deliveredAt, SLA_DAYS.DELIVERY_REVIEW);
      await db.query(
        `UPDATE public.contracts
         SET delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP),
             delivery_review_deadline_at = $2,
             revision_requested_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [contractId, reviewDeadline],
      );
      await db.query(
        `UPDATE public.contract_milestones SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
         WHERE contract_id = $1 AND status IN ('funded', 'in_progress')`,
        [contractId],
      );
      await logWorkflowEvent(db, contractId, "marked_delivered", { reviewDeadline }, payload.sub);
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "mark_delivered", payload.sub);
      return res.json({ message: "Đã gửi bàn giao. Khách hàng sẽ kiểm tra và nghiệm thu ở giai đoạn 3." });
    }

    if (action === "accept_delivery") {
      if (!isClient) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ khách hàng nghiệm thu." });
      }
      if (await rejectIfPendingCancelRequest(db, contractId, res)) return;
      if (!contract.delivered_at) {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Freelancer chưa bàn giao." });
      }
      if (!["execution", "delivery"].includes(stage)) {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Không ở giai đoạn nghiệm thu bàn giao." });
      }
      if (!(await ensureClientPaymentAllowed(db, isClient, payload.sub, res))) {
        return;
      }
      await acceptDeliveryInternal(db, contract, payload.sub, false);
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "accept_delivery", payload.sub);
      return res.json({ message: "Đã nghiệm thu. Bạn có thể giải ngân và đánh giá." });
    }

    if (action === "request_cancel_refund") {
      if (!isClient) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ khách hàng yêu cầu hủy và hoàn tiền." });
      }
      if (!(await ensureClientPaymentAllowed(db, isClient, payload.sub, res))) {
        return;
      }
      if (String(contract.escrow_status) !== "funded") {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Chỉ áp dụng khi đã nạp ký quỹ." });
      }
      if (!["escrow", "execution", "delivery"].includes(stage)) {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Không thể yêu cầu hoàn tiền ở giai đoạn này." });
      }
      const existing = await loadPendingCancelRequest(db, contractId);
      if (existing) {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Đã có yêu cầu hủy đang chờ xử lý." });
      }
      const reasonCode = String(req.body?.reasonCode || "").trim().slice(0, 64) || null;
      const detail = String(req.body?.detail || "").trim().slice(0, 2000) || null;
      const refundMethod = "wallet";
      const reasonLegacy = String(req.body?.reason || "").trim().slice(0, 2000);
      const reasonLabel = reasonLegacy || detail || reasonCode || "Yêu cầu hủy";
      if (!reasonCode && !reasonLegacy && !detail) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Vui lòng chọn lý do hủy." });
      }
      if (reasonCode === "other" && !detail) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Vui lòng mô tả lý do khác." });
      }
      if (reasonCode === "other" && detail.length < 10) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Lý do khác cần ít nhất 10 ký tự." });
      }

      const progressCount = await countProgressEntries(db, contractId);
      const hasProgress = progressCount > 0 || Boolean(contract.progress_note?.trim());
      const settlement = computeRefundSettlement({
        agreedPrice: contract.agreed_price,
        workflowStage: stage,
        hasProgress,
        reasonCode,
      });

      const respondBy = addDays(new Date(), SLA_DAYS.CANCEL_RESPONSE);
      await db.query(
        `INSERT INTO public.contract_cancel_requests (
           contract_id, requested_by, reason, reason_code, detail, refund_method, respond_by_at,
           legitimacy, split_type, penalty_percent, work_done_percent,
           client_refund_amount, freelancer_amount, platform_fee_amount,
           workflow_stage_at_request, had_progress_at_request
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          contractId,
          payload.sub,
          reasonLabel,
          reasonCode,
          detail,
          refundMethod,
          respondBy,
          settlement.legitimacy,
          settlement.splitType,
          settlement.penaltyPercent,
          settlement.workDonePercent,
          settlement.clientAmount,
          settlement.freelancerAmount,
          settlement.platformFeeAmount,
          stage,
          hasProgress,
        ],
      );
      await logWorkflowEvent(
        db,
        contractId,
        "cancel_refund_requested",
        {
          reason: reasonLabel,
          reasonCode,
          detail,
          refundMethod,
          respondBy,
          settlement,
        },
        payload.sub,
      );
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "request_cancel_refund", payload.sub);
      return res.json({
        message: `Đã gửi yêu cầu hủy. Freelancer có ${SLA_DAYS.CANCEL_RESPONSE} ngày để phản hồi.`,
      });
    }

    if (action === "respond_cancel_request") {
      if (!isFreelancer) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ freelancer phản hồi yêu cầu hủy." });
      }
      const pending = await loadPendingCancelRequest(db, contractId);
      if (!pending) {
        await db.query("ROLLBACK");
        return res.status(404).json({ message: "Không có yêu cầu hủy đang chờ." });
      }
      const agree = Boolean(req.body?.agree);
      const responseNote = String(req.body?.responseNote || "").trim().slice(0, 2000);
      if (agree) {
        await db.query(
          `UPDATE public.contract_cancel_requests
           SET status = 'approved', freelancer_response = $1, resolved_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [responseNote || "Đồng ý hủy", pending.id],
        );
        const fullPending = (
          await db.query(`SELECT * FROM public.contract_cancel_requests WHERE id = $1`, [pending.id])
        ).rows[0];
        await settleCancelRefund(
          db,
          contract,
          fullPending || pending,
          payload.sub,
          pending.reason,
        );
      } else {
        await db.query(
          `UPDATE public.contract_cancel_requests
           SET status = 'rejected', freelancer_response = $1, resolved_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [responseNote || "Phản đối yêu cầu hủy", pending.id],
        );
        const fullPending = (
          await db.query(`SELECT * FROM public.contract_cancel_requests WHERE id = $1`, [pending.id])
        ).rows[0];
        const disputeId = await openCancelRejectionDispute(
          db,
          contract,
          fullPending || pending,
          payload.sub,
          responseNote,
        );
        await logWorkflowEvent(
          db,
          contractId,
          "cancel_refund_rejected",
          { responseNote, disputeId },
          payload.sub,
        );
      }
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "respond_cancel_request", payload.sub, { agree });
      if (!agree) {
        fireWorkflowNotification(db, contract, "cancel_rejection_dispute", payload.sub, {
          evidenceDays: SLA_DAYS.DISPUTE_EVIDENCE,
        });
      }
      return res.json({
        message: agree
          ? "Đã đồng ý hủy và hoàn tiền cho Khách hàng."
          : "Đã phản đối — đơn chuyển sang tranh chấp. Admin sẽ phán xử chia tiền.",
      });
    }

    if (action === "open_dispute") {
      if (await rejectIfPendingCancelRequest(db, contractId, res)) return;
      const issueCategory = String(req.body?.issueCategory || "").trim().slice(0, 64);
      const desiredResolution = String(req.body?.desiredResolution || "").trim().slice(0, 64);
      const resolutionNote = String(req.body?.resolutionNote || "").trim().slice(0, 2000);
      const detail = String(req.body?.detail || req.body?.reason || "").trim().slice(0, 4000);
      if (!issueCategory) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Vui lòng chọn phân loại vấn đề." });
      }
      if (!desiredResolution) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Vui lòng chọn yêu cầu xử lý." });
      }
      if (!detail) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Vui lòng mô tả tranh chấp." });
      }
      const evidenceUrls = Array.isArray(req.body?.evidenceUrls)
        ? req.body.evidenceUrls.map((u) => String(u).trim()).filter(Boolean).slice(0, 6)
        : [];
      if (!evidenceUrls.length) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Cần tải lên ít nhất một bằng chứng." });
      }
      const open = await loadOpenDispute(db, contractId);
      if (open) {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Đã có tranh chấp đang mở." });
      }
      const evidence = {
        files: evidenceUrls,
        issueCategory,
        desiredResolution,
        detail,
      };
      const respondBy = addDays(new Date(), SLA_DAYS.CANCEL_RESPONSE);
      const openerRole = isClient ? "client" : isFreelancer ? "freelancer" : "client";
      const disputeRes = await db.query(
        `INSERT INTO public.contract_disputes (
           contract_id, opened_by, reason, evidence,
           issue_category, desired_resolution, desired_resolution_note,
           dispute_stage, respond_by_at
         )
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, 'awaiting_response', $8)
         RETURNING id`,
        [
          contractId,
          payload.sub,
          detail,
          JSON.stringify(evidence),
          issueCategory,
          desiredResolution,
          resolutionNote || null,
          respondBy,
        ],
      );
      const disputeId = disputeRes.rows[0].id;
      await db.query(
        `INSERT INTO public.contract_dispute_messages (dispute_id, author_id, author_role, body, attachments)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          disputeId,
          payload.sub,
          openerRole,
          detail,
          JSON.stringify(evidenceUrls),
        ],
      );
      await db.query(
        `UPDATE public.contracts SET status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [contractId],
      );
      await logWorkflowEvent(
        db,
        contractId,
        "dispute_opened",
        { issueCategory, desiredResolution, detail, disputeId },
        payload.sub,
      );
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "open_dispute", payload.sub);
      return res.json({
        message: "Đã mở tranh chấp. Vào Xử lý tranh chấp để theo dõi và trao đổi.",
        disputeId,
      });
    }

    if (action === "release_payment") {
      if (!isClient) {
        await db.query("ROLLBACK");
        return res.status(403).json({ message: "Chỉ khách hàng giải ngân." });
      }
      if (!(await ensureClientPaymentAllowed(db, isClient, payload.sub, res))) {
        return;
      }
      if (String(contract.escrow_status) !== "funded" && String(contract.escrow_status) !== "released") {
        await db.query("ROLLBACK");
        return res.status(409).json({ message: "Ký quỹ chưa được nạp hoặc đã giải ngân." });
      }
      if (String(contract.escrow_status) === "funded") {
        await releasePaymentToFreelancer(db, contract, payload.sub, false);
      }
      await db.query("COMMIT");
      fireWorkflowNotification(db, contract, "release_payment", payload.sub);
      return res.json({ message: "Đã giải ngân cho Freelancer." });
    }

    await db.query("ROLLBACK");
    return res.status(400).json({ message: "Hành động không hợp lệ." });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("patchContractWorkflow failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: dbSchemaMigrationHint(error) });
    }
    return res.status(500).json({ message: "Không thể cập nhật đơn hàng." });
  } finally {
    db.release();
  }
}

async function listServiceOrders(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const db = await pool.connect();

  try {
    const result = await db.query(
      `SELECT
         c.id,
         c.job_id,
         c.service_id,
         c.agreed_price,
         c.status,
         c.workflow_stage,
         c.escrow_status,
         c.package_snapshot,
         c.client_brief,
         c.proposal_text,
         c.proposal_submitted_at,
         c.progress_note,
         c.demo_url,
         c.delivered_at,
         c.funded_at,
         c.released_at,
         c.created_at,
         c.updated_at,
         c.stage_deadline_at,
         c.escrow_deadline_at,
         c.cancel_type,
         c.cancel_reason,
         c.cancelled_at,
         c.delivery_review_deadline_at,
         c.auto_accepted_at,
         s.title AS service_title,
         j.title AS job_title,
         CASE
           WHEN c.client_id = $1 THEN fup.full_name
           ELSE cup.full_name
         END AS counterparty_name,
         CASE
           WHEN c.client_id = $1 THEN fup.avatar_url
           ELSE cup.avatar_url
         END AS counterparty_avatar_url,
         CASE
           WHEN c.client_id = $1 THEN 'client'
           ELSE 'freelancer'
         END AS viewer_role
       FROM public.contracts c
       LEFT JOIN public.services s ON s.id = c.service_id
       LEFT JOIN public.jobs j ON j.id = c.job_id
       LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
       LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
       WHERE c.deleted_at IS NULL
         AND (c.client_id = $1 OR c.freelancer_id = $1)
       ORDER BY c.updated_at DESC, c.created_at DESC
       LIMIT 100`,
      [userId],
    );

    return res.json({ orders: result.rows, role: payload.role });
  } catch (error) {
    console.error("listServiceOrders failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({ message: dbSchemaMigrationHint(error) });
    }
    return res.status(500).json({ message: "Không thể tải danh sách đơn dịch vụ." });
  } finally {
    db.release();
  }
}

module.exports = {
  createFromServiceQuote,
  getContractWorkflow,
  patchContractWorkflow,
  listServiceOrders,
};
