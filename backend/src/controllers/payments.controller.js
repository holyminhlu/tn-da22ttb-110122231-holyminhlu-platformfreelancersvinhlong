const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { isPayosConfigured, getPayosClient } = require("../utils/payosClient");
const { resolveBankBin } = require("../utils/vnBankBins");
const {
  createPayosPaymentLink,
  completeWalletDeposit,
  cancelWalletDepositOrder,
  getWalletDepositOrderForUser,
  syncWalletDepositFromPayos,
  isMissingSchemaError: isWalletSchemaError,
} = require("../services/walletDepositPayos.service");
const {
  createWithdrawalRequest,
  confirmWithdrawal,
  syncWithdrawalFromPayos,
  handlePayoutWebhook,
  isMissingSchemaError: isWithdrawSchemaError,
} = require("../services/walletWithdrawPayos.service");
const {
  loadWithdrawalPinStatus,
  saveWithdrawalPin,
  verifyWithdrawalPin,
  isMissingSchemaError: isPinSchemaError,
} = require("../services/withdrawalPin.service");
const { assertClientPaymentAllowed } = require("../utils/clientIdentityVerified");

function isMissingSchemaError(err) {
  return err?.code === "42703" || err?.code === "42P01";
}

async function ensureClientAccount(db, userId) {
  await db.query(
    `INSERT INTO public.accounts (user_id, balance, currency)
     VALUES ($1, 0, 'VND')
     ON CONFLICT (user_id, currency) DO NOTHING`,
    [userId],
  );
}

async function loadAccountBalances(db, userId) {
  await ensureClientAccount(db, userId);

  let balance = 0;
  let escrowBalance = 0;

  try {
    const acc = await db.query(
      `SELECT balance, escrow_balance
       FROM public.accounts
       WHERE user_id = $1 AND currency = 'VND'
       LIMIT 1`,
      [userId],
    );
    balance = Number(acc.rows[0]?.balance) || 0;
    escrowBalance = Number(acc.rows[0]?.escrow_balance) || 0;
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
    const acc = await db.query(
      `SELECT balance FROM public.accounts WHERE user_id = $1 AND currency = 'VND' LIMIT 1`,
      [userId],
    );
    balance = Number(acc.rows[0]?.balance) || 0;
  }

  const escrowFromContracts = await db.query(
    `SELECT COALESCE(SUM(c.agreed_price), 0) AS total
     FROM public.contracts c
     WHERE c.client_id = $1
       AND c.deleted_at IS NULL
       AND COALESCE(c.escrow_status, '') = 'funded'`,
    [userId],
  );
  const activeEscrow = Number(escrowFromContracts.rows[0]?.total) || 0;
  if (activeEscrow > 0) escrowBalance = activeEscrow;

  return { balance, escrowBalance, currency: "VND" };
}

function mapBillingMethodRow(row) {
  const type = String(row.method_type || "card");
  let label = row.provider || row.bank_name || row.card_brand || type;
  let detail = "";

  if (type === "card") {
    label = row.card_brand || row.provider || "Thẻ";
    const exp =
      row.card_exp_month && row.card_exp_year
        ? ` • Hết hạn ${String(row.card_exp_month).padStart(2, "0")}/${String(row.card_exp_year).slice(-2)}`
        : "";
    detail = row.card_last4 ? `**** ${row.card_last4}${exp}` : "—";
  } else if (type === "paypal") {
    label = "PayPal";
    detail = row.paypal_email || "—";
  } else if (type === "bank") {
    label = row.bank_name || "Ngân hàng";
    detail = row.bank_account_last4 ? `TK **** ${row.bank_account_last4}` : "—";
  }

  return {
    id: row.id,
    type,
    label,
    detail,
    isPrimary: Boolean(row.is_default),
    isAutoBillingEnabled: Boolean(row.auto_billing_enabled),
    autoTopupThreshold: row.auto_topup_threshold != null ? Number(row.auto_topup_threshold) : null,
    autoTopupAmount: row.auto_topup_amount != null ? Number(row.auto_topup_amount) : null,
  };
}

