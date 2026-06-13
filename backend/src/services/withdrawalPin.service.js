const bcrypt = require("bcryptjs");

const PIN_LENGTH = 6;
const MAX_PIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function isMissingSchemaError(err) {
  return err?.code === "42703" || err?.code === "42P01";
}

function validatePinFormat(pin) {
  const raw = String(pin || "").trim();
  if (!/^\d{6}$/.test(raw)) {
    return "Mã PIN phải gồm đúng 6 chữ số.";
  }
  if (/^(\d)\1{5}$/.test(raw)) {
    return "Mã PIN không được là 6 chữ số giống nhau.";
  }
  return null;
}

function validateNewPassword(password) {
  const p = String(password);
  if (p.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
  if (!/[A-Z]/.test(p)) return "Mật khẩu phải có một chữ cái viết hoa.";
  if (!/[a-z]/.test(p)) return "Mật khẩu phải có một chữ cái viết thường.";
  if (!/[0-9]/.test(p)) return "Mật khẩu phải có một số.";
  if (!/[^A-Za-z0-9]/.test(p)) return "Mật khẩu phải có một ký tự đặc biệt.";
  if (/\s/.test(p)) return "Mật khẩu không được chứa khoảng trắng.";
  return null;
}

async function loadUserAuthContext(db, userId) {
  const result = await db.query(
    `SELECT password_hash, google_id, password_user_set_at
     FROM public.users
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [userId],
  );
  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  const isGoogleAccount = Boolean(row.google_id);
  const hasAppPassword = Boolean(row.password_user_set_at);
  const isGoogleOnly = isGoogleAccount && !hasAppPassword;
  return {
    passwordHash: row.password_hash,
    isGoogleAccount,
    hasAppPassword,
    isGoogleOnly,
    requiresAppPasswordSetup: isGoogleOnly,
  };
}

async function loadWithdrawalPinStatus(db, userId) {
  const auth = await loadUserAuthContext(db, userId);
  if (!auth) {
    return {
      isConfigured: false,
      isGoogleAccount: false,
      hasAppPassword: false,
      requiresAppPasswordSetup: false,
    };
  }

  try {
    const pinRow = await db.query(
      `SELECT user_id FROM public.freelancer_withdrawal_pins WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    return {
      isConfigured: pinRow.rowCount > 0,
      isGoogleAccount: auth.isGoogleAccount,
      hasAppPassword: auth.hasAppPassword,
      requiresAppPasswordSetup: auth.requiresAppPasswordSetup,
    };
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
    return {
      isConfigured: false,
      isGoogleAccount: auth.isGoogleAccount,
      hasAppPassword: auth.hasAppPassword,
      requiresAppPasswordSetup: auth.requiresAppPasswordSetup,
    };
  }
}

async function verifyCurrentPassword(db, userId, currentPassword) {
  const auth = await loadUserAuthContext(db, userId);
  if (!auth) {
    return { ok: false, status: 404, message: "Không tìm thấy người dùng." };
  }
  if (auth.isGoogleOnly) {
    return {
      ok: false,
      status: 400,
      message: "Tài khoản Google chưa có mật khẩu ứng dụng. Vui lòng đặt mật khẩu ứng dụng khi thiết lập PIN.",
    };
  }
  if (!auth.passwordHash) {
    return { ok: false, status: 400, message: "Tài khoản chưa có mật khẩu đăng nhập." };
  }
  const match = await bcrypt.compare(String(currentPassword), auth.passwordHash);
  if (!match) {
    return { ok: false, status: 401, message: "Mật khẩu không đúng." };
  }
  return { ok: true };
}

async function saveWithdrawalPin(db, userId, { pin, confirmPin, currentPassword, newPassword, confirmNewPassword }) {
  const pinError = validatePinFormat(pin);
  if (pinError) return { ok: false, status: 400, message: pinError };
  if (String(pin) !== String(confirmPin || "")) {
    return { ok: false, status: 400, message: "Mã PIN xác nhận không khớp." };
  }

  const auth = await loadUserAuthContext(db, userId);
  if (!auth) {
    return { ok: false, status: 404, message: "Không tìm thấy người dùng." };
  }

  let existingPin = false;
  try {
    const row = await db.query(
      `SELECT user_id FROM public.freelancer_withdrawal_pins WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    existingPin = row.rowCount > 0;
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
    return {
      ok: false,
      status: 503,
      message: "Thiếu schema PIN rút tiền. Chạy backend/sql/freelancer_withdrawal_pin.sql.",
    };
  }

  if (auth.isGoogleOnly) {
    if (!newPassword) {
      return {
        ok: false,
        status: 400,
        message: "Tài khoản Google cần đặt mật khẩu ứng dụng trước khi tạo PIN rút tiền.",
      };
    }
    const pwdError = validateNewPassword(newPassword);
    if (pwdError) return { ok: false, status: 400, message: pwdError };
    if (String(newPassword) !== String(confirmNewPassword || "")) {
      return { ok: false, status: 400, message: "Mật khẩu ứng dụng xác nhận không khớp." };
    }
  } else if (existingPin) {
    const check = await verifyCurrentPassword(db, userId, currentPassword);
    if (!check.ok) return { ok: false, status: check.status, message: check.message };
  } else {
    if (!currentPassword) {
      return { ok: false, status: 400, message: "Vui lòng nhập mật khẩu đăng nhập để thiết lập PIN." };
    }
    const check = await verifyCurrentPassword(db, userId, currentPassword);
    if (!check.ok) return { ok: false, status: check.status, message: check.message };
  }

  const pinHash = await bcrypt.hash(String(pin), 10);

  await db.query("BEGIN");
  try {
    if (auth.isGoogleOnly && newPassword) {
      const passwordHash = await bcrypt.hash(String(newPassword), 10);
      await db.query(
        `UPDATE public.users
         SET password_hash = $2,
             password_user_set_at = COALESCE(password_user_set_at, NOW()),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId, passwordHash],
      );
    }

    await db.query(
      `INSERT INTO public.freelancer_withdrawal_pins (user_id, pin_hash, failed_attempts, locked_until)
       VALUES ($1, $2, 0, NULL)
       ON CONFLICT (user_id) DO UPDATE SET
         pin_hash = EXCLUDED.pin_hash,
         failed_attempts = 0,
         locked_until = NULL,
         updated_at = NOW()`,
      [userId, pinHash],
    );

    await db.query("COMMIT");
    const status = await loadWithdrawalPinStatus(db, userId);
    return {
      ok: true,
      message: existingPin ? "Đã cập nhật mã PIN rút tiền." : "Đã thiết lập mã PIN rút tiền.",
      withdrawalPin: status,
    };
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  }
}

