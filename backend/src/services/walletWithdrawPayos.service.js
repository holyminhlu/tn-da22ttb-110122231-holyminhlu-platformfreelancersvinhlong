const crypto = require("crypto");
const {
  isPayosPayoutConfigured,
  getPayosPayoutCredentials,
  mapPayosPayoutError,
} = require("../utils/payosClient");
const { createPayoutSignature, verifyPayoutWebhookSignature } = require("../utils/payosPayoutSignature");
const { resolveBankBin } = require("../utils/vnBankBins");

const PAYOS_PAYOUT_BASE = "https://api-merchant.payos.vn";
const MIN_WITHDRAW = 10_000;
const MAX_WITHDRAW = 500_000_000;
const WITHDRAW_DESCRIPTION = "VLC giai ngan thu nhap";

function isMissingSchemaError(err) {
  return err?.code === "42703" || err?.code === "42P01";
}

function generateReferenceId() {
  return `vlc_wd_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function normalizePayosTransactions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") return Object.values(raw);
  return [];
}

function extractPayoutState(payoutData) {
  const txs = normalizePayosTransactions(payoutData?.transactions);
  const tx = txs[0];
  const txState = String(tx?.state || payoutData?.approvalState || "").toUpperCase();
  return {
    payoutId: payoutData?.id || null,
    txId: tx?.id || null,
    txState,
    approvalState: String(payoutData?.approvalState || "").toUpperCase(),
  };
}

function isPayoutSucceeded(state) {
  const s = String(state || "").toUpperCase();
  return s === "SUCCEEDED" || s === "SUCCESS" || s === "COMPLETED";
}

function isPayoutFailed(state) {
  const s = String(state || "").toUpperCase();
  return s === "FAILED" || s === "CANCELLED" || s === "CANCELED" || s === "EXPIRED" || s === "REJECTED";
}

async function payosPayoutRequest(path, method, body = null) {
  const { clientId, apiKey, checksumKey } = getPayosPayoutCredentials();

  const headers = {
    "x-client-id": clientId,
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  };

  let payload = body;
  if (body && method !== "GET") {
    const signature = createPayoutSignature(checksumKey, body);
    headers["x-signature"] = signature;
    headers["x-idempotency-key"] = crypto.randomUUID();
  }

  const res = await fetch(`${PAYOS_PAYOUT_BASE}${path}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || String(json?.code) !== "00") {
    const raw = json?.desc || json?.message || `payOS payout HTTP ${res.status}`;
    throw new Error(mapPayosPayoutError(raw));
  }
  return json.data;
}

async function createPayosPayout({ referenceId, amount, description, toBin, toAccountNumber }) {
  return payosPayoutRequest("/v1/payouts", "POST", {
    referenceId,
    amount: Math.round(Number(amount)),
    description: String(description || WITHDRAW_DESCRIPTION).slice(0, 25),
    toBin: String(toBin),
    toAccountNumber: String(toAccountNumber),
    category: ["salary"],
  });
}

async function fetchPayosPayoutByReference(referenceId) {
  const encoded = encodeURIComponent(referenceId);
  return payosPayoutRequest(`/v1/payouts?referenceId=${encoded}`, "GET");
}

async function loadPayoutAccountForWithdraw(db, userId) {
  const result = await db.query(
    `SELECT bank_name, bank_bin, account_holder_name, account_number
     FROM public.freelancer_payout_accounts
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return null;

  const accountNumber = String(row.account_number || "").replace(/\D/g, "");
  const toBin = row.bank_bin || resolveBankBin(row.bank_name);
  if (!toBin || accountNumber.length < 6) return null;

  return {
    bankName: row.bank_name,
    accountHolderName: row.account_holder_name,
    accountNumber,
    accountLast4: accountNumber.slice(-4),
    toBin,
  };
}

async function getWithdrawalOrderForUser(db, orderId, userId) {
  const result = await db.query(
    `SELECT *
     FROM public.freelancer_withdrawal_orders
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [orderId, userId],
  );
  return result.rows[0] || null;
}

async function getWithdrawalOrderByReference(db, referenceId) {
  const result = await db.query(
    `SELECT *
     FROM public.freelancer_withdrawal_orders
     WHERE reference_id = $1
     LIMIT 1`,
    [referenceId],
  );
  return result.rows[0] || null;
}

function serializeWithdrawalOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    referenceId: row.reference_id,
    amount: Number(row.amount),
    status: row.status,
    bankName: row.bank_name,
    accountHolderName: row.account_holder_name,
    accountLast4: row.account_last4,
    payosPayoutId: row.payos_payout_id,
    payosTxState: row.payos_tx_state,
    failureReason: row.failure_reason,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createWithdrawalRequest(db, userId, amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < MIN_WITHDRAW || numericAmount > MAX_WITHDRAW) {
    return {
      ok: false,
      status: 400,
      message: `Số tiền rút phải từ ${MIN_WITHDRAW.toLocaleString("vi-VN")} đến ${MAX_WITHDRAW.toLocaleString("vi-VN")} VND.`,
    };
  }

  const payout = await loadPayoutAccountForWithdraw(db, userId);
  if (!payout) {
    return {
      ok: false,
      status: 400,
      message: "Bạn chưa liên kết tài khoản ngân hàng hoặc ngân hàng chưa hỗ trợ chi hộ.",
    };
  }

  await db.query(
    `INSERT INTO public.accounts (user_id, balance, currency)
     VALUES ($1, 0, 'VND')
     ON CONFLICT (user_id, currency) DO NOTHING`,
    [userId],
  );

  const acc = await db.query(
    `SELECT balance FROM public.accounts WHERE user_id = $1 AND currency = 'VND' LIMIT 1`,
    [userId],
  );
  const balance = Number(acc.rows[0]?.balance) || 0;
  if (balance < numericAmount) {
    return {
      ok: false,
      status: 409,
      message: `Số dư khả dụng không đủ (hiện có ${balance.toLocaleString("vi-VN")} VND).`,
    };
  }

  const pending = await db.query(
    `SELECT id FROM public.freelancer_withdrawal_orders
     WHERE user_id = $1 AND status IN ('PENDING_AUTH', 'PROCESSING')
     LIMIT 1`,
    [userId],
  );
  if (pending.rowCount > 0) {
    return {
      ok: false,
      status: 409,
      message: "Bạn đang có lệnh rút tiền chưa hoàn tất. Vui lòng đợi xử lý xong.",
    };
  }

  const referenceId = generateReferenceId();
  const inserted = await db.query(
    `INSERT INTO public.freelancer_withdrawal_orders
       (user_id, reference_id, amount, status, bank_name, account_holder_name,
        account_last4, to_bin, to_account_number, description)
     VALUES ($1, $2, $3, 'PENDING_AUTH', $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      referenceId,
      numericAmount,
      payout.bankName,
      payout.accountHolderName,
      payout.accountLast4,
      payout.toBin,
      payout.accountNumber,
      WITHDRAW_DESCRIPTION,
    ],
  );

  return { ok: true, order: serializeWithdrawalOrder(inserted.rows[0]) };
}

async function deductBalanceForWithdraw(db, userId, amount) {
  const acc = await db.query(
    `SELECT balance FROM public.accounts WHERE user_id = $1 AND currency = 'VND' FOR UPDATE`,
    [userId],
  );
  const balance = Number(acc.rows[0]?.balance) || 0;
  if (balance < amount) {
    return { ok: false, message: `Số dư khả dụng không đủ (hiện có ${balance.toLocaleString("vi-VN")} VND).` };
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

  return { ok: true, balanceBefore: balance };
}

async function refundBalanceForWithdraw(db, userId, amount) {
  await db.query(
    `UPDATE public.accounts SET balance = balance + $1 WHERE user_id = $2 AND currency = 'VND'`,
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
}

async function insertWithdrawTransaction(db, userId, amount, referenceId, status = "processing") {
  const inserted = await db.query(
    `INSERT INTO public.transactions
       (user_id, amount, currency, direction, category, description, occurred_at, status, type)
     VALUES ($1, $2, 'VND', 'out', 'withdraw', $3, NOW(), $4, 'withdraw')
     RETURNING id`,
    [userId, amount, `Rút tiền về ${referenceId}`, status],
  );
  return inserted.rows[0]?.id || null;
}

async function markWithdrawalSucceeded(db, order, payosMeta = {}) {
  if (order.status === "SUCCEEDED") return { ok: true, already: true };

  await db.query(
    `UPDATE public.freelancer_withdrawal_orders
     SET status = 'SUCCEEDED',
         payos_payout_id = COALESCE($2, payos_payout_id),
         payos_tx_id = COALESCE($3, payos_tx_id),
         payos_tx_state = COALESCE($4, payos_tx_state),
         paid_at = COALESCE(paid_at, NOW()),
         updated_at = NOW()
     WHERE id = $1`,
    [order.id, payosMeta.payoutId, payosMeta.txId, payosMeta.txState],
  );

  if (order.transaction_id) {
    try {
      await db.query(
        `UPDATE public.transactions SET status = 'completed' WHERE id = $1`,
        [order.transaction_id],
      );
    } catch (txErr) {
      if (!isMissingSchemaError(txErr)) throw txErr;
    }
  }

  return { ok: true };
}

async function markWithdrawalFailed(db, order, reason, refund = true) {
  if (order.status === "FAILED") return { ok: true, already: true };

  if (refund && order.status !== "FAILED") {
    await refundBalanceForWithdraw(db, order.user_id, Number(order.amount));
  }

  await db.query(
    `UPDATE public.freelancer_withdrawal_orders
     SET status = 'FAILED',
         failure_reason = $2,
         payos_tx_state = COALESCE($3, payos_tx_state),
         updated_at = NOW()
     WHERE id = $1`,
    [order.id, reason || "Chi hộ thất bại", order.payos_tx_state],
  );

  if (order.transaction_id) {
    try {
      await db.query(
        `UPDATE public.transactions SET status = 'failed', description = COALESCE(description, '') || ' — thất bại'
         WHERE id = $1`,
        [order.transaction_id],
      );
    } catch (txErr) {
      if (!isMissingSchemaError(txErr)) throw txErr;
    }
  }

  return { ok: true };
}

async function confirmWithdrawal(db, orderId, userId) {
  const orderRow = await getWithdrawalOrderForUser(db, orderId, userId);
  if (!orderRow) {
    return { ok: false, status: 404, message: "Không tìm thấy lệnh rút tiền." };
  }
  if (orderRow.status !== "PENDING_AUTH") {
    return { ok: false, status: 409, message: "Lệnh rút tiền không còn ở trạng thái chờ xác nhận." };
  }

  await db.query("BEGIN");

  try {
    const deduct = await deductBalanceForWithdraw(db, userId, Number(orderRow.amount));
    if (!deduct.ok) {
      await db.query("ROLLBACK");
      return { ok: false, status: 409, message: deduct.message };
    }

    const txId = await insertWithdrawTransaction(
      db,
      userId,
      Number(orderRow.amount),
      orderRow.reference_id,
      "processing",
    );

    await db.query(
      `UPDATE public.freelancer_withdrawal_orders
       SET auth_verified_at = NOW(),
           transaction_id = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [orderRow.id, txId],
    );

    let payosMeta = { payoutId: null, txId: null, txState: "PROCESSING" };

    if (isPayosPayoutConfigured()) {
      try {
        const payoutData = await createPayosPayout({
          referenceId: orderRow.reference_id,
          amount: orderRow.amount,
          description: orderRow.description || WITHDRAW_DESCRIPTION,
          toBin: orderRow.to_bin,
          toAccountNumber: orderRow.to_account_number,
        });
        payosMeta = extractPayoutState(payoutData);
      } catch (payosErr) {
        await refundBalanceForWithdraw(db, userId, Number(orderRow.amount));
        await db.query(
          `UPDATE public.freelancer_withdrawal_orders
           SET status = 'FAILED', failure_reason = $2, updated_at = NOW()
           WHERE id = $1`,
          [orderRow.id, payosErr.message || "Không thể gửi lệnh chi hộ payOS."],
        );
        if (txId) {
          try {
            await db.query(`UPDATE public.transactions SET status = 'failed' WHERE id = $1`, [txId]);
          } catch (txErr) {
            if (!isMissingSchemaError(txErr)) throw txErr;
          }
        }
        await db.query("COMMIT");
        return {
          ok: false,
          status: 502,
          message: payosErr.message || "Không thể gửi lệnh chi hộ. Vui lòng thử lại sau.",
        };
      }
    } else {
      payosMeta = { payoutId: null, txId: null, txState: "SUCCEEDED" };
    }

    const nextStatus = isPayoutSucceeded(payosMeta.txState) ? "SUCCEEDED" : "PROCESSING";

    await db.query(
      `UPDATE public.freelancer_withdrawal_orders
       SET status = $2,
           payos_payout_id = $3,
           payos_tx_id = $4,
           payos_tx_state = $5,
           paid_at = CASE WHEN $2 = 'SUCCEEDED' THEN NOW() ELSE paid_at END,
           updated_at = NOW()
       WHERE id = $1`,
      [orderRow.id, nextStatus, payosMeta.payoutId, payosMeta.txId, payosMeta.txState],
    );

    if (nextStatus === "SUCCEEDED" && txId) {
      try {
        await db.query(`UPDATE public.transactions SET status = 'completed' WHERE id = $1`, [txId]);
      } catch (txErr) {
        if (!isMissingSchemaError(txErr)) throw txErr;
      }
    }

    await db.query("COMMIT");

    const updated = await getWithdrawalOrderForUser(db, orderId, userId);
    return { ok: true, order: serializeWithdrawalOrder(updated) };
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  }
}