async function loadBillingMethods(db, userId) {
  try {
    const result = await db.query(
      `SELECT *
       FROM public.client_billing_methods
       WHERE user_id = $1 AND is_active = true
       ORDER BY is_default DESC, created_at DESC`,
      [userId],
    );
    if (result.rows.length > 0) {
      return result.rows.map(mapBillingMethodRow);
    }
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }

  try {
    const idv = await db.query(
      `SELECT card_brand, card_last4, card_exp_month, card_exp_year, billing_email
       FROM public.identity_verifications
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    const row = idv.rows[0];
    if (row?.card_last4) {
      const exp =
        row.card_exp_month && row.card_exp_year
          ? ` • Hết hạn ${String(row.card_exp_month).padStart(2, "0")}/${String(row.card_exp_year).slice(-2)}`
          : "";
      return [
        {
          id: "identity-card",
          type: "card",
          label: row.card_brand || "Thẻ tín dụng",
          detail: `**** ${row.card_last4}${exp}`,
          isPrimary: true,
          isAutoBillingEnabled: false,
          autoTopupThreshold: null,
          autoTopupAmount: null,
        },
      ];
    }
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }

  return [];
}

async function loadBillingProfile(db, userId) {
  try {
    const result = await db.query(
      `SELECT company_name, company_address, tax_id, billing_email, contact_name
       FROM public.client_billing_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    if (row) {
      return {
        companyName: row.company_name || "",
        companyAddress: row.company_address || "",
        taxId: row.tax_id || "",
        billingEmail: row.billing_email || "",
        contactName: row.contact_name || "",
      };
    }
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }

  try {
    const userRow = await db.query(
      `SELECT u.email, up.full_name
       FROM public.users u
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [userId],
    );
    const iv = await db.query(
      `SELECT billing_street, billing_city, billing_state, billing_country, billing_phone
       FROM public.identity_verifications
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    const u = userRow.rows[0];
    const b = iv.rows[0];
    const addressParts = [b?.billing_street, b?.billing_city, b?.billing_state, b?.billing_country].filter(Boolean);
    return {
      companyName: "",
      companyAddress: addressParts.join(", "),
      taxId: "",
      billingEmail: u?.email || "",
      contactName: u?.full_name || "",
    };
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }

  return {
    companyName: "",
    companyAddress: "",
    taxId: "",
    billingEmail: "",
    contactName: "",
  };
}

function mapTransactionRow(row) {
  const amount = Number(row.amount) || 0;
  const signedAmount = row.direction === "in" ? amount : row.direction === "out" ? -amount : amount;
  return {
    id: row.id,
    occurredAt: row.occurred_at || row.created_at,
    projectTitle: row.project_title || row.description || "—",
    freelancerName: row.freelancer_name || "—",
    category: row.category || row.type || "other",
    amount: signedAmount,
    currency: row.currency || "VND",
    invoiceNumber: row.invoice_number || null,
    jobId: row.job_id || null,
    freelancerId: row.freelancer_id || null,
  };
}

async function loadTransactionsFromTable(db, userId) {
  const result = await db.query(
    `SELECT
       t.id,
       t.amount,
       t.currency,
       t.direction,
       t.category,
       t.description,
       t.occurred_at,
       t.created_at,
       t.job_id,
       t.freelancer_id,
       COALESCE(j.title, t.description, 'Giao dịch') AS project_title,
       fup.full_name AS freelancer_name,
       bi.invoice_number
     FROM public.transactions t
     LEFT JOIN public.jobs j ON j.id = t.job_id
     LEFT JOIN public.user_profiles fup ON fup.user_id = t.freelancer_id
     LEFT JOIN public.billing_invoices bi ON bi.transaction_id = t.id
     WHERE t.user_id = $1
     ORDER BY COALESCE(t.occurred_at, t.created_at) DESC
     LIMIT 200`,
    [userId],
  );
  return result.rows.map(mapTransactionRow);
}

async function loadTransactionsFromContracts(db, userId) {
  const result = await db.query(
    `SELECT *
     FROM (
       SELECT
         ('fund-' || c.id)::text AS id,
         c.funded_at AS occurred_at,
         COALESCE(j.title, s.title, 'Đơn hàng dịch vụ') AS project_title,
         fup.full_name AS freelancer_name,
         'escrow_hold'::text AS category,
         -(COALESCE(c.agreed_price, 0)) AS amount,
         'VND'::text AS currency,
         NULL::text AS invoice_number,
         c.job_id,
         c.freelancer_id
       FROM public.contracts c
       LEFT JOIN public.jobs j ON j.id = c.job_id
       LEFT JOIN public.services s ON s.id = c.service_id
       LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
       WHERE c.client_id = $1
         AND c.deleted_at IS NULL
         AND c.funded_at IS NOT NULL

       UNION ALL

       SELECT
         ('release-' || c.id)::text AS id,
         c.released_at AS occurred_at,
         COALESCE(j.title, s.title, 'Đơn hàng dịch vụ') AS project_title,
         fup.full_name AS freelancer_name,
         'milestone'::text AS category,
         -(COALESCE(c.agreed_price, 0)) AS amount,
         'VND'::text AS currency,
         ('INV-' || UPPER(SUBSTRING(c.id::text, 1, 8)))::text AS invoice_number,
         c.job_id,
         c.freelancer_id
       FROM public.contracts c
       LEFT JOIN public.jobs j ON j.id = c.job_id
       LEFT JOIN public.services s ON s.id = c.service_id
       LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
       WHERE c.client_id = $1
         AND c.deleted_at IS NULL
         AND c.released_at IS NOT NULL
     ) x
     ORDER BY occurred_at DESC
     LIMIT 200`,
    [userId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    projectTitle: row.project_title,
    freelancerName: row.freelancer_name || "—",
    category: row.category,
    amount: Number(row.amount) || 0,
    currency: row.currency || "VND",
    invoiceNumber: row.invoice_number,
    jobId: row.job_id,
    freelancerId: row.freelancer_id,
  }));
}

async function loadTransactions(db, userId) {
  let fromTable = [];
  try {
    fromTable = await loadTransactionsFromTable(db, userId);
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }

  const fromContracts = await loadTransactionsFromContracts(db, userId);
  const seen = new Set(fromTable.map((t) => t.id));
  const merged = [...fromTable];
  for (const row of fromContracts) {
    if (!seen.has(row.id)) {
      merged.push(row);
      seen.add(row.id);
    }
  }

  merged.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return merged.slice(0, 200);
}

async function loadFilterOptions(db, userId, transactions) {
  const jobs = new Map();
  const freelancers = new Map();
  for (const t of transactions) {
    if (t.jobId && t.projectTitle) jobs.set(t.jobId, t.projectTitle);
    if (t.freelancerId && t.freelancerName && t.freelancerName !== "—") {
      freelancers.set(t.freelancerId, t.freelancerName);
    }
  }
  return {
    jobs: [...jobs.entries()].map(([id, title]) => ({ id, title })),
    freelancers: [...freelancers.entries()].map(([id, name]) => ({ id, name })),
  };
}

function mapFreelancerTransactionRow(row) {
  const amount = Number(row.amount) || 0;
  const signedAmount = row.direction === "out" ? -amount : amount;
  const withdrawalStatus = row.withdrawal_status || null;
  const withdrawalBankName = row.withdrawal_bank_name || null;
  const withdrawalReferenceId = row.withdrawal_reference_id || null;
  const withdrawalFailureReason = row.withdrawal_failure_reason || null;
  const descriptionRef = String(row.description || "").replace(/^Rút tiền về\s*/i, "").trim();
  return {
    id: row.id,
    occurredAt: row.occurred_at || row.created_at,
    projectTitle: row.project_title || row.description || "—",
    clientName: row.client_name || "—",
    category: row.category || row.type || "other",
    amount: row.direction ? signedAmount : amount,
    currency: row.currency || "VND",
    reference: withdrawalReferenceId || row.invoice_number || row.contract_id || descriptionRef || null,
    jobId: row.job_id || null,
    clientId: row.client_id || null,
    contractId: row.contract_id || null,
    withdrawalStatus,
    withdrawalBankName,
    withdrawalReferenceId,
    withdrawalFailureReason,
  };
}

async function loadFreelancerTransactionsFromContracts(db, userId) {
  const result = await db.query(
    `SELECT *
     FROM (
       SELECT
         ('earn-' || c.id)::text AS id,
         c.released_at AS occurred_at,
         COALESCE(j.title, s.title, 'Hợp đồng') AS project_title,
         cup.full_name AS client_name,
         'escrow_release'::text AS category,
         COALESCE(c.agreed_price, 0) AS amount,
         'VND'::text AS currency,
         ('PAY-' || UPPER(SUBSTRING(c.id::text, 1, 8)))::text AS invoice_number,
         c.job_id,
         c.client_id,
         c.id AS contract_id,
         'in'::text AS direction
       FROM public.contracts c
       LEFT JOIN public.jobs j ON j.id = c.job_id
       LEFT JOIN public.services s ON s.id = c.service_id
       LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
       WHERE c.freelancer_id = $1
         AND c.deleted_at IS NULL
         AND c.released_at IS NOT NULL

       UNION ALL

       SELECT
         ('refund-fl-' || c.id)::text AS id,
         c.cancelled_at AS occurred_at,
         COALESCE(j.title, s.title, 'Hoàn tiền hợp đồng') AS project_title,
         cup.full_name AS client_name,
         'refund'::text AS category,
         -(COALESCE(c.agreed_price, 0)) AS amount,
         'VND'::text AS currency,
         NULL::text AS invoice_number,
         c.job_id,
         c.client_id,
         c.id AS contract_id,
         'out'::text AS direction
       FROM public.contracts c
       LEFT JOIN public.jobs j ON j.id = c.job_id
       LEFT JOIN public.services s ON s.id = c.service_id
       LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
       WHERE c.freelancer_id = $1
         AND c.deleted_at IS NULL
         AND c.cancelled_at IS NOT NULL
         AND COALESCE(c.cancel_type, '') IN ('refund', 'expired')
         AND c.released_at IS NULL
     ) x
     WHERE occurred_at IS NOT NULL
     ORDER BY occurred_at DESC
     LIMIT 200`,
    [userId],
  );
  return result.rows.map(mapFreelancerTransactionRow);
}

async function loadFreelancerTransactionsFromTable(db, userId) {
  const result = await db.query(
    `SELECT
       t.id,
       t.amount,
       t.currency,
       t.direction,
       t.category,
       t.description,
       t.occurred_at,
       t.created_at,
       t.job_id,
       COALESCE(j.title, t.description, 'Giao dịch') AS project_title,
       cup.full_name AS client_name,
       NULL::text AS invoice_number,
       j.client_id,
       w.status AS withdrawal_status,
       w.bank_name AS withdrawal_bank_name,
       w.reference_id AS withdrawal_reference_id,
       w.failure_reason AS withdrawal_failure_reason
     FROM public.transactions t
     LEFT JOIN public.jobs j ON j.id = t.job_id
     LEFT JOIN public.user_profiles cup ON cup.user_id = j.client_id
     LEFT JOIN public.freelancer_withdrawal_orders w
       ON w.user_id = t.user_id
      AND t.category = 'withdraw'
      AND w.reference_id = REPLACE(COALESCE(t.description, ''), 'Rút tiền về ', '')
     WHERE t.user_id = $1
     ORDER BY COALESCE(t.occurred_at, t.created_at) DESC
     LIMIT 200`,
    [userId],
  );
  return result.rows.map((row) =>
    mapFreelancerTransactionRow({
      ...row,
      contract_id: null,
      direction: row.direction || (Number(row.amount) >= 0 ? "in" : "out"),
    }),
  );
}

async function loadFreelancerTransactions(db, userId) {
  let fromTable = [];
  try {
    fromTable = await loadFreelancerTransactionsFromTable(db, userId);
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
  }
  const fromContracts = await loadFreelancerTransactionsFromContracts(db, userId);
  const seen = new Set(fromTable.map((t) => t.id));
  const merged = [...fromTable];
  for (const row of fromContracts) {
    if (!seen.has(row.id)) {
      merged.push(row);
      seen.add(row.id);
    }
  }
  merged.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return merged.slice(0, 200);
}

async function loadActiveWithdrawals(db, userId) {
  const result = await db.query(
    `SELECT
       id,
       reference_id,
       amount,
       status,
       bank_name,
       account_last4,
       failure_reason,
       created_at
     FROM public.freelancer_withdrawal_orders
     WHERE user_id = $1
       AND status IN ('PENDING_AUTH', 'PROCESSING')
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    referenceId: row.reference_id,
    amount: Number(row.amount) || 0,
    status: row.status,
    bankName: row.bank_name,
    accountLast4: row.account_last4,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
  }));
}

async function loadFreelancerPendingEarnings(db, userId) {
  const result = await db.query(
    `SELECT
       c.id AS contract_id,
       c.agreed_price,
       c.funded_at,
       c.workflow_stage,
       c.escrow_status,
       COALESCE(j.title, s.title, 'Hợp đồng') AS project_title,
       cup.full_name AS client_name
     FROM public.contracts c
     LEFT JOIN public.jobs j ON j.id = c.job_id
     LEFT JOIN public.services s ON s.id = c.service_id
     LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
     WHERE c.freelancer_id = $1
       AND c.deleted_at IS NULL
       AND COALESCE(c.escrow_status, '') = 'funded'
       AND c.released_at IS NULL
     ORDER BY c.funded_at DESC NULLS LAST`,
    [userId],
  );
  return result.rows.map((row) => ({
    contractId: row.contract_id,
    amount: Number(row.agreed_price) || 0,
    fundedAt: row.funded_at,
    workflowStage: row.workflow_stage || null,
    escrowStatus: row.escrow_status || null,
    projectTitle: row.project_title || "—",
    clientName: row.client_name || "—",
  }));
}

async function loadFreelancerEarningsSummary(db, userId) {
  const pendingResult = await db.query(
    `SELECT COALESCE(SUM(c.agreed_price), 0) AS total
     FROM public.contracts c
     WHERE c.freelancer_id = $1
       AND c.deleted_at IS NULL
       AND COALESCE(c.escrow_status, '') = 'funded'
       AND c.released_at IS NULL`,
    [userId],
  );
  const earnedResult = await db.query(
    `SELECT COALESCE(SUM(c.agreed_price), 0) AS total
     FROM public.contracts c
     WHERE c.freelancer_id = $1
       AND c.deleted_at IS NULL
       AND c.released_at IS NOT NULL`,
    [userId],
  );
  return {
    pendingBalance: Number(pendingResult.rows[0]?.total) || 0,
    totalEarned: Number(earnedResult.rows[0]?.total) || 0,
  };
}

async function loadFreelancerPayoutProfile(db, userId) {
  const base = await db.query(
    `SELECT u.email, up.full_name, up.phone,
            iv.legal_first_name, iv.legal_last_name, iv.admin_review_status
     FROM public.users u
     LEFT JOIN public.user_profiles up ON up.user_id = u.id
     LEFT JOIN public.identity_verifications iv ON iv.user_id = u.id
     WHERE u.id = $1
     LIMIT 1`,
    [userId],
  );
  const u = base.rows[0] || {};
  const legalName = [u.legal_first_name, u.legal_last_name].filter(Boolean).join(" ").trim();
  const identityApproved = String(u.admin_review_status || "").toLowerCase() === "approved";

  const emptyProfile = {
    contactName: u.full_name || legalName || "",
    contactEmail: u.email || "",
    contactPhone: u.phone || "",
    accountHolderName: legalName || u.full_name || "",
    bankName: "",
    accountLast4: "",
    accountMasked: "",
    isConfigured: false,
    isVerified: false,
    linkedAt: null,
  };

  try {
    const payout = await db.query(
      `SELECT bank_name, account_holder_name, account_number, linked_at
       FROM public.freelancer_payout_accounts
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    const p = payout.rows[0];
    if (!p) return emptyProfile;

    const accountNumber = String(p.account_number || "").replace(/\D/g, "");
    const last4 = accountNumber.slice(-4);
    return {
      contactName: u.full_name || legalName || "",
      contactEmail: u.email || "",
      contactPhone: u.phone || "",
      accountHolderName: p.account_holder_name || legalName || u.full_name || "",
      bankName: p.bank_name || "",
      accountLast4: last4,
      accountMasked: last4 ? `******${last4}` : "",
      isConfigured: Boolean(p.bank_name && accountNumber),
      isVerified: identityApproved,
      linkedAt: p.linked_at || null,
    };
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
    return emptyProfile;
  }
}

function normalizePersonName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function loadFreelancerLegalName(db, userId) {
  const result = await db.query(
    `SELECT iv.legal_first_name, iv.legal_last_name, up.full_name
     FROM public.users u
     LEFT JOIN public.identity_verifications iv ON iv.user_id = u.id
     LEFT JOIN public.user_profiles up ON up.user_id = u.id
     WHERE u.id = $1
     LIMIT 1`,
    [userId],
  );
  const row = result.rows[0] || {};
  const legal = [row.legal_first_name, row.legal_last_name].filter(Boolean).join(" ").trim();
  return legal || row.full_name || "";
}

async function saveFreelancerPayoutAccount(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const role = String(payload.role || "").toLowerCase();
  if (role !== "freelancer" && role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng hoặc freelancer được liên kết tài khoản nhận tiền." });
  }

  const bankName = String(req.body?.bankName || "").trim().slice(0, 120);
  const accountNumber = String(req.body?.accountNumber || "").replace(/\D/g, "").slice(0, 32);
  let accountHolderName = String(req.body?.accountHolderName || "").trim().slice(0, 255);

  if (!bankName) {
    return res.status(400).json({ message: "Vui lòng chọn ngân hàng." });
  }
  if (accountNumber.length < 6) {
    return res.status(400).json({ message: "Số tài khoản phải có ít nhất 6 chữ số." });
  }

  const db = await pool.connect();
  try {
    const legalName = await loadFreelancerLegalName(db, userId);
    if (!accountHolderName) accountHolderName = legalName;
    if (!accountHolderName) {
      return res.status(400).json({
        message: "Thiếu tên chủ tài khoản. Hoàn thành xác minh danh tính hoặc nhập tên trùng CCCD/CMND.",
      });
    }
    if (legalName && normalizePersonName(accountHolderName) !== normalizePersonName(legalName)) {
      return res.status(400).json({
        message: `Tên chủ tài khoản không khớp tên đã xác minh (${legalName}). Bạn có thể nhập IN HOA, không dấu như trên thẻ ngân hàng (vd: NGUYEN VAN A).`,
      });
    }

    const bankBin = resolveBankBin(bankName);
    await db.query(
      `INSERT INTO public.freelancer_payout_accounts
         (user_id, bank_name, bank_bin, account_holder_name, account_number, linked_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         bank_name = EXCLUDED.bank_name,
         bank_bin = EXCLUDED.bank_bin,
         account_holder_name = EXCLUDED.account_holder_name,
         account_number = EXCLUDED.account_number,
         updated_at = NOW()`,
      [userId, bankName, bankBin, accountHolderName, accountNumber],
    );

    const payoutProfile = await loadFreelancerPayoutProfile(db, userId);
    return res.json({
      message: "Đã lưu tài khoản ngân hàng nhận tiền.",
      payoutProfile,
    });
  } catch (error) {
    console.error("saveFreelancerPayoutAccount failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu schema tài khoản nhận tiền. Chạy backend/sql/freelancer_payout_accounts.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể lưu tài khoản ngân hàng." });
  } finally {
    db.release();
  }
}

