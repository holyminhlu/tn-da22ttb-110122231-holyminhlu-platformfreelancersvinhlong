const {
  buildPayosDescription,
  getFrontendUrl,
  getPayosClient,
  isPayosConfigured,
} = require("../utils/payosClient");

function isMissingSchemaError(err) {
  return err?.code === "42703" || err?.code === "42P01";
}

const VERIFICATION_DEPOSIT_AMOUNT = 10_000;
const ORDER_TYPE_DEPOSIT = "DEPOSIT";
const ORDER_TYPE_IDENTITY_VERIFY = "IDENTITY_VERIFY";

async function ensureUserAccount(db, userId) {
  await db.query(
    `INSERT INTO public.accounts (user_id, balance, currency)
     VALUES ($1, 0, 'VND')
     ON CONFLICT (user_id, currency) DO NOTHING`,
    [userId],
  );
}

/** orderCode duy nhất (≤ 53 bit) — timestamp ms + 3 chữ số ngẫu nhiên. */
function generateOrderCode() {
  const suffix = Math.floor(Math.random() * 1000);
  return Number(`${Date.now()}${String(suffix).padStart(3, "0")}`);
}

async function createWalletDepositOrder(db, userId, amount, type = ORDER_TYPE_DEPOSIT) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderCode = generateOrderCode();
    try {
      const inserted = await db.query(
        `INSERT INTO public.wallet_deposit_orders (user_id, order_code, amount, type, status)
         VALUES ($1, $2, $3, $4, 'PENDING')
         RETURNING id, order_code, amount, status, type`,
        [userId, orderCode, amount, type],
      );
      return inserted.rows[0];
    } catch (err) {
      if (err?.code === "23505") continue;
      throw err;
    }
  }
  throw new Error("Không thể tạo mã đơn nạp tiền. Vui lòng thử lại.");
}

async function markIdentityCardVerified(db, userId, amount) {
  await db.query(
    `INSERT INTO public.identity_verifications (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  await db.query(
    `UPDATE public.identity_verifications
     SET card_verified_at = CURRENT_TIMESTAMP,
         card_added_at = COALESCE(card_added_at, CURRENT_TIMESTAMP),
         card_charge_cents = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND card_verified_at IS NULL`,
    [userId, Math.round(Number(amount))],
  );
}

async function createPayosPaymentLink(db, userId, amount, options = {}) {
  const type = options.type || ORDER_TYPE_DEPOSIT;
  const order = await createWalletDepositOrder(db, userId, amount, type);
  const orderCode = Number(order.order_code);
  const frontend = getFrontendUrl();
  const returnPath = options.returnPath || "/payments/success";
  const cancelPath = options.cancelPath || "/payments/cancel";
  const returnUrl = `${frontend}${returnPath}${returnPath.includes("?") ? "&" : "?"}orderCode=${orderCode}`;
  const cancelUrl = `${frontend}${cancelPath}${cancelPath.includes("?") ? "&" : "?"}orderCode=${orderCode}`;
  const isIdentityVerify = type === ORDER_TYPE_IDENTITY_VERIFY;
  const description = isIdentityVerify
    ? `Xac minh the VLC ${orderCode}`.slice(0, 25)
    : buildPayosDescription(orderCode);

  const payos = getPayosClient();
  const paymentLink = await payos.paymentRequests.create({
    orderCode,
    amount: Math.round(Number(amount)),
    description,
    returnUrl,
    cancelUrl,
    items: [
      {
        name: isIdentityVerify ? "Xác minh thẻ tín dụng VLC" : "Nạp tiền ví VLC",
        quantity: 1,
        price: Math.round(Number(amount)),
      },
    ],
  });

  await db.query(
    `UPDATE public.wallet_deposit_orders
     SET payment_link_id = $2,
         checkout_url = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE order_code = $1`,
    [
      orderCode,
      paymentLink.paymentLinkId || paymentLink.id || null,
      paymentLink.checkoutUrl || paymentLink.checkout_url || null,
    ],
  );

  return {
    orderCode,
    amount: Number(order.amount),
    type,
    checkoutUrl: paymentLink.checkoutUrl || paymentLink.checkout_url,
    paymentLinkId: paymentLink.paymentLinkId || paymentLink.id || null,
  };
}

async function createIdentityVerifyPaymentLink(db, userId) {
  const pending = await db.query(
    `SELECT order_code, amount, checkout_url, status
     FROM public.wallet_deposit_orders
     WHERE user_id = $1 AND type = $2 AND status = 'PENDING'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, ORDER_TYPE_IDENTITY_VERIFY],
  );
  const existing = pending.rows[0];
  if (existing?.checkout_url) {
    return {
      orderCode: Number(existing.order_code),
      amount: Number(existing.amount),
      type: ORDER_TYPE_IDENTITY_VERIFY,
      checkoutUrl: existing.checkout_url,
      paymentLinkId: null,
      reused: true,
    };
  }

  return createPayosPaymentLink(db, userId, VERIFICATION_DEPOSIT_AMOUNT, {
    type: ORDER_TYPE_IDENTITY_VERIFY,
    returnPath: "/edit-account/xac-minh?verifyPayment=success",
    cancelPath: "/edit-account/xac-minh?verifyPayment=cancel",
  });
}

