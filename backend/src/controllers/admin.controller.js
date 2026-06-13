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

function mapApprovalRow(row) {
  const step1Blockers = getClientBlockers(row, row);
  const workBlockers = getFreelancerWorkBlockers(row);
  return {
    userId: row.user_id || row.id,
    email: row.email,
    fullName: [row.legal_first_name, row.legal_last_name].filter(Boolean).join(" ").trim() || row.full_name || "",
    phone: row.profile_phone || row.phone || null,
    avatarUrl: row.profile_avatar_url || row.avatar_url || null,
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
    selfieUrl: row.selfie_url,
    idFrontUrl: row.id_front_url,
    idBackUrl: row.id_back_url,
    addressProofUrl: row.address_proof_url,
    cardLast4: row.card_last4,
    cardVerifiedAt: row.card_verified_at,
  };
}

async function listFreelancerApprovals(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const status = String(req.query.status || "pending").toLowerCase();
  const db = await pool.connect();

  try {
    let reviewFilter = "iv.submitted_for_review_at IS NOT NULL";
    const params = [];

    if (status === "pending") {
      reviewFilter += " AND COALESCE(iv.admin_review_status, 'pending') = 'pending'";
    } else if (status === "approved") {
      reviewFilter += " AND iv.admin_review_status = 'approved'";
    } else if (status === "rejected") {
      reviewFilter += " AND iv.admin_review_status = 'rejected'";
    }

    const result = await db.query(
      `SELECT
         u.id AS user_id,
         u.email,
         u.status AS user_status,
         u.created_at AS user_created_at,
         up.full_name,
         up.phone AS profile_phone,
         up.avatar_url AS profile_avatar_url,
         iv.*
       FROM public.users u
       INNER JOIN public.identity_verifications iv ON iv.user_id = u.id
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       WHERE u.deleted_at IS NULL
         AND u.role = 'freelancer'
         AND ${reviewFilter}
       ORDER BY iv.submitted_for_review_at DESC NULLS LAST, u.created_at DESC
       LIMIT 200`,
      params,
    );

    return res.json({
      status,
      items: result.rows.map(mapApprovalRow),
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
    const row = await loadFreelancerVerification(db, userId);
    if (!row || String(row.role).toLowerCase() !== "freelancer") {
      return res.status(404).json({ message: "Không tìm thấy freelancer." });
    }
    return res.json({ item: mapApprovalRow({ ...row, user_id: userId, id: userId }) });
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
    if (!row || String(row.role).toLowerCase() !== "freelancer") {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy freelancer." });
    }

    const idvBlockers = getClientBlockers(row, row);
    if (!row.submitted_for_review_at) {
      idvBlockers.push("Chưa gửi hồ sơ xem xét (bước 3).");
    }
    if (idvBlockers.length > 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({
        message: "Freelancer chưa hoàn thành đủ 3 bước xác minh.",
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

    await db.query(
      `UPDATE public.users
       SET status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND role = 'freelancer'`,
      [userId],
    );

    await notifyIdentityReviewApproved(db, userId, payload.sub);

    await db.query("COMMIT");
    return res.json({ message: "Đã duyệt tài khoản freelancer.", userId, status: "approved" });
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
      `SELECT u.id FROM public.users u
       WHERE u.id = $1 AND u.role = 'freelancer' AND u.deleted_at IS NULL`,
      [userId],
    );
    if (exists.rowCount === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy freelancer." });
    }

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

    await db.query(
      `UPDATE public.users SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [userId],
    );

    await notifyIdentityReviewRejected(db, userId, payload.sub, note || "Không đạt yêu cầu xác minh.");

    await db.query("COMMIT");
    return res.json({ message: "Đã từ chối hồ sơ freelancer.", userId, status: "rejected" });
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