async function unlinkFreelancerPayoutAccount(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "freelancer" && role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng hoặc freelancer được thao tác tài khoản nhận tiền." });
  }

  const db = await pool.connect();
  try {
    await db.query(`DELETE FROM public.freelancer_payout_accounts WHERE user_id = $1`, [payload.sub]);
    const payoutProfile = await loadFreelancerPayoutProfile(db, payload.sub);
    return res.json({
      message: "Đã hủy liên kết tài khoản ngân hàng.",
      payoutProfile,
    });
  } catch (error) {
    console.error("unlinkFreelancerPayoutAccount failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu schema tài khoản nhận tiền. Chạy backend/sql/freelancer_payout_accounts.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể hủy liên kết tài khoản." });
  } finally {
    db.release();
  }
}

async function loadFreelancerFilterOptions(transactions) {
  const jobs = new Map();
  const clients = new Map();
  for (const t of transactions) {
    if (t.jobId && t.projectTitle) jobs.set(t.jobId, t.projectTitle);
    if (t.clientId && t.clientName && t.clientName !== "—") {
      clients.set(t.clientId, t.clientName);
    }
  }
  return {
    jobs: [...jobs.entries()].map(([id, title]) => ({ id, title })),
    clients: [...clients.entries()].map(([id, name]) => ({ id, name })),
  };
}

