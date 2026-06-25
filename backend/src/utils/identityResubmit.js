const APPROVED = "approved";

async function getIdentityReviewRow(db, userId) {
  const res = await db.query(
    `SELECT submitted_for_review_at, admin_review_status
     FROM public.identity_verifications
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );
  return res.rows[0] || null;
}

async function assertIdentityEditable(db, userId) {
  const row = await getIdentityReviewRow(db, userId);
  const status = String(row?.admin_review_status || "").toLowerCase();
  if (status === APPROVED) {
    return { ok: false, message: "Hồ sơ đã được duyệt. Không thể chỉnh sửa." };
  }
  return { ok: true };
}

/** Cập nhật hàng đợi admin khi user sửa hồ sơ đã gửi nhưng chưa được duyệt. */
async function refreshIdentityReviewQueue(db, userId) {
  const row = await getIdentityReviewRow(db, userId);
  if (!row?.submitted_for_review_at) return false;

  const status = String(row.admin_review_status || "").toLowerCase();
  if (status === APPROVED) return false;

  await db.query(
    `UPDATE public.identity_verifications
     SET submitted_for_review_at = CURRENT_TIMESTAMP,
         admin_review_status = 'pending',
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId],
  );

  const userRow = await db.query(
    `SELECT role, status FROM public.users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [userId],
  );
  const role = String(userRow.rows[0]?.role || "").toLowerCase();
  const userStatus = String(userRow.rows[0]?.status || "").toLowerCase();
  if (role === "freelancer" && userStatus === "rejected") {
    await db.query(
      `UPDATE public.users SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [userId],
    );
  }

  return true;
}

module.exports = {
  assertIdentityEditable,
  refreshIdentityReviewQueue,
};