async function verifyWithdrawalPin(db, userId, pin) {
  const pinError = validatePinFormat(pin);
  if (pinError) return { ok: false, status: 400, message: pinError };

  let row;
  try {
    const result = await db.query(
      `SELECT pin_hash, failed_attempts, locked_until
       FROM public.freelancer_withdrawal_pins
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    row = result.rows[0];
  } catch (err) {
    if (!isMissingSchemaError(err)) throw err;
    return {
      ok: false,
      status: 503,
      message: "Thiếu schema PIN rút tiền. Chạy backend/sql/freelancer_withdrawal_pin.sql.",
    };
  }

  if (!row) {
    return {
      ok: false,
      status: 400,
      message: "Bạn chưa thiết lập mã PIN rút tiền. Vào Cài đặt tài khoản để tạo PIN.",
    };
  }

  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    return {
      ok: false,
      status: 429,
      message: `PIN bị khóa tạm thời do nhập sai nhiều lần. Thử lại sau ${LOCK_MINUTES} phút.`,
    };
  }

  const match = await bcrypt.compare(String(pin), row.pin_hash);
  if (!match) {
    const attempts = Number(row.failed_attempts) + 1;
    const lockUntil =
      attempts >= MAX_PIN_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null;
    await db.query(
      `UPDATE public.freelancer_withdrawal_pins
       SET failed_attempts = $2,
           locked_until = $3,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, attempts, lockUntil],
    );
    if (lockUntil) {
      return {
        ok: false,
        status: 429,
        message: `Nhập sai PIN quá ${MAX_PIN_ATTEMPTS} lần. PIN bị khóa ${LOCK_MINUTES} phút.`,
      };
    }
    return {
      ok: false,
      status: 401,
      message: `Mã PIN không đúng. Còn ${MAX_PIN_ATTEMPTS - attempts} lần thử.`,
    };
  }

  await db.query(
    `UPDATE public.freelancer_withdrawal_pins
     SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
     WHERE user_id = $1`,
    [userId],
  );

  return { ok: true };
}

module.exports = {
  PIN_LENGTH,
  isMissingSchemaError,
  validatePinFormat,
  loadWithdrawalPinStatus,
  saveWithdrawalPin,
  verifyWithdrawalPin,
};