async function getFreelancerBilling(req, res, userId) {
  const db = await pool.connect();
  try {
    const account = await loadAccountBalances(db, userId);
    const earnings = await loadFreelancerEarningsSummary(db, userId);
    const pendingItems = await loadFreelancerPendingEarnings(db, userId);
    const activeWithdrawals = await loadActiveWithdrawals(db, userId).catch((err) => {
      if (isMissingSchemaError(err)) return [];
      throw err;
    });
    const transactions = await loadFreelancerTransactions(db, userId);
    const filterOptions = await loadFreelancerFilterOptions(transactions);
    const payoutProfile = await loadFreelancerPayoutProfile(db, userId);
    const withdrawalPin = await loadWithdrawalPinStatus(db, userId);

    return res.json({
      role: "freelancer",
      account: {
        balance: account.balance,
        currency: account.currency,
        pendingBalance: earnings.pendingBalance,
        totalEarned: earnings.totalEarned,
      },
      payoutProfile,
      withdrawalPin,
      pendingItems,
      activeWithdrawals,
      transactions,
      filterOptions,
      platformFeeNote:
        "Phí nền tảng (nếu có) sẽ được trừ khi giải ngân — chi tiết trên từng giao dịch.",
    });
  } catch (error) {
    console.error("getFreelancerBilling failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu schema thanh toán. Chạy backend/sql/client_billing_payments.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải dữ liệu thanh toán." });
  } finally {
    db.release();
  }
}

