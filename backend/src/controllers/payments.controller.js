const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");

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
  return {
    id: row.id,
    occurredAt: row.occurred_at || row.created_at,
    projectTitle: row.project_title || row.description || "—",
    clientName: row.client_name || "—",
    category: row.category || row.type || "other",
    amount: row.direction ? signedAmount : amount,
    currency: row.currency || "VND",
    reference: row.invoice_number || row.contract_id || null,
    jobId: row.job_id || null,
    clientId: row.client_id || null,
    contractId: row.contract_id || null,
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
       j.client_id
     FROM public.transactions t
     LEFT JOIN public.jobs j ON j.id = t.job_id
     LEFT JOIN public.user_profiles cup ON cup.user_id = j.client_id
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
  try {
    const row = await db.query(
      `SELECT u.email, up.full_name, up.phone
       FROM public.users u
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [userId],
    );
    const u = row.rows[0];
    return {
      contactName: u?.full_name || "",
      contactEmail: u?.email || "",
      contactPhone: u?.phone || "",
      bankName: "",
      accountLast4: "",
      isConfigured: false,
    };
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
    return {
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      bankName: "",
      accountLast4: "",
      isConfigured: false,
    };
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
    const transactions = await loadFreelancerTransactions(db, userId);
    const filterOptions = await loadFreelancerFilterOptions(transactions);
    const payoutProfile = await loadFreelancerPayoutProfile(db, userId);

    return res.json({
      role: "freelancer",
      account: {
        balance: account.balance,
        currency: account.currency,
        pendingBalance: earnings.pendingBalance,
        totalEarned: earnings.totalEarned,
      },
      payoutProfile,
      pendingItems,
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

    const defaultMethod = billingMethods.find((m) => m.isPrimary) || billingMethods[0] || null;

    return res.json({
      role: "client",
      account,
      billingProfile,
      billingMethods,
      defaultMethod,
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
    return res.status(403).json({ message: "Chỉ client hoặc freelancer được truy cập trang thanh toán." });
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

async function depositFunds(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "client") {
    return res.status(403).json({ message: "Chỉ tài khoản khách hàng được nạp tiền." });
  }

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 10000 || amount > 500_000_000) {
    return res.status(400).json({ message: "Số tiền nạp phải từ 10.000 đến 500.000.000 VND." });
  }

  const userId = payload.sub;
  const db = await pool.connect();

  try {
    await db.query("BEGIN");
    await ensureClientAccount(db, userId);

    await db.query(
      `UPDATE public.accounts
       SET balance = balance + $1
       WHERE user_id = $2 AND currency = 'VND'`,
      [amount, userId],
    );
    try {
      await db.query(
        `UPDATE public.accounts SET updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND currency = 'VND'`,
        [userId],
      );
    } catch (updErr) {
      if (!isMissingSchemaError(updErr)) throw updErr;
    }

    try {
      await db.query(
        `INSERT INTO public.transactions
           (user_id, amount, currency, direction, category, description, occurred_at, status, type)
         VALUES ($1, $2, 'VND', 'in', 'deposit', 'Nạp tiền vào ví', NOW(), 'completed', 'deposit')`,
        [userId, amount],
      );
    } catch (txErr) {
      if (!isMissingSchemaError(txErr)) throw txErr;
    }

    await db.query("COMMIT");
    const account = await loadAccountBalances(db, userId);
    return res.json({ message: "Đã nạp tiền vào ví.", account });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("depositFunds failed:", error.message);
    return res.status(500).json({ message: "Không thể nạp tiền lúc này." });
  } finally {
    db.release();
  }
}

async function withdrawFreelancerFunds(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const role = String(payload.role || "").toLowerCase();
  if (role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer được rút tiền về tài khoản." });
  }

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 100000 || amount > 500_000_000) {
    return res.status(400).json({ message: "Số tiền rút phải từ 100.000 đến 500.000.000 VND." });
  }

  const userId = payload.sub;
  const db = await pool.connect();

  try {
    await db.query("BEGIN");
    await ensureClientAccount(db, userId);

    const acc = await db.query(
      `SELECT balance FROM public.accounts WHERE user_id = $1 AND currency = 'VND' FOR UPDATE`,
      [userId],
    );
    const balance = Number(acc.rows[0]?.balance) || 0;
    if (balance < amount) {
      await db.query("ROLLBACK");
      return res.status(409).json({
        message: `Số dư khả dụng không đủ (hiện có ${balance} VND).`,
      });
    }

    await db.query(
      `UPDATE public.accounts SET balance = balance - $1 WHERE user_id = $2 AND currency = 'VND'`,
      [amount, userId],
    );
    try {
      await db.query(
        `UPDATE public.accounts SET updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND currency = 'VND'`,
        [userId],
      );
    } catch (updErr) {
      if (!isMissingSchemaError(updErr)) throw updErr;
    }

    try {
      await db.query(
        `INSERT INTO public.transactions
           (user_id, amount, currency, direction, category, description, occurred_at, status, type)
         VALUES ($1, $2, 'VND', 'out', 'withdraw', 'Rút tiền về tài khoản ngân hàng', NOW(), 'completed', 'withdraw')`,
        [userId, amount],
      );
    } catch (txErr) {
      if (!isMissingSchemaError(txErr)) throw txErr;
    }

    await db.query("COMMIT");
    const accountRow = await loadAccountBalances(db, userId);
    const earnings = await loadFreelancerEarningsSummary(db, userId);
    return res.json({
      message: "Đã ghi nhận yêu cầu rút tiền. Tiền sẽ chuyển trong 1–3 ngày làm việc.",
      account: {
        balance: accountRow.balance,
        currency: accountRow.currency,
        pendingBalance: earnings.pendingBalance,
        totalEarned: earnings.totalEarned,
      },
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("withdrawFreelancerFunds failed:", error.message);
    return res.status(500).json({ message: "Không thể rút tiền lúc này." });
  } finally {
    db.release();
  }
}

module.exports = {
  getBilling,
  updateBillingProfile,
  depositFunds,
  withdrawFreelancerFunds,
};