async function syncWithdrawalFromPayos(db, orderId) {
  const orderRow = await db.query(
    `SELECT * FROM public.freelancer_withdrawal_orders WHERE id = $1 LIMIT 1`,
    [orderId],
  );
  const order = orderRow.rows[0];
  if (!order || order.status !== "PROCESSING" || !isPayosPayoutConfigured()) {
    return serializeWithdrawalOrder(order);
  }

  try {
    const listData = await fetchPayosPayoutByReference(order.reference_id);
    const payouts = normalizePayosTransactions(listData?.payouts || listData);
    const payoutData = payouts[0] || listData;
    if (!payoutData) return serializeWithdrawalOrder(order);

    const payosMeta = extractPayoutState(payoutData);

    await db.query("BEGIN");
    try {
      if (isPayoutSucceeded(payosMeta.txState)) {
        await db.query(
          `UPDATE public.freelancer_withdrawal_orders
           SET payos_payout_id = COALESCE($2, payos_payout_id),
               payos_tx_id = COALESCE($3, payos_tx_id),
               payos_tx_state = $4,
               updated_at = NOW()
           WHERE id = $1`,
          [order.id, payosMeta.payoutId, payosMeta.txId, payosMeta.txState],
        );
        await markWithdrawalSucceeded(db, order, payosMeta);
      } else if (isPayoutFailed(payosMeta.txState)) {
        await markWithdrawalFailed(db, order, `Chi hộ thất bại (${payosMeta.txState})`, true);
        await db.query(
          `UPDATE public.freelancer_withdrawal_orders
           SET payos_payout_id = COALESCE($2, payos_payout_id),
               payos_tx_id = COALESCE($3, payos_tx_id),
               payos_tx_state = $4,
               updated_at = NOW()
           WHERE id = $1`,
          [order.id, payosMeta.payoutId, payosMeta.txId, payosMeta.txState],
        );
      } else {
        await db.query(
          `UPDATE public.freelancer_withdrawal_orders
           SET payos_payout_id = COALESCE($2, payos_payout_id),
               payos_tx_id = COALESCE($3, payos_tx_id),
               payos_tx_state = $4,
               updated_at = NOW()
           WHERE id = $1`,
          [order.id, payosMeta.payoutId, payosMeta.txId, payosMeta.txState],
        );
      }
      await db.query("COMMIT");
    } catch (innerErr) {
      await db.query("ROLLBACK").catch(() => {});
      throw innerErr;
    }
  } catch (syncErr) {
    console.error("syncWithdrawalFromPayos failed:", syncErr.message);
  }

  const refreshed = await db.query(
    `SELECT * FROM public.freelancer_withdrawal_orders WHERE id = $1 LIMIT 1`,
    [orderId],
  );
  return serializeWithdrawalOrder(refreshed.rows[0]);
}

