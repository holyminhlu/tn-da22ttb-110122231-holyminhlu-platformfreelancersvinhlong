/** SLA & automation cho luồng đơn dịch vụ 5 giai đoạn */

const SLA_DAYS = {
  AWAIT_PROPOSAL: 7,
  AWAIT_ACCEPT: 7,
  AWAIT_ESCROW: 5,
  /** Freelancer phản hồi yêu cầu hủy — sau đó auto-approve hoàn tiền */
  CANCEL_RESPONSE: 2,
  /** Bổ sung bằng chứng khi tranh chấp từ chối hủy */
  DISPUTE_EVIDENCE: 2,
  DELIVERY_REVIEW: 7,
};

function addDays(fromDate, days) {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + days);
  return d;
}

function isMissingSchemaError(err) {
  return err?.code === "42703" || err?.code === "42P01";
}

function isSkippableLedgerError(err) {
  return isMissingSchemaError(err) || err?.code === "23514";
}

function isPreFunded(contract) {
  const escrow = String(contract.escrow_status || "none").toLowerCase();
  return escrow !== "funded" && escrow !== "released";
}

function isTerminalContract(contract) {
  const status = String(contract.status || "").toLowerCase();
  if (contract.cancel_type) return true;
  if (status === "cancelled" || status === "disputed") return true;
  return false;
}

async function logWorkflowEvent(db, contractId, eventType, payload, actorId = null) {
  try {
    await db.query(
      `INSERT INTO public.contract_workflow_events (contract_id, event_type, payload, actor_id)
       VALUES ($1, $2, $3::jsonb, $4)`,
      [contractId, eventType, JSON.stringify(payload || {}), actorId],
    );
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }
}

async function setStageDeadline(db, contractId, days) {
  const at = addDays(new Date(), days);
  try {
    await db.query(
      `UPDATE public.contracts
       SET stage_deadline_at = $1,
           sla_reminder_48_sent = false,
           sla_reminder_24_sent = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [at, contractId],
    );
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }
  return at;
}

async function clearStageDeadlines(db, contractId) {
  try {
    await db.query(
      `UPDATE public.contracts
       SET stage_deadline_at = NULL,
           escrow_deadline_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [contractId],
    );
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }
}