async function completeWalletDeposit(db, orderCode, payosMeta = {}) {
  try {
    await db.query("BEGIN");

    const orderRes = await db.query(
    `SELECT id, user_id, amount, status, transaction_id, type
     FROM public.wallet_deposit_orders
     WHERE order_code = $1
     FOR UPDATE`,
    [orderCode],
  );

  if (orderRes.rowCount === 0) {
    await db.query("ROLLBACK");
    return { ok: false, reason: "not_found" };
  }

  const order = orderRes.rows[0];
  if (order.status === "SUCCESS") {
    await db.query("ROLLBACK");
    return { ok: true, already: true, userId: order.user_id, amount: Number(order.amount) };
  }

  if (order.status === "CANCELLED") {
    await db.query("ROLLBACK");
    return { ok: false, reason: "cancelled" };
  }

  const amount = Number(order.amount);
  if (payosMeta.amount != null && Math.round(Number(payosMeta.amount)) !== Math.round(amount)) {
    await db.query("ROLLBACK");
    return { ok: false, reason: "amount_mismatch" };
  }

  await ensureUserAccount(db, order.user_id);
  await db.query(
    `UPDATE public.accounts
     SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $2 AND currency = 'VND'`,
    [amount, order.user_id],
  );

  const orderType = String(order.type || ORDER_TYPE_DEPOSIT);
  const txCategory = orderType === ORDER_TYPE_IDENTITY_VERIFY ? "deposit" : "deposit";
  const txDescription =
    orderType === ORDER_TYPE_IDENTITY_VERIFY
      ? `Xác minh thẻ tín dụng qua payOS #${orderCode}`
      : `Nạp tiền qua payOS #${orderCode}`;

  let transactionId = order.transaction_id;
  if (!transactionId) {
    const idempotencyKey = `payos-${orderType.toLowerCase()}-${orderCode}`;
    const existingTx = await db.query(
      `SELECT id FROM public.transactions WHERE idempotency_key = $1 LIMIT 1`,
      [idempotencyKey],
    );
    if (existingTx.rowCount > 0) {
      transactionId = existingTx.rows[0].id;
    } else {
      try {
        const tx = await db.query(
          `INSERT INTO public.transactions
             (user_id, amount, currency, direction, category, description, occurred_at, status, type, idempotency_key)
           VALUES ($1, $2, 'VND', 'in', $5, $3, NOW(), 'completed', 'deposit', $4)
           RETURNING id`,
          [order.user_id, amount, txDescription, idempotencyKey, txCategory],
        );
        transactionId = tx.rows[0]?.id || null;
      } catch (err) {
        if (err?.code === "23505") {
          const again = await db.query(
            `SELECT id FROM public.transactions WHERE idempotency_key = $1 LIMIT 1`,
            [idempotencyKey],
          );
          transactionId = again.rows[0]?.id || null;
        } else if (!isMissingSchemaError(err)) {
          throw err;
        }
      }
    }
  }

  await db.query(
    `UPDATE public.wallet_deposit_orders
     SET status = 'SUCCESS',
         paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP,
         payos_reference = COALESCE($2, payos_reference),
         transaction_id = COALESCE($3, transaction_id)
     WHERE order_code = $1`,
    [orderCode, payosMeta.reference || null, transactionId],
  );

  if (orderType === ORDER_TYPE_IDENTITY_VERIFY) {
    await markIdentityCardVerified(db, order.user_id, amount);
  }

    await db.query("COMMIT");
    return { ok: true, userId: order.user_id, amount };
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  }
}

