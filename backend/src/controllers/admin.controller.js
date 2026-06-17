const { pool } = require("../db/pool");
const { requireAdmin } = require("../utils/requireAdmin");
const {
  loadFreelancerVerification,
  isFreelancerReadyForAdminReview,
  getFreelancerWorkBlockers,
} = require("../utils/freelancerIdentityVerified");
const { getBlockers: getClientBlockers } = require("../utils/clientIdentityVerified");
const {
  notifyIdentityReviewApproved,
  notifyIdentityReviewRejected,
} = require("../utils/notificationService");

function getClientAdminReviewBlockers(row) {
  const blockers = getClientBlockers(row, row);
  if (!row?.submitted_for_review_at) {
    blockers.push("Chưa gửi hồ sơ xác minh để xem xét (bước 3).");
  }
  const review = String(row?.admin_review_status || "").toLowerCase();
  if (review === "approved") {
    /* ok */
  } else if (review === "pending") {
    blockers.push("Hồ sơ đang chờ admin duyệt.");
  } else if (review === "rejected") {
    const note = String(row?.admin_review_note || "").trim();
    blockers.push(
      note
        ? `Hồ sơ xác minh bị từ chối: ${note}`
        : "Hồ sơ xác minh bị từ chối. Vui lòng cập nhật và gửi lại.",
    );
  } else {
    blockers.push("Chưa được admin duyệt hồ sơ.");
  }
  return blockers;
}

function mapApprovalRow(row) {
  const role = String(row.role || "freelancer").toLowerCase();
  const step1Blockers = getClientBlockers(row, row);
  const workBlockers =
    role === "freelancer" ? getFreelancerWorkBlockers(row) : getClientAdminReviewBlockers(row);
  const legalName = [row.legal_first_name, row.legal_last_name].filter(Boolean).join(" ").trim();
  return {
    userId: row.user_id || row.id,
    role,
    email: row.email,
    fullName: legalName || row.full_name || "",
    phone: row.profile_phone || row.phone || null,
    avatarUrl: row.profile_avatar_url || row.avatar_url || null,
    profileBio: row.profile_bio || row.bio || null,
    profileDistrictCity: row.profile_district_city || row.district_city || null,
    isPhoneVerified: Boolean(row.is_phone_verified),
    isEmailVerified: Boolean(row.is_email_verified),
    userStatus: row.user_status,
    submittedAt: row.submitted_for_review_at,
    adminReviewStatus: row.admin_review_status || "pending",
    adminReviewedAt: row.admin_reviewed_at || null,
    adminReviewNote: row.admin_review_note || null,
    step1Complete: step1Blockers.length === 0,
    step2Complete: Boolean(row.card_verified_at),
    step3Complete: Boolean(row.submitted_for_review_at),
    canApprove: isFreelancerReadyForAdminReview(row),
    blockers: workBlockers,
    accountType: row.account_type || "personal",
    useExistingAccountInfo: row.use_existing_account_info !== false,
    legalFirstName: row.legal_first_name || null,
    legalLastName: row.legal_last_name || null,
    addressSearch: row.address_search || null,
    addressStreet: row.address_street || null,
    addressCountry: row.address_country || null,
    addressState: row.address_state || null,
    addressCity: row.address_city || null,
    addressPostal: row.address_postal || null,
    contactConfirmed: Boolean(row.contact_confirmed),
    contactConfirmedAt: row.contact_confirmed_at || null,
    selfieUrl: row.selfie_url || row.profile_avatar_url || null,
    idDocType: row.id_doc_type || null,
    idFrontUrl: row.id_front_url || null,
    idBackUrl: row.id_back_url || null,
    addressProofType: row.address_proof_type || null,
    addressProofUrl: row.address_proof_url || null,
    phoneSubmittedAt: row.phone_submitted_at || null,
    photoSubmittedAt: row.photo_submitted_at || null,
    idSubmittedAt: row.id_submitted_at || null,
    addressProofSubmittedAt: row.address_proof_submitted_at || null,
    cardLast4: row.card_last4 || null,
    cardBrand: row.card_brand || null,
    cardExpiry: row.card_expiry || null,
    cardholderName: row.cardholder_name || null,
    isBusinessCard: Boolean(row.is_business_card),
    billingStreet: row.billing_street || null,
    billingCountry: row.billing_country || null,
    billingState: row.billing_state || null,
    billingCity: row.billing_city || null,
    billingPostal: row.billing_postal || null,
    billingPhone: row.billing_phone || null,
    cardVerifiedAt: row.card_verified_at || null,
  };
}