async function setEscrowDeadlines(db, contractId) {
  const at = addDays(new Date(), SLA_DAYS.AWAIT_ESCROW);
  try {
    await db.query(
      `UPDATE public.contracts
       SET workflow_stage = 'escrow',
           stage_deadline_at = $1,
           escrow_deadline_at = $1,
           sla_reminder_48_sent = false,
           sla_reminder_24_sent = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [at, contractId],
    );
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }
}

async function markContractCancelled(db, contractId, { by, type, reason }) {
  await db.query(
    `UPDATE public.contracts
     SET status = 'cancelled',
         cancel_type = $1,
         cancel_reason = $2,
         cancelled_by = $3,
         cancelled_at = CURRENT_TIMESTAMP,
         stage_deadline_at = NULL,
         escrow_deadline_at = NULL,
         delivery_review_deadline_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [type, reason || null, by || null, contractId],
  );
}

async function closeJobIfAny(db, jobId) {
  if (!jobId) return;
  await db.query(
    `UPDATE public.jobs SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [jobId],
  );
}

async function ensureAccount(db, userId) {
  await db.query(
    `INSERT INTO public.accounts (user_id, balance, currency)
     VALUES ($1, 0, 'VND')
     ON CONFLICT (user_id, currency) DO NOTHING`,
    [userId],
  );
}

async function creditClient(db, userId, amount) {
  await ensureAccount(db, userId);
  try {
    await db.query(
      `UPDATE public.accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2 AND currency = 'VND'`,
      [amount, userId],
    );
  } catch (err) {
    if (isMissingSchemaError(err)) {
      await db.query(
        `UPDATE public.accounts SET balance = balance + $1 WHERE user_id = $2 AND currency = 'VND'`,
        [amount, userId],
      );
    } else {
      throw err;
    }
  }
}

async function recordRefundTransaction(db, userId, amount, contractId) {
  try {
    await db.query(
      `INSERT INTO public.transactions
         (user_id, amount, currency, direction, category, description, occurred_at, status, type, contract_id)
       VALUES ($1, $2, 'VND', 'in', 'refund', 'Hoàn tiền ký quỹ đơn dịch vụ', NOW(), 'completed', 'refund', $3)`,
      [userId, amount, contractId],
    );
  } catch (err) {
    if (!isSkippableLedgerError(err)) throw err;
  }
}

async function recordFreelancerCompensation(db, userId, amount, contractId, description) {
  if (amount <= 0) return;
  try {
    await db.query(
      `INSERT INTO public.transactions
         (user_id, amount, currency, direction, category, description, occurred_at, status, type, contract_id)
       VALUES ($1, $2, 'VND', 'in', 'escrow_release', $3, NOW(), 'completed', 'escrow_release', $4)`,
      [userId, amount, description || "Thanh toán hủy đơn / phần việc đã làm", contractId],
    );
  } catch (err) {
    if (!isSkippableLedgerError(err)) throw err;
  }
}

async function settleCancelRefund(db, contract, cancelRequest, actorId, reason) {
  const total = Number(contract.agreed_price) || 0;
  let clientAmount = Number(cancelRequest.client_refund_amount);
  let freelancerAmount = Number(cancelRequest.freelancer_amount);

  if (!Number.isFinite(clientAmount) || !Number.isFinite(freelancerAmount)) {
    clientAmount = total;
    freelancerAmount = 0;
  }

  if (clientAmount > 0) {
    await creditClient(db, contract.client_id, clientAmount);
    await recordRefundTransaction(db, contract.client_id, clientAmount, contract.id);
  }

  if (freelancerAmount > 0) {
    await ensureAccount(db, contract.freelancer_id);
    try {
      await db.query(
        `UPDATE public.accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND currency = 'VND'`,
        [freelancerAmount, contract.freelancer_id],
      );
    } catch (err) {
      if (isMissingSchemaError(err)) {
        await db.query(
          `UPDATE public.accounts SET balance = balance + $1 WHERE user_id = $2 AND currency = 'VND'`,
          [freelancerAmount, contract.freelancer_id],
        );
      } else {
        throw err;
      }
    }
    await recordFreelancerCompensation(
      db,
      contract.freelancer_id,
      freelancerAmount,
      contract.id,
      "Thanh toán hủy đơn / phần việc đã làm",
    );
  }

  await db.query(
    `UPDATE public.contracts
     SET escrow_status = 'refunded',
         status = 'cancelled',
         cancel_type = 'refund',
         cancel_reason = $1,
         cancelled_by = $2,
         cancelled_at = CURRENT_TIMESTAMP,
         stage_deadline_at = NULL,
         escrow_deadline_at = NULL,
         delivery_review_deadline_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [reason, actorId, contract.id],
  );
  await closeJobIfAny(db, contract.job_id);
  await logWorkflowEvent(
    db,
    contract.id,
    "escrow_refunded",
    {
      clientAmount,
      freelancerAmount,
      platformFeeAmount: cancelRequest.platform_fee_amount,
      splitType: cancelRequest.split_type,
      legitimacy: cancelRequest.legitimacy,
      reason,
    },
    actorId,
  );
}

async function refundEscrowToClient(db, contract, reason, actorId = null) {
  const amount = Number(contract.agreed_price) || 0;
  if (amount > 0) {
    await creditClient(db, contract.client_id, amount);
    await recordRefundTransaction(db, contract.client_id, amount, contract.id);
  }
  await db.query(
    `UPDATE public.contracts
     SET escrow_status = 'refunded',
         status = 'cancelled',
         cancel_type = 'refund',
         cancel_reason = $1,
         cancelled_by = $2,
         cancelled_at = CURRENT_TIMESTAMP,
         stage_deadline_at = NULL,
         escrow_deadline_at = NULL,
         delivery_review_deadline_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [reason, actorId, contract.id],
  );
  await closeJobIfAny(db, contract.job_id);
  await logWorkflowEvent(db, contract.id, "escrow_refunded", { amount, reason }, actorId);
}

async function releasePaymentToFreelancer(db, contract, actorId = null, auto = false) {
  const amount = Number(contract.agreed_price) || 0;
  if (amount > 0) {
    await ensureAccount(db, contract.freelancer_id);
    try {
      await db.query(
        `UPDATE public.accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND currency = 'VND'`,
        [amount, contract.freelancer_id],
      );
    } catch (err) {
      if (isMissingSchemaError(err)) {
        await db.query(
          `UPDATE public.accounts SET balance = balance + $1 WHERE user_id = $2 AND currency = 'VND'`,
          [amount, contract.freelancer_id],
        );
      } else {
        throw err;
      }
    }
  }
  await db.query(
    `UPDATE public.contracts
     SET escrow_status = 'released',
         released_at = COALESCE(released_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [contract.id],
  );
  await db.query(
    `UPDATE public.contract_milestones SET status = 'paid', updated_at = CURRENT_TIMESTAMP
     WHERE contract_id = $1`,
    [contract.id],
  );
  await logWorkflowEvent(
    db,
    contract.id,
    auto ? "auto_release_payment" : "release_payment",
    { amount },
    actorId,
  );
}

async function acceptDeliveryInternal(db, contract, actorId = null, auto = false) {
  await db.query(
    `UPDATE public.contracts
     SET workflow_stage = 'completion',
         accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP),
         status = 'completed',
         auto_accepted_at = CASE WHEN $2 THEN COALESCE(auto_accepted_at, CURRENT_TIMESTAMP) ELSE auto_accepted_at END,
         delivery_review_deadline_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [contract.id, auto],
  );
  await db.query(
    `UPDATE public.contract_milestones SET status = 'approved', updated_at = CURRENT_TIMESTAMP
     WHERE contract_id = $1`,
    [contract.id],
  );
  if (contract.job_id) {
    await closeJobIfAny(db, contract.job_id);
  }
  await logWorkflowEvent(
    db,
    contract.id,
    auto ? "auto_accept_delivery" : "accept_delivery",
    {},
    actorId,
  );
}

async function loadPendingCancelRequest(db, contractId) {
  try {
    const res = await db.query(
      `SELECT id, reason, status, respond_by_at, freelancer_response, created_at, requested_by
       FROM public.contract_cancel_requests
       WHERE contract_id = $1 AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [contractId],
    );
    return res.rows[0] || null;
  } catch (err) {
    if (isMissingSchemaError(err)) return null;
    throw err;
  }
}

async function loadOpenDispute(db, contractId) {
  try {
    const res = await db.query(
      `SELECT id, reason, status, evidence, created_at, opened_by, resolution, admin_notes,
              issue_category, desired_resolution, dispute_stage, respond_by_at
       FROM public.contract_disputes
       WHERE contract_id = $1 AND status = 'open'
       ORDER BY created_at DESC
       LIMIT 1`,
      [contractId],
    );
    return res.rows[0] || null;
  } catch (err) {
    if (isMissingSchemaError(err)) return null;
    throw err;
  }
}

/**
 * Khi F phản đối yêu cầu hủy: mở tranh chấp, khóa đơn (status=disputed), chờ bằng chứng & admin.
 */
async function openCancelRejectionDispute(db, contract, cancelRequest, freelancerId, responseNote) {
  const respondBy = addDays(new Date(), SLA_DAYS.DISPUTE_EVIDENCE);
  const clientDetail = String(cancelRequest.detail || cancelRequest.reason || "").trim();
  const flResponse = String(responseNote || "Phản đối — tiếp tục thực hiện").trim();
  const evidence = {
    source: "cancel_rejection",
    cancelRequestId: cancelRequest.id,
    reasonCode: cancelRequest.reason_code,
    clientReason: cancelRequest.reason,
    clientDetail: cancelRequest.detail,
    freelancerResponse: flResponse,
    files: [],
  };

  const disputeRes = await db.query(
    `INSERT INTO public.contract_disputes (
       contract_id, opened_by, reason, evidence,
       issue_category, desired_resolution, desired_resolution_note,
       dispute_stage, respond_by_at
     )
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, 'awaiting_response', $8)
     RETURNING id`,
    [
      contract.id,
      freelancerId,
      `Freelancer phản đối yêu cầu hủy: ${flResponse}`,
      JSON.stringify(evidence),
      "cancel_rejected",
      "refund_100",
      clientDetail || null,
      respondBy,
    ],
  );
  const disputeId = disputeRes.rows[0].id;

  await db.query(
    `INSERT INTO public.contract_dispute_messages (dispute_id, author_id, author_role, body, attachments)
     VALUES ($1, NULL, 'system', $2, '[]'::jsonb)`,
    [
      disputeId,
      `Client yêu cầu hủy & hoàn tiền (${cancelRequest.reason || "—"}). Freelancer phản đối. ` +
        `Cả hai bên có ${SLA_DAYS.DISPUTE_EVIDENCE} ngày để bổ sung bằng chứng. Sau đó Admin phán xử chia tiền.`,
    ],
  );
  await db.query(
    `INSERT INTO public.contract_dispute_messages (dispute_id, author_id, author_role, body, attachments)
     VALUES ($1, $2, 'client', $3, '[]'::jsonb)`,
    [disputeId, cancelRequest.requested_by, clientDetail || cancelRequest.reason || "Yêu cầu hủy & hoàn tiền"],
  );
  await db.query(
    `INSERT INTO public.contract_dispute_messages (dispute_id, author_id, author_role, body, attachments)
     VALUES ($1, $2, 'freelancer', $3, '[]'::jsonb)`,
    [disputeId, freelancerId, flResponse],
  );
  await db.query(
    `UPDATE public.contracts SET status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [contract.id],
  );
  await logWorkflowEvent(
    db,
    contract.id,
    "cancel_rejection_dispute",
    { disputeId, cancelRequestId: cancelRequest.id, respondBy },
    freelancerId,
  );
  return disputeId;
}

async function processSlaReminders(db) {
  try {
    const rows = await db.query(
      `SELECT id, stage_deadline_at, delivery_review_deadline_at, sla_reminder_48_sent, sla_reminder_24_sent
       FROM public.contracts
       WHERE deleted_at IS NULL
         AND cancel_type IS NULL
         AND status NOT IN ('cancelled', 'completed')
         AND (
           (stage_deadline_at IS NOT NULL AND stage_deadline_at > NOW())
           OR (delivery_review_deadline_at IS NOT NULL AND delivery_review_deadline_at > NOW())
         )`,
    );
    for (const row of rows.rows) {
      const deadline = row.stage_deadline_at || row.delivery_review_deadline_at;
      if (!deadline) continue;
      const msLeft = new Date(deadline).getTime() - Date.now();
      const hoursLeft = msLeft / (1000 * 60 * 60);
      if (hoursLeft <= 48 && hoursLeft > 24 && !row.sla_reminder_48_sent) {
        await logWorkflowEvent(db, row.id, "sla_reminder_48h", { deadline });
        await db.query(`UPDATE public.contracts SET sla_reminder_48_sent = true WHERE id = $1`, [row.id]);
      }
      if (hoursLeft <= 24 && hoursLeft > 0 && !row.sla_reminder_24_sent) {
        await logWorkflowEvent(db, row.id, "sla_reminder_24h", { deadline });
        await db.query(`UPDATE public.contracts SET sla_reminder_24_sent = true WHERE id = $1`, [row.id]);
      }
    }
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }
}

async function processExpiredPreEscrow(db) {
  try {
    const res = await db.query(
      `SELECT id, job_id, workflow_stage, proposal_text, client_id, freelancer_id
       FROM public.contracts
       WHERE deleted_at IS NULL
         AND cancel_type IS NULL
         AND status NOT IN ('cancelled', 'completed')
         AND stage_deadline_at IS NOT NULL
         AND stage_deadline_at < NOW()
         AND COALESCE(escrow_status, 'none') NOT IN ('funded', 'released')`,
    );
    for (const row of res.rows) {
      const reason = `Hết hạn SLA — ${row.workflow_stage === "escrow" ? "chưa nạp ký quỹ" : row.proposal_text ? "chưa chấp nhận đề xuất" : "chưa có đề xuất"}`;
      await markContractCancelled(db, row.id, { by: null, type: "expired", reason });
      await closeJobIfAny(db, row.job_id);
      await logWorkflowEvent(db, row.id, "sla_expired", { workflow_stage: row.workflow_stage, reason });
    }
    return res.rowCount;
  } catch (err) {
    if (isMissingSchemaError(err)) return 0;
    throw err;
  }
}

async function processAutoAcceptDelivery(db) {
  try {
    const res = await db.query(
      `SELECT c.*
       FROM public.contracts c
       WHERE c.deleted_at IS NULL
         AND c.cancel_type IS NULL
         AND c.workflow_stage IN ('execution', 'delivery')
         AND c.delivered_at IS NOT NULL
         AND c.accepted_at IS NULL
         AND c.delivery_review_deadline_at IS NOT NULL
         AND c.delivery_review_deadline_at < NOW()
         AND COALESCE(c.escrow_status, '') IN ('funded', 'released')`,
    );
    for (const contract of res.rows) {
      await acceptDeliveryInternal(db, contract, null, true);
      if (String(contract.escrow_status) === "funded") {
        await releasePaymentToFreelancer(db, contract, null, true);
      }
      await logWorkflowEvent(db, contract.id, "auto_accept_complete", {});
    }
    return res.rowCount;
  } catch (err) {
    if (isMissingSchemaError(err)) return 0;
    throw err;
  }
}

async function processExpiredDisputeEvidence(db) {
  try {
    const res = await db.query(
      `SELECT d.id, d.contract_id
       FROM public.contract_disputes d
       INNER JOIN public.contracts c ON c.id = d.contract_id
       WHERE d.status = 'open'
         AND d.dispute_stage = 'awaiting_response'
         AND d.respond_by_at IS NOT NULL
         AND d.respond_by_at < NOW()
         AND c.deleted_at IS NULL`,
    );
    for (const row of res.rows) {
      await db.query(
        `UPDATE public.contract_disputes
         SET dispute_stage = 'admin_review', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [row.id],
      );
      await db.query(
        `INSERT INTO public.contract_dispute_messages (dispute_id, author_id, author_role, body, attachments)
         VALUES ($1, NULL, 'system', $2, '[]'::jsonb)`,
        [
          row.id,
          "Hết hạn nộp bằng chứng — tranh chấp chuyển cho Admin xem xét và phán quyết.",
        ],
      );
      await logWorkflowEvent(db, row.contract_id, "dispute_evidence_expired", { disputeId: row.id });
    }
    return res.rowCount;
  } catch (err) {
    if (isMissingSchemaError(err)) return 0;
    throw err;
  }
}