async function getClientBilling(req, res, userId) {
  const db = await pool.connect();

  try {
    const account = await loadAccountBalances(db, userId);
    const billingMethods = await loadBillingMethods(db, userId);
    const billingProfile = await loadBillingProfile(db, userId);
    const transactions = await loadTransactions(db, userId);
    const filterOptions = await loadFilterOptions(db, userId, transactions);
    const payoutProfile = await loadFreelancerPayoutProfile(db, userId);
    const withdrawalPin = await loadWithdrawalPinStatus(db, userId);
    const activeWithdrawals = await loadActiveWithdrawals(db, userId).catch((err) => {
      if (isMissingSchemaError(err)) return [];
      throw err;
    });

    const defaultMethod = billingMethods.find((m) => m.isPrimary) || billingMethods[0] || null;

    return res.json({
      role: "client",
      account,
      billingProfile,
      billingMethods,
      defaultMethod,
      payoutProfile,
      withdrawalPin,
      activeWithdrawals,
      transactions,
      filterOptions,
    });
  } catch (error) {
    console.error("getClientBilling failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu schema thanh toán. Chạy backend/sql/client_billing_payments.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải dữ liệu thanh toán." });
  } finally {
    db.release();
  }
}

async function getBilling(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  const userId = payload.sub;

  if (role === "freelancer") {
    return getFreelancerBilling(req, res, userId);
  }

  if (role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng hoặc freelancer được truy cập trang thanh toán." });
  }

  return getClientBilling(req, res, userId);
}

async function updateBillingProfile(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "client") {
    return res.status(403).json({ message: "Chỉ tài khoản khách hàng được cập nhật thông tin xuất hóa đơn." });
  }

  const userId = payload.sub;
  const companyName = String(req.body?.companyName || "").trim().slice(0, 255);
  const companyAddress = String(req.body?.companyAddress || "").trim().slice(0, 2000);
  const taxId = String(req.body?.taxId || "").trim().slice(0, 100);
  const billingEmail = String(req.body?.billingEmail || "").trim().slice(0, 255);
  const contactName = String(req.body?.contactName || "").trim().slice(0, 255);

  const db = await pool.connect();
  try {
    if (!(await assertClientPaymentAllowed(db, role, userId, res))) {
      return;
    }

    await db.query(
      `INSERT INTO public.client_billing_profiles
         (user_id, company_name, company_address, tax_id, billing_email, contact_name, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         company_name = EXCLUDED.company_name,
         company_address = EXCLUDED.company_address,
         tax_id = EXCLUDED.tax_id,
         billing_email = EXCLUDED.billing_email,
         contact_name = EXCLUDED.contact_name,
         updated_at = NOW()`,
      [userId, companyName || null, companyAddress || null, taxId || null, billingEmail || null, contactName || null],
    );
    return res.json({ message: "Đã lưu thông tin xuất hóa đơn." });
  } catch (error) {
    console.error("updateBillingProfile failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu bảng client_billing_profiles. Chạy backend/sql/client_billing_payments.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể lưu thông tin xuất hóa đơn." });
  } finally {
    db.release();
  }
}

function detectCardBrandFromPan(digits) {
  if (/^4/.test(digits)) return "Visa";
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^35(2[89]|[3-8]\d)/.test(digits)) return "JCB";
  return "Card";
}