async function cancelWalletDepositOrder(db, orderCode, reason = null) {
  const result = await db.query(
    `UPDATE public.wallet_deposit_orders
     SET status = 'CANCELLED',
         cancel_reason = COALESCE($2, cancel_reason),
         updated_at = CURRENT_TIMESTAMP
     WHERE order_code = $1 AND status = 'PENDING'
     RETURNING order_code`,
    [orderCode, reason],
  );
  return result.rowCount > 0;
}

async function getWalletDepositOrderForUser(db, orderCode, userId) {
  const result = await db.query(
    `SELECT order_code, amount, status, type, paid_at, created_at, checkout_url
     FROM public.wallet_deposit_orders
     WHERE order_code = $1 AND user_id = $2
     LIMIT 1`,
    [orderCode, userId],
  );
  return result.rows[0] || null;
}

function isPayosPaymentComplete(paymentInfo, expectedAmount) {
  const status = String(paymentInfo?.status || "").toUpperCase();
  const amountPaid = Number(paymentInfo?.amountPaid ?? paymentInfo?.amount_paid ?? 0);
  const amount = Number(paymentInfo?.amount ?? expectedAmount ?? 0);

  if (status === "PAID" || status === "SUCCESS") return true;
  if (Number.isFinite(amountPaid) && Number.isFinite(amount) && amount > 0 && amountPaid >= amount) {
    return true;
  }
  return false;
}

/** Đồng bộ trạng thái từ payOS khi webhook chưa tới (localhost / mạng). */
async function syncWalletDepositFromPayos(db, orderCode) {
  if (!isPayosConfigured()) {
    return { synced: false, reason: "not_configured" };
  }

  const orderRes = await db.query(
    `SELECT order_code, amount, status
     FROM public.wallet_deposit_orders
     WHERE order_code = $1
     LIMIT 1`,
    [orderCode],
  );
  if (orderRes.rowCount === 0) {
    return { synced: false, reason: "not_found" };
  }

  const order = orderRes.rows[0];
  if (order.status === "SUCCESS") {
    return { synced: true, already: true };
  }
  if (order.status === "CANCELLED") {
    return { synced: false, reason: "cancelled" };
  }
  if (order.status !== "PENDING") {
    return { synced: false, reason: "unexpected_status" };
  }

  try {
    const payos = getPayosClient();
    const paymentInfo = await payos.paymentRequests.get(orderCode);
    if (!isPayosPaymentComplete(paymentInfo, Number(order.amount))) {
      return { synced: false, reason: "not_paid" };
    }

    const result = await completeWalletDeposit(db, orderCode, {
      amount: paymentInfo?.amount ?? order.amount,
      reference:
        paymentInfo?.id ??
        paymentInfo?.paymentLinkId ??
        paymentInfo?.payment_link_id ??
        null,
    });
    return { synced: Boolean(result.ok), ...result };
  } catch (err) {
    console.error("syncWalletDepositFromPayos failed:", err.message);
    return { synced: false, reason: "payos_error", error: err.message };
  }
}

module.exports = {
  isMissingSchemaError,
  ensureUserAccount,
  ensureClientAccount: ensureUserAccount,
  createPayosPaymentLink,
  createIdentityVerifyPaymentLink,
  completeWalletDeposit,
  cancelWalletDepositOrder,
  getWalletDepositOrderForUser,
  syncWalletDepositFromPayos,
  VERIFICATION_DEPOSIT_AMOUNT,
  ORDER_TYPE_DEPOSIT,
  ORDER_TYPE_IDENTITY_VERIFY,
};