async function processExpiredCancelRequests(db) {
  try {
    const res = await db.query(
      `SELECT r.*, c.*
       FROM public.contract_cancel_requests r
       INNER JOIN public.contracts c ON c.id = r.contract_id
       WHERE r.status = 'pending'
         AND r.respond_by_at < NOW()
         AND c.deleted_at IS NULL
         AND COALESCE(c.escrow_status, '') = 'funded'`,
    );
    for (const row of res.rows) {
      await db.query(
        `UPDATE public.contract_cancel_requests
         SET status = 'auto_approved', resolved_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [row.id],
      );
      const contract = {
        id: row.contract_id,
        client_id: row.client_id,
        freelancer_id: row.freelancer_id,
        agreed_price: row.agreed_price,
        job_id: row.job_id,
      };
      const cancelRequest = {
        client_refund_amount: row.client_refund_amount,
        freelancer_amount: row.freelancer_amount,
        platform_fee_amount: row.platform_fee_amount,
        split_type: row.split_type,
        legitimacy: row.legitimacy,
      };
      await settleCancelRefund(
        db,
        contract,
        cancelRequest,
        row.client_id,
        `Tự động hoàn tiền — freelancer không phản hồi: ${row.reason}`,
      );
    }
    return res.rowCount;
  } catch (err) {
    if (isMissingSchemaError(err)) return 0;
    throw err;
  }
}

async function runWorkflowSlaTick(db) {
  const summary = {
    expiredPreEscrow: 0,
    autoAcceptDelivery: 0,
    autoRefunds: 0,
    disputeEvidenceExpired: 0,
    reminders: true,
  };
  await processSlaReminders(db);
  summary.expiredPreEscrow = await processExpiredPreEscrow(db);
  summary.autoAcceptDelivery = await processAutoAcceptDelivery(db);
  summary.disputeEvidenceExpired = await processExpiredDisputeEvidence(db);
  summary.autoRefunds = await processExpiredCancelRequests(db);
  return summary;
}

module.exports = {
  SLA_DAYS,
  addDays,
  isMissingSchemaError,
  isPreFunded,
  isTerminalContract,
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
  runWorkflowSlaTick,
};