function luhnCheck(digits) {
  if (!digits || digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

async function addBillingMethod(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "client") {
    return res.status(403).json({ message: "Chỉ tài khoản khách hàng được thêm phương thức thanh toán." });
  }

  const userId = payload.sub;
  const variant = String(req.body?.variant || "intl_card");
  const isDefault = Boolean(req.body?.isDefault);
  const cardDigits = String(req.body?.cardNumber || "").replace(/\D/g, "");
  const cardholderName = String(req.body?.cardholderName || "").trim().slice(0, 80);
  const bankName = String(req.body?.bankName || "").trim().slice(0, 120);
  const walletProvider = String(req.body?.walletProvider || "").toLowerCase();
  const walletPhone = String(req.body?.walletPhone || "").replace(/\D/g, "");

  const db = await pool.connect();

  try {
    if (!(await assertClientPaymentAllowed(db, role, userId, res))) {
      return;
    }

    let methodType = "card";
    let cardBrand = null;
    let cardLast4 = null;
    let cardExpMonth = null;
    let cardExpYear = null;
    let provider = cardholderName || null;
    let bankNameValue = null;
    let bankAccountLast4 = null;
    let paypalEmail = null;

    if (variant === "intl_card") {
      if (!luhnCheck(cardDigits)) {
        return res.status(400).json({ message: "Số thẻ không hợp lệ." });
      }
      const expMonth = Number(req.body?.expMonth);
      const expYear = Number(req.body?.expYear);
      if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
        return res.status(400).json({ message: "Tháng hết hạn không hợp lệ." });
      }
      if (!Number.isInteger(expYear) || expYear < new Date().getFullYear()) {
        return res.status(400).json({ message: "Năm hết hạn không hợp lệ." });
      }
      if (!cardholderName) {
        return res.status(400).json({ message: "Vui lòng nhập tên in trên thẻ." });
      }

      methodType = "card";
      cardBrand = detectCardBrandFromPan(cardDigits);
      cardLast4 = cardDigits.slice(-4);
      cardExpMonth = expMonth;
      cardExpYear = expYear;
      provider = cardholderName;
    } else if (variant === "domestic_atm") {
      if (cardDigits.length < 16 || cardDigits.length > 19) {
        return res.status(400).json({ message: "Số thẻ ATM nội địa phải có 16–19 chữ số." });
      }
      if (!bankName) {
        return res.status(400).json({ message: "Vui lòng chọn ngân hàng." });
      }
      if (!cardholderName) {
        return res.status(400).json({ message: "Vui lòng nhập tên chủ thẻ." });
      }

      methodType = "bank";
      bankNameValue = bankName;
      bankAccountLast4 = cardDigits.slice(-4);
      provider = cardholderName;
    } else if (variant === "ewallet") {
      if (walletPhone.length < 9 || walletPhone.length > 11) {
        return res.status(400).json({ message: "Số điện thoại ví không hợp lệ." });
      }
      const walletLabel = walletProvider === "zalopay" ? "ZaloPay" : "MoMo";
      methodType = "bank";
      bankNameValue = walletLabel;
      bankAccountLast4 = walletPhone.slice(-4);
      provider = walletLabel;
    } else {
      return res.status(400).json({ message: "Loại phương thức không hợp lệ." });
    }

    await db.query("BEGIN");

    if (isDefault) {
      await db.query(
        `UPDATE public.client_billing_methods
         SET is_default = false, updated_at = NOW()
         WHERE user_id = $1 AND is_active = true`,
        [userId],
      );
    }

    const insert = await db.query(
      `INSERT INTO public.client_billing_methods
         (user_id, method_type, provider, card_brand, card_last4, card_exp_month, card_exp_year,
          paypal_email, bank_name, bank_account_last4, is_default, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
       RETURNING *`,
      [
        userId,
        methodType,
        provider,
        cardBrand,
        cardLast4,
        cardExpMonth,
        cardExpYear,
        paypalEmail,
        bankNameValue,
        bankAccountLast4,
        isDefault,
      ],
    );

    await db.query("COMMIT");

    return res.status(201).json({
      message: "Đã thêm phương thức thanh toán.",
      method: mapBillingMethodRow(insert.rows[0]),
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("addBillingMethod failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu bảng client_billing_methods. Chạy backend/sql/client_billing_payments.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể lưu phương thức thanh toán." });
  } finally {
    db.release();
  }
}

async function setDefaultBillingMethod(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "client") {
    return res.status(403).json({ message: "Chỉ tài khoản khách hàng được đổi phương thức mặc định." });
  }

  const userId = payload.sub;
  const methodId = String(req.params.methodId || "").trim();
  if (!methodId || methodId === "identity-card") {
    return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    if (!(await assertClientPaymentAllowed(db, role, userId, res))) {
      return;
    }

    const existing = await db.query(
      `SELECT id FROM public.client_billing_methods
       WHERE id = $1 AND user_id = $2 AND is_active = true
       LIMIT 1`,
      [methodId, userId],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy phương thức thanh toán." });
    }

    await db.query("BEGIN");
    await db.query(
      `UPDATE public.client_billing_methods
       SET is_default = false, updated_at = NOW()
       WHERE user_id = $1 AND is_active = true`,
      [userId],
    );
    const updated = await db.query(
      `UPDATE public.client_billing_methods
       SET is_default = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [methodId, userId],
    );
    await db.query("COMMIT");

    return res.json({
      message: "Đã đặt làm phương thức thanh toán mặc định.",
      method: mapBillingMethodRow(updated.rows[0]),
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("setDefaultBillingMethod failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu bảng client_billing_methods. Chạy backend/sql/client_billing_payments.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể đổi phương thức mặc định." });
  } finally {
    db.release();
  }
}

async function deleteBillingMethod(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "client") {
    return res.status(403).json({ message: "Chỉ tài khoản khách hàng được xóa phương thức thanh toán." });
  }

  const userId = payload.sub;
  const methodId = String(req.params.methodId || "").trim();
  if (!methodId || methodId === "identity-card") {
    return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    if (!(await assertClientPaymentAllowed(db, role, userId, res))) {
      return;
    }

    const existing = await db.query(
      `SELECT id, is_default
       FROM public.client_billing_methods
       WHERE id = $1 AND user_id = $2 AND is_active = true
       LIMIT 1`,
      [methodId, userId],
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy phương thức thanh toán." });
    }

    const wasDefault = Boolean(existing.rows[0].is_default);

    await db.query("BEGIN");
    await db.query(
      `UPDATE public.client_billing_methods
       SET is_active = false, is_default = false, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [methodId, userId],
    );

    if (wasDefault) {
      const nextDefault = await db.query(
        `SELECT id
         FROM public.client_billing_methods
         WHERE user_id = $1 AND is_active = true
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId],
      );
      if (nextDefault.rows[0]?.id) {
        await db.query(
          `UPDATE public.client_billing_methods
           SET is_default = true, updated_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          [nextDefault.rows[0].id, userId],
        );
      }
    }

    await db.query("COMMIT");
    return res.json({ message: "Đã xóa phương thức thanh toán." });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("deleteBillingMethod failed:", error.message);
    if (isMissingSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu bảng client_billing_methods. Chạy backend/sql/client_billing_payments.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể xóa phương thức thanh toán." });
  } finally {
    db.release();
  }
}

