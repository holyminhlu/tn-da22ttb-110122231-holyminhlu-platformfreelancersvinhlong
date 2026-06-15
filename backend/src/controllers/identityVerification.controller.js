const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { uploadIdentityFile } = require("../middleware/identityUpload");
const { isPayosConfigured } = require("../utils/payosClient");
const {
  createIdentityVerifyPaymentLink,
  getWalletDepositOrderForUser,
  syncWalletDepositFromPayos,
  cancelWalletDepositOrder,
  ORDER_TYPE_IDENTITY_VERIFY,
  isMissingSchemaError: isWalletSchemaError,
} = require("../services/walletDepositPayos.service");
const { notifyIdentityReviewSubmitted } = require("../utils/notificationService");

function detectCardBrand(digits) {
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return "card";
}

function luhnCheck(digits) {
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

function parseExpiry(expiry) {
  const m = String(expiry || "")
    .trim()
    .match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return null;
  const expEnd = new Date(year, month, 0, 23, 59, 59);
  if (expEnd < new Date()) return null;
  return `${m[1]}/${m[2]}`;
}


function mapRow(row) {
  if (!row) return null;
  return {
    user_id: row.user_id,
    account_type: row.account_type,
    use_existing_account_info: row.use_existing_account_info,
    legal_first_name: row.legal_first_name,
    legal_last_name: row.legal_last_name,
    address_search: row.address_search,
    address_street: row.address_street,
    address_country: row.address_country,
    address_state: row.address_state,
    address_city: row.address_city,
    address_postal: row.address_postal,
    address_lat: row.address_lat != null ? Number(row.address_lat) : null,
    address_lng: row.address_lng != null ? Number(row.address_lng) : null,
    contact_confirmed: Boolean(row.contact_confirmed),
    contact_confirmed_at: row.contact_confirmed_at,
    selfie_url: row.selfie_url,
    id_doc_type: row.id_doc_type,
    id_front_url: row.id_front_url,
    id_back_url: row.id_back_url,
    address_proof_type: row.address_proof_type,
    address_proof_url: row.address_proof_url,
    phone_submitted_at: row.phone_submitted_at,
    photo_submitted_at: row.photo_submitted_at,
    id_submitted_at: row.id_submitted_at,
    address_proof_submitted_at: row.address_proof_submitted_at,
    submitted_for_review_at: row.submitted_for_review_at,
    card_last4: row.card_last4,
    card_brand: row.card_brand,
    card_expiry: row.card_expiry,
    cardholder_name: row.cardholder_name,
    is_business_card: Boolean(row.is_business_card),
    billing_street: row.billing_street,
    billing_country: row.billing_country,
    billing_state: row.billing_state,
    billing_city: row.billing_city,
    billing_postal: row.billing_postal,
    billing_phone: row.billing_phone,
    billing_currency: row.billing_currency,
    card_charge_cents: row.card_charge_cents,
    card_added_at: row.card_added_at,
    card_verified_at: row.card_verified_at,
    admin_review_status: row.admin_review_status,
    admin_reviewed_at: row.admin_reviewed_at,
    admin_review_note: row.admin_review_note,
  };
}

function parseOptionalCoord(raw) {
  if (raw === undefined) return undefined;
  if (raw === null || String(raw).trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

async function ensureRow(db, userId) {
  await db.query(
    `INSERT INTO public.identity_verifications (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
}

async function getIdentityVerification(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const db = await pool.connect();

  try {
    await ensureRow(db, userId);

    const [idvRes, profileRes] = await Promise.all([
      db.query(`SELECT * FROM public.identity_verifications WHERE user_id = $1 LIMIT 1`, [userId]),
      db.query(
        `SELECT up.full_name, up.phone, up.avatar_url, up.bio, up.district_city,
                u.is_phone_verified, u.is_email_verified
         FROM public.users u
         LEFT JOIN public.user_profiles up ON up.user_id = u.id
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [userId],
      ),
    ]);

    const profile = profileRes.rows[0] || {};
    const idv = mapRow(idvRes.rows[0]);

    return res.json({
      verification: idv,
      profile: {
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        district_city: profile.district_city,
        is_phone_verified: Boolean(profile.is_phone_verified),
        is_email_verified: Boolean(profile.is_email_verified),
      },
    });
  } catch (error) {
    console.error("Get identity verification failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng identity_verifications. Chạy backend/sql/identity_verification.sql.",
      });
    }
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột địa chỉ GPS. Chạy backend/sql/identity_verification_address_geo.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải xác minh danh tính." });
  } finally {
    db.release();
  }
}