async function handlePayoutWebhook(db, body) {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  const data = body?.data;
  const signature = body?.signature;

  if (!verifyPayoutWebhookSignature(checksumKey, data, signature)) {
    return { ok: false, status: 400, message: "Webhook chi hộ không hợp lệ." };
  }

  const referenceId =
    data?.referenceId ||
    normalizePayosTransactions(data?.transactions)[0]?.referenceId ||
    null;
  if (!referenceId) {
    return { ok: false, status: 400, message: "Thiếu referenceId trong webhook chi hộ." };
  }

  const order = await getWithdrawalOrderByReference(db, referenceId);
  if (!order) {
    return { ok: false, status: 404, message: "Không tìm thấy lệnh rút tiền." };
  }

  const payosMeta = extractPayoutState(data);

  await db.query("BEGIN");
  try {
    if (isPayoutSucceeded(payosMeta.txState)) {
      await markWithdrawalSucceeded(db, order, payosMeta);
    } else if (isPayoutFailed(payosMeta.txState)) {
      await markWithdrawalFailed(db, order, data?.desc || data?.message || payosMeta.txState, true);
    } else {
      await db.query(
        `UPDATE public.freelancer_withdrawal_orders
         SET payos_payout_id = COALESCE($2, payos_payout_id),
             payos_tx_id = COALESCE($3, payos_tx_id),
             payos_tx_state = $4,
             status = 'PROCESSING',
             updated_at = NOW()
         WHERE id = $1`,
        [order.id, payosMeta.payoutId, payosMeta.txId, payosMeta.txState],
      );
    }
    await db.query("COMMIT");
    return { ok: true, referenceId, status: payosMeta.txState };
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  }
}

module.exports = {
  MIN_WITHDRAW,
  MAX_WITHDRAW,
  isMissingSchemaError: isMissingSchemaError,
  createWithdrawalRequest,
  confirmWithdrawal,
  syncWithdrawalFromPayos,
  handlePayoutWebhook,
  getWithdrawalOrderForUser,
  serializeWithdrawalOrder,
  resolveBankBin,
};