async function createPaymentLink(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "client") {
    return res.status(403).json({ message: "Chỉ tài khoản khách hàng được nạp tiền." });
  }

  if (!isPayosConfigured()) {
    return res.status(503).json({
      message:
        "Cổng thanh toán chưa sẵn sàng. Vui lòng thử lại sau.",
    });
  }

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 10000 || amount > 500_000_000) {
    return res.status(400).json({ message: "Số tiền nạp phải từ 10.000 đến 500.000.000 VND." });
  }

  const db = await pool.connect();
  try {
    if (!(await assertClientPaymentAllowed(db, role, payload.sub, res))) {
      return;
    }
    const billingMethods = await loadBillingMethods(db, payload.sub);
    if (!billingMethods.length) {
      return res.status(409).json({
        message:
          "Bạn chưa có phương thức thanh toán. Vui lòng thêm thẻ/phương thức thanh toán trước khi nạp tiền.",
        code: "BILLING_METHOD_REQUIRED",
      });
    }

    const result = await createPayosPaymentLink(db, payload.sub, amount);
    if (!result.checkoutUrl) {
      return res.status(502).json({ message: "Không thể tạo link thanh toán." });
    }
    return res.json({
      message: "Đã tạo link thanh toán.",
      orderCode: result.orderCode,
      amount: result.amount,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (error) {
    console.error("createPaymentLink failed:", error.message);
    if (isWalletSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu bảng wallet_deposit_orders. Chạy backend/sql/wallet_deposit_payos.sql.",
      });
    }
    return res.status(500).json({
      message: error.message || "Không thể tạo link thanh toán.",
    });
  } finally {
    db.release();
  }
}

async function payosWebhook(req, res) {
  if (!isPayosConfigured()) {
    return res.status(503).json({ message: "payOS chưa được cấu hình." });
  }

  let webhookData;
  try {
    const payos = getPayosClient();
    webhookData = await payos.webhooks.verify(req.body);
  } catch (error) {
    console.error("payosWebhook verify failed:", error.message);
    return res.status(400).json({ message: "Webhook payOS không hợp lệ." });
  }

  const orderCode = Number(webhookData?.orderCode);
  if (!Number.isFinite(orderCode)) {
    return res.status(400).json({ message: "Thiếu orderCode trong webhook." });
  }

  const db = await pool.connect();
  try {
    const result = await completeWalletDeposit(db, orderCode, {
      amount: webhookData?.amount,
      reference: webhookData?.reference ?? null,
    });

    if (!result.ok && result.reason === "not_found") {
      return res.status(404).json({ message: "Không tìm thấy đơn nạp tiền." });
    }
    if (!result.ok && result.reason === "amount_mismatch") {
      return res.status(409).json({ message: "Số tiền webhook không khớp đơn hàng." });
    }

    return res.status(200).json({ success: true, orderCode, status: "SUCCESS" });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("payosWebhook complete failed:", error.message);
    if (isWalletSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu bảng wallet_deposit_orders. Chạy backend/sql/wallet_deposit_payos.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể xử lý webhook payOS." });
  } finally {
    db.release();
  }
}

async function getDepositOrderStatus(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng được xem trạng thái nạp tiền." });
  }

  const orderCode = Number(req.params.orderCode);
  if (!Number.isFinite(orderCode)) {
    return res.status(400).json({ message: "Mã đơn không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    let order = await getWalletDepositOrderForUser(db, orderCode, payload.sub);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn nạp tiền." });
    }

    if (order.status === "PENDING" && isPayosConfigured()) {
      await syncWalletDepositFromPayos(db, orderCode);
      order = (await getWalletDepositOrderForUser(db, orderCode, payload.sub)) || order;
    }

    const account = await loadAccountBalances(db, payload.sub);
    return res.json({
      orderCode: Number(order.order_code),
      amount: Number(order.amount),
      status: order.status,
      type: order.type,
      paidAt: order.paid_at,
      createdAt: order.created_at,
      account,
    });
  } catch (error) {
    console.error("getDepositOrderStatus failed:", error.message);
    if (isWalletSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu bảng wallet_deposit_orders. Chạy backend/sql/wallet_deposit_payos.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể tải trạng thái đơn nạp tiền." });
  } finally {
    db.release();
  }
}

async function cancelDepositOrder(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng được hủy đơn nạp tiền." });
  }

  const orderCode = Number(req.params.orderCode);
  if (!Number.isFinite(orderCode)) {
    return res.status(400).json({ message: "Mã đơn không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    if (!(await assertClientPaymentAllowed(db, role, payload.sub, res))) {
      return;
    }

    const order = await getWalletDepositOrderForUser(db, orderCode, payload.sub);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn nạp tiền." });
    }
    if (order.status === "SUCCESS") {
      return res.status(409).json({ message: "Đơn đã thanh toán thành công, không thể hủy." });
    }
    await cancelWalletDepositOrder(db, orderCode, "Khách hàng hủy tại trang thanh toán");
    return res.json({ message: "Đã hủy yêu cầu nạp tiền.", orderCode, status: "CANCELLED" });
  } catch (error) {
    console.error("cancelDepositOrder failed:", error.message);
    return res.status(500).json({ message: "Không thể hủy đơn nạp tiền." });
  } finally {
    db.release();
  }
}

async function requestWithdrawal(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "freelancer" && role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng hoặc freelancer được rút tiền về tài khoản." });
  }

  const amount = Number(req.body?.amount);
  const db = await pool.connect();
  try {
    const result = await createWithdrawalRequest(db, payload.sub, amount);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.json({
      message: "Đã tạo lệnh rút tiền. Vui lòng xác nhận bằng mật khẩu.",
      order: result.order,
    });
  } catch (error) {
    console.error("requestWithdrawal failed:", error.message);
    if (isWithdrawSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu schema rút tiền. Chạy backend/sql/freelancer_withdrawal_payos.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể tạo lệnh rút tiền." });
  } finally {
    db.release();
  }
}

