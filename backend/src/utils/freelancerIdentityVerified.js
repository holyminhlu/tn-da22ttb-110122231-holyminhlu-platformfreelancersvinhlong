const { getBlockers, IDV_VERIFY_SELECT } = require("./clientIdentityVerified");

const FREELANCER_IDV_SELECT = `
  ${IDV_VERIFY_SELECT},
  iv.submitted_for_review_at,
  iv.admin_review_status,
  iv.admin_review_note,
  iv.legal_first_name,
  iv.legal_last_name,
  u.status AS user_status,
  u.role,
  u.email,
  u.created_at AS user_created_at`;

async function loadFreelancerVerification(db, userId) {
  const result = await db.query(
    `SELECT ${FREELANCER_IDV_SELECT}
     FROM public.users u
     LEFT JOIN public.identity_verifications iv ON iv.user_id = u.id
     LEFT JOIN public.user_profiles up ON up.user_id = u.id
     WHERE u.id = $1 AND u.deleted_at IS NULL
     LIMIT 1`,
    [userId],
  );
  return result.rows[0] || null;
}

function getFreelancerWorkBlockers(row) {
  const blockers = getBlockers(row, row);

  if (!row?.submitted_for_review_at) {
    blockers.push("Chưa gửi hồ sơ xác minh để xem xét (bước 3).");
  }

  const review = String(row?.admin_review_status || "").toLowerCase();
  if (review === "approved") {
    /* ok */
  } else if (review === "pending") {
    blockers.push("Hồ sơ đang chờ admin duyệt tài khoản.");
  } else if (review === "rejected") {
    const note = String(row?.admin_review_note || "").trim();
    blockers.push(
      note
        ? `Hồ sơ xác minh bị từ chối: ${note}`
        : "Hồ sơ xác minh bị từ chối. Vui lòng liên hệ hỗ trợ.",
    );
  } else {
    blockers.push("Chưa được admin duyệt tài khoản.");
  }

  if (String(row?.user_status || "").toLowerCase() !== "active") {
    blockers.push("Tài khoản freelancer chưa được kích hoạt.");
  }

  return blockers;
}

function isFreelancerApprovedForWork(row) {
  return getFreelancerWorkBlockers(row).length === 0;
}

function isFreelancerReadyForAdminReview(row) {
  const idvBlockers = getBlockers(row, row);
  if (idvBlockers.length > 0) return false;
  if (!row?.submitted_for_review_at) return false;
  const review = String(row?.admin_review_status || "pending").toLowerCase();
  return review === "pending";
}

async function ensureFreelancerCanWork(db, userId, res) {
  try {
    const row = await loadFreelancerVerification(db, userId);
    if (!row || String(row.role).toLowerCase() !== "freelancer") {
      res.status(403).json({ message: "Chỉ freelancer được thực hiện thao tác này." });
      return false;
    }
    const blockers = getFreelancerWorkBlockers(row);
    if (blockers.length > 0) {
      res.status(403).json({
        message: blockers[0],
        blockers,
        code: "FREELANCER_NOT_APPROVED",
      });
      return false;
    }
    return true;
  } catch (err) {
    if (err?.code === "42703" || err?.code === "42P01") {
      res.status(503).json({
        message:
          "Thiếu cột duyệt admin. Chạy backend/sql/freelancer_admin_review.sql trên PostgreSQL.",
      });
      return false;
    }
    throw err;
  }
}

module.exports = {
  FREELANCER_IDV_SELECT,
  loadFreelancerVerification,
  getFreelancerWorkBlockers,
  isFreelancerApprovedForWork,
  isFreelancerReadyForAdminReview,
  ensureFreelancerCanWork,
};