async function patchIdentityVerification(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const body = req.body || {};
  const db = await pool.connect();

  try {
    await ensureRow(db, userId);
    await db.query("BEGIN");

    const sets = [];
    const params = [userId];
    let idx = 2;

    const stringFields = [
      ["account_type", "account_type", 20],
      ["legal_first_name", "legalFirstName", 100],
      ["legal_last_name", "legalLastName", 100],
      ["address_search", "addressSearch", 255],
      ["address_street", "addressStreet", 255],
      ["address_country", "addressCountry", 100],
      ["address_state", "addressState", 100],
      ["address_city", "addressCity", 100],
      ["address_postal", "addressPostal", 20],
      ["id_doc_type", "idDocType", 50],
      ["address_proof_type", "addressProofType", 50],
    ];

    for (const [col, key, max] of stringFields) {
      if (body[key] !== undefined) {
        const val = String(body[key] ?? "").trim().slice(0, max) || null;
        if (col === "account_type" && val && !["personal", "company"].includes(val)) {
          await db.query("ROLLBACK");
          return res.status(400).json({ message: "Loại tài khoản không hợp lệ." });
        }
        sets.push(`${col} = $${idx}`);
        params.push(val);
        idx += 1;
      }
    }

    if (body.useExistingAccountInfo !== undefined) {
      sets.push(`use_existing_account_info = $${idx}`);
      params.push(Boolean(body.useExistingAccountInfo));
      idx += 1;
    }

    if (body.contactConfirmed === true) {
      sets.push(`contact_confirmed = true`, `contact_confirmed_at = CURRENT_TIMESTAMP`);
    }

    const addressLat = parseOptionalCoord(body.addressLat);
    if (addressLat !== undefined) {
      if (Number.isNaN(addressLat) || addressLat < -90 || addressLat > 90) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Vĩ độ địa chỉ không hợp lệ." });
      }
      sets.push(`address_lat = $${idx}`);
      params.push(addressLat);
      idx += 1;
    }

    const addressLng = parseOptionalCoord(body.addressLng);
    if (addressLng !== undefined) {
      if (Number.isNaN(addressLng) || addressLng < -180 || addressLng > 180) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Kinh độ địa chỉ không hợp lệ." });
      }
      sets.push(`address_lng = $${idx}`);
      params.push(addressLng);
      idx += 1;
    }

    if (body.phone !== undefined) {
      const phone = String(body.phone).trim().slice(0, 40);
      await db.query(
        `UPDATE public.user_profiles SET phone = $2, updated_at = NOW() WHERE user_id = $1`,
        [userId, phone || null],
      );
      if (phone) {
        sets.push(`phone_submitted_at = CURRENT_TIMESTAMP`);
      }
    }

    if (body.submitForReview === true) {
      const userRow = await db.query(
        `SELECT role FROM public.users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [userId],
      );
      const role = String(userRow.rows[0]?.role || "").toLowerCase();
      if (role === "freelancer" || role === "client") {
        sets.push(`admin_review_status = 'pending'`);
      }
      if (role === "freelancer") {
        await db.query(
          `UPDATE public.users SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [userId],
        );
      }
      sets.push(`submitted_for_review_at = CURRENT_TIMESTAMP`);
    }

    if (sets.length > 0) {
      sets.push(`updated_at = CURRENT_TIMESTAMP`);
      await db.query(
        `UPDATE public.identity_verifications SET ${sets.join(", ")} WHERE user_id = $1`,
        params,
      );
    }

    if (body.contactConfirmed === true || body.syncProfile === true) {
      const idv = await db.query(
        `SELECT legal_first_name, legal_last_name, address_street, address_city, address_state
         FROM public.identity_verifications WHERE user_id = $1`,
        [userId],
      );
      const row = idv.rows[0] || {};
      const fullName = [row.legal_first_name, row.legal_last_name].filter(Boolean).join(" ").trim();
      const districtCity =
        row.address_city?.trim() ||
        row.address_state?.trim() ||
        [row.address_city, row.address_state].filter(Boolean).join(", ").trim() ||
        null;
      if (fullName) {
        await db.query(
          `UPDATE public.user_profiles
           SET full_name = $2,
               district_city = COALESCE(NULLIF($3, ''), district_city),
               updated_at = NOW()
           WHERE user_id = $1`,
          [userId, fullName, districtCity],
        );
      }
    }

    if (body.submitForReview === true) {
      await notifyIdentityReviewSubmitted(db, userId);
    }

    await db.query("COMMIT");

    const result = await db.query(
      `SELECT * FROM public.identity_verifications WHERE user_id = $1`,
      [userId],
    );
    return res.json({ message: "Đã lưu.", verification: mapRow(result.rows[0]) });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("Patch identity verification failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng identity_verifications. Chạy backend/sql/identity_verification.sql.",
      });
    }
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột địa chỉ GPS. Chạy backend/sql/identity_verification_address_geo.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể lưu xác minh danh tính." });
  } finally {
    db.release();
  }
}