async function listFreelancerApprovals(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const status = String(req.query.status || "pending").toLowerCase();
  const roleFilter = String(req.query.role || "all").toLowerCase();
  const q = String(req.query.q || "").trim().slice(0, 120);
  const readyOnly = String(req.query.readyOnly || "").toLowerCase() === "true";
  const incompleteOnly = String(req.query.incompleteOnly || "").toLowerCase() === "true";
  const db = await pool.connect();

  try {
    let reviewFilter = "iv.submitted_for_review_at IS NOT NULL";
    const params = [];
    let idx = 1;

    if (status === "pending") {
      reviewFilter += " AND COALESCE(iv.admin_review_status, 'pending') = 'pending'";
    } else if (status === "approved") {
      reviewFilter += " AND iv.admin_review_status = 'approved'";
    } else if (status === "rejected") {
      reviewFilter += " AND iv.admin_review_status = 'rejected'";
    }

    if (roleFilter === "client" || roleFilter === "freelancer") {
      reviewFilter += ` AND u.role = $${idx}`;
      params.push(roleFilter);
      idx += 1;
    }

    if (q) {
      const pattern = `%${q}%`;
      reviewFilter += ` AND (
        u.email ILIKE $${idx}
        OR COALESCE(up.full_name, '') ILIKE $${idx}
        OR COALESCE(iv.legal_first_name, '') ILIKE $${idx}
        OR COALESCE(iv.legal_last_name, '') ILIKE $${idx}
        OR TRIM(CONCAT(COALESCE(iv.legal_first_name, ''), ' ', COALESCE(iv.legal_last_name, ''))) ILIKE $${idx}
      )`;
      params.push(pattern);
      idx += 1;
    }

    const result = await db.query(
      `SELECT
         u.id AS user_id,
         u.email,
         u.role,
         u.status AS user_status,
         u.created_at AS user_created_at,
         up.full_name,
         up.phone AS profile_phone,
         up.avatar_url AS profile_avatar_url,
         up.bio AS profile_bio,
         up.district_city AS profile_district_city,
         u.is_email_verified,
         iv.*
       FROM public.users u
       INNER JOIN public.identity_verifications iv ON iv.user_id = u.id
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       WHERE u.deleted_at IS NULL
         AND u.role IN ('freelancer', 'client')
         AND ${reviewFilter}
       ORDER BY iv.submitted_for_review_at DESC NULLS LAST, u.created_at DESC
       LIMIT 200`,
      params,
    );

    let items = result.rows.map(mapApprovalRow);
    if (readyOnly) {
      items = items.filter((item) => item.canApprove);
    }
    if (incompleteOnly) {
      items = items.filter(
        (item) => !item.step1Complete || !item.step2Complete || !item.step3Complete,
      );
    }

    return res.json({
      status,
      role: roleFilter,
      q,
      readyOnly,
      incompleteOnly,
      total: items.length,
      items,
    });
  } catch (error) {
    console.error("listFreelancerApprovals failed:", error.message);
    if (error.code === "42703" || error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu schema duyệt admin. Chạy backend/sql/freelancer_admin_review.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể tải danh sách duyệt tài khoản." });
  } finally {
    db.release();
  }
}

async function getFreelancerApproval(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const userId = req.params.userId;
  const db = await pool.connect();

  try {
    const result = await db.query(
      `SELECT
         u.id AS user_id,
         u.email,
         u.role,
         u.status AS user_status,
         u.is_email_verified,
         up.full_name,
         up.phone AS profile_phone,
         up.avatar_url AS profile_avatar_url,
         up.bio AS profile_bio,
         up.district_city AS profile_district_city,
         iv.*
       FROM public.users u
       INNER JOIN public.identity_verifications iv ON iv.user_id = u.id
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    const role = String(row?.role || "").toLowerCase();
    if (!row || !["freelancer", "client"].includes(role)) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ xác minh." });
    }
    return res.json({ item: mapApprovalRow(row) });
  } catch (error) {
    console.error("getFreelancerApproval failed:", error.message);
    return res.status(500).json({ message: "Không thể tải hồ sơ freelancer." });
  } finally {
    db.release();
  }
}

async function approveFreelancer(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const userId = req.params.userId;
  const db = await pool.connect();

  try {
    await db.query("BEGIN");
    const row = await loadFreelancerVerification(db, userId);
    const role = String(row?.role || "").toLowerCase();
    if (!row || !["freelancer", "client"].includes(role)) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy hồ sơ xác minh." });
    }

    const idvBlockers = getClientBlockers(row, row);
    if (!row.submitted_for_review_at) {
      idvBlockers.push("Chưa gửi hồ sơ xem xét (bước 3).");
    }
    if (idvBlockers.length > 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({
        message: "Người dùng chưa hoàn thành đủ 3 bước xác minh.",
        blockers: idvBlockers,
      });
    }

    await db.query(
      `UPDATE public.identity_verifications
       SET admin_review_status = 'approved',
           admin_reviewed_at = CURRENT_TIMESTAMP,
           admin_reviewed_by = $2,
           admin_review_note = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId, payload.sub],
    );

    if (role === "freelancer") {
      await db.query(
        `UPDATE public.users
         SET status = 'active', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND role = 'freelancer'`,
        [userId],
      );
    }

    await notifyIdentityReviewApproved(db, userId, payload.sub, role);

    await db.query("COMMIT");
    return res.json({
      message:
        role === "client"
          ? "Đã duyệt hồ sơ xác minh client."
          : "Đã duyệt tài khoản freelancer.",
      userId,
      status: "approved",
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("approveFreelancer failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message: "Thiếu schema duyệt admin. Chạy backend/sql/freelancer_admin_review.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể duyệt tài khoản." });
  } finally {
    db.release();
  }
}

async function rejectFreelancer(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const userId = req.params.userId;
  const note = String(req.body?.note || "").trim().slice(0, 2000);
  const db = await pool.connect();

  try {
    await db.query("BEGIN");
    const exists = await db.query(
      `SELECT u.id, u.role FROM public.users u
       WHERE u.id = $1 AND u.role IN ('freelancer', 'client') AND u.deleted_at IS NULL`,
      [userId],
    );
    if (exists.rowCount === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy hồ sơ xác minh." });
    }
    const role = String(exists.rows[0].role || "").toLowerCase();

    await db.query(
      `INSERT INTO public.identity_verifications (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );

    await db.query(
      `UPDATE public.identity_verifications
       SET admin_review_status = 'rejected',
           admin_reviewed_at = CURRENT_TIMESTAMP,
           admin_reviewed_by = $2,
           admin_review_note = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId, payload.sub, note || "Không đạt yêu cầu xác minh."],
    );

    if (role === "freelancer") {
      await db.query(
        `UPDATE public.users SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [userId],
      );
    }

    await notifyIdentityReviewRejected(db, userId, payload.sub, note || "Không đạt yêu cầu xác minh.", role);

    await db.query("COMMIT");
    return res.json({
      message:
        role === "client"
          ? "Đã từ chối hồ sơ xác minh client."
          : "Đã từ chối hồ sơ freelancer.",
      userId,
      status: "rejected",
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("rejectFreelancer failed:", error.message);
    return res.status(500).json({ message: "Không thể từ chối hồ sơ." });
  } finally {
    db.release();
  }
}

module.exports = {
  listFreelancerApprovals,
  getFreelancerApproval,
  approveFreelancer,
  rejectFreelancer,
};