async function getWithdrawalPinSettings(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "freelancer" && role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng hoặc freelancer được quản lý PIN rút tiền." });
  }

  const db = await pool.connect();
  try {
    const withdrawalPin = await loadWithdrawalPinStatus(db, payload.sub);
    return res.json({ withdrawalPin });
  } catch (error) {
    console.error("getWithdrawalPinSettings failed:", error.message);
    if (isPinSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu schema PIN rút tiền. Chạy backend/sql/freelancer_withdrawal_pin.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể tải cài đặt PIN rút tiền." });
  } finally {
    db.release();
  }
}

async function saveWithdrawalPinSettings(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "freelancer" && role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng hoặc freelancer được thiết lập PIN rút tiền." });
  }

  const db = await pool.connect();
  try {
    const result = await saveWithdrawalPin(db, payload.sub, {
      pin: req.body?.pin,
      confirmPin: req.body?.confirmPin,
      currentPassword: req.body?.currentPassword,
      newPassword: req.body?.newPassword,
      confirmNewPassword: req.body?.confirmNewPassword,
    });
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.json({ message: result.message, withdrawalPin: result.withdrawalPin });
  } catch (error) {
    console.error("saveWithdrawalPinSettings failed:", error.message);
    if (isPinSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu schema PIN rút tiền. Chạy backend/sql/freelancer_withdrawal_pin.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể lưu PIN rút tiền." });
  } finally {
    db.release();
  }
}

async function confirmWithdrawalOrder(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "freelancer" && role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng hoặc freelancer được rút tiền về tài khoản." });
  }

  const orderId = String(req.params.orderId || "").trim();
  const pin = String(req.body?.pin || "");
  if (!orderId) {
    return res.status(400).json({ message: "Thiếu mã lệnh rút tiền." });
  }
  if (!pin) {
    return res.status(400).json({ message: "Vui lòng nhập mã PIN 6 số để xác nhận." });
  }

  const db = await pool.connect();
  try {
    const auth = await verifyWithdrawalPin(db, payload.sub, pin);
    if (!auth.ok) {
      return res.status(auth.status).json({ message: auth.message });
    }

    const result = await confirmWithdrawal(db, orderId, payload.sub);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    const accountRow = await loadAccountBalances(db, payload.sub);
    const earnings = await loadFreelancerEarningsSummary(db, payload.sub);
    return res.json({
      message:
        result.order.status === "SUCCEEDED"
          ? "Rút tiền thành công."
          : "Đang xử lý lệnh rút. Tiền sẽ chuyển vào tài khoản ngân hàng trong giây lát.",
      order: result.order,
      account: {
        balance: accountRow.balance,
        currency: accountRow.currency,
        pendingBalance: earnings.pendingBalance,
        totalEarned: earnings.totalEarned,
      },
    });
  } catch (error) {
    console.error("confirmWithdrawalOrder failed:", error.message);
    if (isWithdrawSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu schema rút tiền. Chạy backend/sql/freelancer_withdrawal_payos.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể xác nhận lệnh rút tiền." });
  } finally {
    db.release();
  }
}

async function getWithdrawalOrderStatus(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "freelancer" && role !== "client") {
    return res.status(403).json({ message: "Chỉ khách hàng hoặc freelancer được xem lệnh rút tiền." });
  }

  const orderId = String(req.params.orderId || "").trim();
  if (!orderId) {
    return res.status(400).json({ message: "Thiếu mã lệnh rút tiền." });
  }

  const db = await pool.connect();
  try {
    const owned = await db.query(
      `SELECT id FROM public.freelancer_withdrawal_orders
       WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [orderId, payload.sub],
    );
    if (owned.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy lệnh rút tiền." });
    }

    const order = await syncWithdrawalFromPayos(db, orderId);

    const accountRow = await loadAccountBalances(db, payload.sub);
    const earnings = await loadFreelancerEarningsSummary(db, payload.sub);
    return res.json({
      order,
      account: {
        balance: accountRow.balance,
        currency: accountRow.currency,
        pendingBalance: earnings.pendingBalance,
        totalEarned: earnings.totalEarned,
      },
    });
  } catch (error) {
    console.error("getWithdrawalOrderStatus failed:", error.message);
    if (isWithdrawSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu schema rút tiền. Chạy backend/sql/freelancer_withdrawal_payos.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể tải trạng thái lệnh rút tiền." });
  } finally {
    db.release();
  }
}

async function payosPayoutWebhook(req, res) {
  if (!isPayosConfigured()) {
    return res.status(503).json({ message: "payOS chưa được cấu hình." });
  }

  const db = await pool.connect();
  try {
    const result = await handlePayoutWebhook(db, req.body);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.status(200).json({ success: true, referenceId: result.referenceId, status: result.status });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("payosPayoutWebhook failed:", error.message);
    if (isWithdrawSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu schema rút tiền. Chạy backend/sql/freelancer_withdrawal_payos.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể xử lý webhook chi hộ payOS." });
  } finally {
    db.release();
  }
}

async function withdrawFreelancerFunds(req, res) {
  return res.status(400).json({
    message: "Vui lòng dùng luồng rút tiền mới: tạo lệnh rồi xác nhận bằng mật khẩu.",
  });
}

module.exports = {
  getBilling,
  updateBillingProfile,
  addBillingMethod,
  setDefaultBillingMethod,
  deleteBillingMethod,
  createPaymentLink,
  payosWebhook,
  getDepositOrderStatus,
  cancelDepositOrder,
  withdrawFreelancerFunds,
  requestWithdrawal,
  confirmWithdrawalOrder,
  getWithdrawalOrderStatus,
  getWithdrawalPinSettings,
  saveWithdrawalPinSettings,
  payosPayoutWebhook,
  saveFreelancerPayoutAccount,
  unlinkFreelancerPayoutAccount,
};