function uploadField(column, timestampCol) {
  return (req, res) => {
    const payload = verifyAccessToken(req, res);
    if (!payload) return;

    const handler = uploadIdentityFile.single("file");
    handler(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Tải file thất bại." });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Chọn một file ảnh." });
      }

      const url = `/uploads/identity/${req.file.filename}`;
      const db = await pool.connect();
      try {
        await ensureRow(db, payload.sub);
        await db.query(
          `UPDATE public.identity_verifications
           SET ${column} = $2, ${timestampCol} = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1`,
          [payload.sub, url],
        );

        if (column === "selfie_url") {
          await db.query(
            `INSERT INTO public.user_profiles (user_id, avatar_url, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url, updated_at = NOW()`,
            [payload.sub, url],
          );
        }

        return res.status(201).json({ url, message: "Tải lên thành công." });
      } catch (error) {
        console.error("Identity upload failed:", error.message);
        return res.status(500).json({ message: "Không thể lưu file." });
      } finally {
        db.release();
      }
    });
  };
}

async function addCreditCard(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const body = req.body || {};
  const digits = String(body.cardNumber || "").replace(/\D/g, "");
  const expiry = parseExpiry(body.expiry);
  const cvv = String(body.cvv || "").replace(/\D/g, "");
  const cardholderName = String(body.cardholderName || "").trim().slice(0, 120);
  const isBusinessCard = Boolean(body.isBusinessCard);

  if (digits.length < 13 || digits.length > 19 || !luhnCheck(digits)) {
    return res.status(400).json({ message: "Số thẻ không hợp lệ." });
  }
  if (!expiry) {
    return res.status(400).json({ message: "Ngày hết hạn không hợp lệ (MM/YY)." });
  }
  const cvvLen = digits.startsWith("3") && digits.length === 15 ? 4 : 3;
  if (cvv.length !== cvvLen) {
    return res.status(400).json({ message: "Mã CVV không hợp lệ." });
  }
  if (!cardholderName) {
    return res.status(400).json({ message: "Vui lòng nhập tên chủ thẻ." });
  }

  const billing = {
    street: String(body.billingStreet || "").trim().slice(0, 255),
    country: String(body.billingCountry || "").trim().slice(0, 100),
    state: String(body.billingState || "").trim().slice(0, 100),
    city: String(body.billingCity || "").trim().slice(0, 100),
    postal: String(body.billingPostal || "").trim().slice(0, 20),
    phone: String(body.billingPhone || "").trim().slice(0, 40),
    currency: String(body.billingCurrency || "VND").trim().slice(0, 40) || "VND",
  };

  if (!billing.street || !billing.country || !billing.city) {
    return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin thanh toán." });
  }

  const last4 = digits.slice(-4);
  const brand = detectCardBrand(digits);
  const userId = payload.sub;
  const db = await pool.connect();

  try {
    await ensureRow(db, userId);
    await db.query(
      `UPDATE public.identity_verifications
       SET card_last4 = $2,
           card_brand = $3,
           card_expiry = $4,
           cardholder_name = $5,
           is_business_card = $6,
           billing_street = $7,
           billing_country = $8,
           billing_state = $9,
           billing_city = $10,
           billing_postal = $11,
           billing_phone = $12,
           billing_currency = $13,
           card_charge_cents = NULL,
           card_added_at = CURRENT_TIMESTAMP,
           card_verified_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [
        userId,
        last4,
        brand,
        expiry,
        cardholderName,
        isBusinessCard,
        billing.street,
        billing.country,
        billing.state || null,
        billing.city,
        billing.postal || null,
        billing.phone || null,
        billing.currency,
      ],
    );

    const result = await db.query(
      `SELECT * FROM public.identity_verifications WHERE user_id = $1`,
      [userId],
    );

    return res.json({
      message:
        "Đã lưu thẻ. Chuyển sang bước xác minh số tiền — thanh toán 10.000 VND để hoàn tất.",
      verification: mapRow(result.rows[0]),
    });
  } catch (error) {
    console.error("Add credit card failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột thẻ tín dụng. Chạy backend/sql/identity_verification_credit_card.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể lưu thẻ." });
  } finally {
    db.release();
  }
}

async function createCardVerifyPaymentLink(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (!isPayosConfigured()) {
    return res.status(503).json({
      message:
        "Cổng thanh toán chưa sẵn sàng. Vui lòng thử lại sau.",
    });
  }

  const userId = payload.sub;
  const db = await pool.connect();

  try {
    await ensureRow(db, userId);
    const idv = await db.query(
      `SELECT card_added_at, card_verified_at FROM public.identity_verifications WHERE user_id = $1`,
      [userId],
    );
    const row = idv.rows[0];
    if (!row?.card_added_at) {
      return res.status(400).json({ message: "Hãy thêm thẻ trước khi xác minh số tiền." });
    }
    if (row.card_verified_at) {
      return res.status(409).json({ message: "Thẻ đã được xác minh." });
    }

    const result = await createIdentityVerifyPaymentLink(db, userId);
    if (!result.checkoutUrl) {
      return res.status(502).json({ message: "Không thể tạo link thanh toán." });
    }

    return res.json({
      message: "Đã tạo link thanh toán xác minh.",
      orderCode: result.orderCode,
      amount: result.amount,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (error) {
    console.error("createCardVerifyPaymentLink failed:", error.message);
    if (isWalletSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu bảng wallet_deposit_orders. Chạy backend/sql/wallet_deposit_payos.sql.",
      });
    }
    return res.status(500).json({ message: error.message || "Không thể tạo link thanh toán." });
  } finally {
    db.release();
  }
}

async function getCardVerifyPaymentStatus(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const orderCode = Number(req.params.orderCode);
  if (!Number.isFinite(orderCode)) {
    return res.status(400).json({ message: "Mã đơn không hợp lệ." });
  }

  const userId = payload.sub;
  const db = await pool.connect();

  try {
    let order = await getWalletDepositOrderForUser(db, orderCode, userId);
    if (!order || String(order.type) !== ORDER_TYPE_IDENTITY_VERIFY) {
      return res.status(404).json({ message: "Không tìm thấy đơn xác minh thẻ." });
    }

    if (order.status === "PENDING" && isPayosConfigured()) {
      await syncWalletDepositFromPayos(db, orderCode);
      order = (await getWalletDepositOrderForUser(db, orderCode, userId)) || order;
    }

    const idvRes = await db.query(
      `SELECT * FROM public.identity_verifications WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const accountRes = await db.query(
      `SELECT balance FROM public.accounts WHERE user_id = $1 AND currency = 'VND' LIMIT 1`,
      [userId],
    );

    return res.json({
      orderCode: Number(order.order_code),
      amount: Number(order.amount),
      status: order.status,
      type: order.type,
      paidAt: order.paid_at,
      balance: Number(accountRes.rows[0]?.balance) || 0,
      verification: mapRow(idvRes.rows[0]),
    });
  } catch (error) {
    console.error("getCardVerifyPaymentStatus failed:", error.message);
    if (isWalletSchemaError(error)) {
      return res.status(503).json({
        message: "Thiếu bảng wallet_deposit_orders. Chạy backend/sql/wallet_deposit_payos.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể tải trạng thái xác minh." });
  } finally {
    db.release();
  }
}

async function cancelCardVerifyPayment(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const orderCode = Number(req.params.orderCode);
  if (!Number.isFinite(orderCode)) {
    return res.status(400).json({ message: "Mã đơn không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const order = await getWalletDepositOrderForUser(db, orderCode, payload.sub);
    if (!order || String(order.type) !== ORDER_TYPE_IDENTITY_VERIFY) {
      return res.status(404).json({ message: "Không tìm thấy đơn xác minh thẻ." });
    }
    if (order.status === "SUCCESS") {
      return res.status(409).json({ message: "Đơn đã thanh toán thành công." });
    }
    await cancelWalletDepositOrder(db, orderCode, "Hủy tại trang xác minh thẻ");
    return res.json({ message: "Đã hủy yêu cầu thanh toán.", orderCode, status: "CANCELLED" });
  } catch (error) {
    console.error("cancelCardVerifyPayment failed:", error.message);
    return res.status(500).json({ message: "Không thể hủy đơn thanh toán." });
  } finally {
    db.release();
  }
}

async function verifyCardCharge(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const raw = bodyAmountVnd(req.body?.chargeAmount);
  if (raw === null) {
    return res.status(400).json({ message: "Nhập số tiền đã thanh toán (VND)." });
  }

  const userId = payload.sub;
  const db = await pool.connect();

  try {
    const result = await db.query(
      `SELECT card_charge_cents, card_added_at, card_verified_at
       FROM public.identity_verifications WHERE user_id = $1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row?.card_added_at || !row.card_charge_cents) {
      return res.status(400).json({
        message: "Hãy hoàn tất thanh toán 10.000 VND ở bước xác minh số tiền.",
      });
    }
    if (row.card_verified_at) {
      return res.status(400).json({ message: "Thẻ đã được xác minh." });
    }

    const expectedVnd = Number(row.card_charge_cents);
    const enteredVnd = Math.round(raw);
    if (enteredVnd !== expectedVnd) {
      return res.status(400).json({
        message: "Số tiền không khớp. Kiểm tra sao kê thẻ và thử lại.",
      });
    }

    await db.query(
      `UPDATE public.identity_verifications
       SET card_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId],
    );

    const updated = await db.query(
      `SELECT * FROM public.identity_verifications WHERE user_id = $1`,
      [userId],
    );

    return res.json({
      message: "Đã xác minh thẻ tín dụng thành công.",
      verification: mapRow(updated.rows[0]),
    });
  } catch (error) {
    console.error("Verify card charge failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột thẻ tín dụng. Chạy backend/sql/identity_verification_credit_card.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể xác minh số tiền." });
  } finally {
    db.release();
  }
}

function bodyAmountVnd(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 1_000 || n > 200_000) return null;
  return Math.round(n);
}

module.exports = {
  getIdentityVerification,
  patchIdentityVerification,
  addCreditCard,
  verifyCardCharge,
  createCardVerifyPaymentLink,
  getCardVerifyPaymentStatus,
  cancelCardVerifyPayment,
  uploadSelfie: uploadField("selfie_url", "photo_submitted_at"),
  uploadIdFront: uploadField("id_front_url", "id_submitted_at"),
  uploadIdBack: uploadField("id_back_url", "id_submitted_at"),
  uploadAddressProof: uploadField("address_proof_url", "address_proof_submitted_at"),
};
