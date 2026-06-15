/**
 * Cùng logic với lib/hire/clientVerification.ts (buildVerifyItems + thẻ tín dụng).
 */

function buildVerifyFlags(row, profile) {
  const hasPhone = Boolean(
    row.is_phone_verified ||
      row.phone_submitted_at ||
      String(profile?.phone || row.profile_phone || "").trim(),
  );
  const hasContact = Boolean(row.contact_confirmed);
  const hasPhoto = Boolean(
    row.selfie_url || row.photo_submitted_at || profile?.avatar_url || row.profile_avatar_url,
  );
  const hasId = Boolean(row.id_front_url && row.id_back_url);
  const hasAddress = Boolean(row.address_proof_url);

  return { hasPhone, hasContact, hasPhoto, hasId, hasAddress };
}

function getBlockers(row, profile) {
  const blockers = [];
  if (!row) {
    blockers.push("Chưa bắt đầu hồ sơ xác minh danh tính.");
    return blockers;
  }

  const flags = buildVerifyFlags(row, profile);
  if (!flags.hasPhone) blockers.push("Chưa hoàn thành: Thêm số điện thoại");
  if (!flags.hasContact) blockers.push("Chưa hoàn thành: Thông tin liên hệ");
  if (!flags.hasPhoto) blockers.push("Chưa hoàn thành: Ảnh hiện tại");
  if (!flags.hasId) blockers.push("Chưa hoàn thành: Giấy tờ tùy thân");
  if (!flags.hasAddress) blockers.push("Chưa hoàn thành: Bằng chứng địa chỉ");
  if (!row.card_verified_at) blockers.push("Chưa xác minh thẻ tín dụng (bước 2)");

  return blockers;
}

function isClientIdentityVerified(row, profile) {
  return getBlockers(row, profile).length === 0;
}

async function queryClientIdentityVerified(db, userId) {
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
  return isClientIdentityVerified(row, {
    phone: row.profile_phone,
    avatar_url: row.profile_avatar_url,
  });
}

const IDENTITY_NOT_VERIFIED_MESSAGE =
  "Hoàn tất xác minh danh tính trước khi thuê dịch vụ. Vào Tài khoản → Xác minh danh tính.";

const IDENTITY_NOT_VERIFIED_CHAT_MESSAGE =
  "Hoàn tất xác minh danh tính trước khi nhắn tin. Vào Tài khoản → Xác minh danh tính.";

const IDENTITY_NOT_VERIFIED_PAYMENT_MESSAGE =
  "Hoàn tất xác minh danh tính trước khi thanh toán. Vào Tài khoản → Xác minh danh tính.";

async function assertClientPaymentAllowed(db, role, userId, res) {
  if (String(role || "").toLowerCase() !== "client") return true;
  const verified = await queryClientIdentityVerified(db, userId);
  if (verified) return true;
  if (res) {
    res.status(403).json({
      message: IDENTITY_NOT_VERIFIED_PAYMENT_MESSAGE,
      code: "IDENTITY_NOT_VERIFIED",
    });
  }
  return false;
}

const IDV_VERIFY_SELECT = `
  iv.contact_confirmed,
  iv.selfie_url,
  iv.photo_submitted_at,
  iv.id_front_url,
  iv.id_back_url,
  iv.address_proof_url,
  iv.phone_submitted_at,
  iv.card_verified_at,
  up.phone AS profile_phone,
  up.avatar_url AS profile_avatar_url,
  u.is_phone_verified`;

module.exports = {
  buildVerifyFlags,
  getBlockers,
  isClientIdentityVerified,
  queryClientIdentityVerified,
  IDENTITY_NOT_VERIFIED_MESSAGE,
  IDENTITY_NOT_VERIFIED_CHAT_MESSAGE,
  IDENTITY_NOT_VERIFIED_PAYMENT_MESSAGE,
  assertClientPaymentAllowed,
  IDV_VERIFY_SELECT,
};
