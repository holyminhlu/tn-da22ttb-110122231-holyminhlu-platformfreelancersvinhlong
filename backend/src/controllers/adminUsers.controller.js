const { pool } = require("../db/pool");
const { requireAdmin } = require("../utils/requireAdmin");
const { parseUuidParam } = require("../utils/validators");
const { freelancerStatsJoins, EXPERIENCE_YEARS_SELECT } = require("../utils/freelancerStatsSql");

function mapUserRow(row) {
  return {
    userId: row.id,
    email: row.email,
    role: row.role,
    status: row.status || "active",
    fullName: row.full_name || null,
    phone: row.phone || null,
    avatarUrl: row.avatar_url || null,
    isEmailVerified: Boolean(row.is_email_verified),
    isPhoneVerified: Boolean(row.is_phone_verified),
    deactivatedAt: row.deactivated_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    adminReviewStatus: row.admin_review_status || null,
    submittedForReviewAt: row.submitted_for_review_at || null,
  };
}

function buildListFilters(query) {
  const role = String(query.role || "all").toLowerCase();
  const status = String(query.status || "all").toLowerCase();
  const q = String(query.q || "").trim().slice(0, 120);
  const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(10, Number.parseInt(String(query.limit || "25"), 10) || 25));
  const offset = (page - 1) * limit;

  const where = ["u.deleted_at IS NULL"];
  const params = [];
  let idx = 1;

  if (role === "client" || role === "freelancer" || role === "admin") {
    where.push(`u.role = $${idx}`);
    params.push(role);
    idx += 1;
  }

  if (status === "active") {
    where.push(`COALESCE(u.status, 'active') = 'active'`);
    where.push("u.deactivated_at IS NULL");
  } else if (status === "rejected") {
    where.push(`u.status = 'rejected'`);
  } else if (status === "deactivated") {
    where.push("u.deactivated_at IS NOT NULL");
  }

  if (q) {
    const pattern = `%${q}%`;
    where.push(`(
      u.email ILIKE $${idx}
      OR COALESCE(up.full_name, '') ILIKE $${idx}
      OR COALESCE(up.phone, '') ILIKE $${idx}
    )`);
    params.push(pattern);
    idx += 1;
  }

  return { role, status, q, page, limit, offset, where, params, idx };
}

async function listAdminUsers(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const filters = buildListFilters(req.query);
  const db = await pool.connect();

  try {
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM public.users u
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       WHERE ${filters.where.join(" AND ")}`,
      filters.params,
    );

    const listParams = [...filters.params, filters.limit, filters.offset];
    const result = await db.query(
      `SELECT
         u.id,
         u.email,
         u.role,
         u.status,
         u.is_email_verified,
         u.is_phone_verified,
         u.deactivated_at,
         u.created_at,
         u.updated_at,
         up.full_name,
         up.phone,
         up.avatar_url,
         iv.admin_review_status,
         iv.submitted_for_review_at
       FROM public.users u
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       LEFT JOIN public.identity_verifications iv ON iv.user_id = u.id
       WHERE ${filters.where.join(" AND ")}
       ORDER BY u.created_at DESC
       LIMIT $${filters.idx} OFFSET $${filters.idx + 1}`,
      listParams,
    );

    return res.json({
      role: filters.role,
      status: filters.status,
      q: filters.q,
      page: filters.page,
      limit: filters.limit,
      total: countResult.rows[0]?.total ?? 0,
      items: result.rows.map(mapUserRow),
    });
  } catch (error) {
    console.error("listAdminUsers failed:", error.message);
    return res.status(500).json({ message: "Không thể tải danh sách tài khoản." });
  } finally {
    db.release();
  }
}

async function getAdminUser(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const userId = parseUuidParam(req.params.userId);
  if (!userId) {
    return res.status(400).json({ message: "userId không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const result = await db.query(
      `SELECT
         u.id,
         u.email,
         u.role,
         u.status,
         u.is_email_verified,
         u.is_phone_verified,
         u.deactivated_at,
         u.created_at,
         u.updated_at,
         up.full_name,
         up.phone,
         up.avatar_url,
         up.bio,
         up.district_city,
         iv.admin_review_status,
         iv.submitted_for_review_at,
         iv.admin_reviewed_at,
         iv.admin_review_note
       FROM public.users u
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       LEFT JOIN public.identity_verifications iv ON iv.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [userId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    const row = result.rows[0];
    return res.json({
      item: {
        ...mapUserRow(row),
        bio: row.bio || null,
        districtCity: row.district_city || null,
        adminReviewedAt: row.admin_reviewed_at || null,
        adminReviewNote: row.admin_review_note || null,
      },
    });
  } catch (error) {
    console.error("getAdminUser failed:", error.message);
    return res.status(500).json({ message: "Không thể tải thông tin tài khoản." });
  } finally {
    db.release();
  }
}

const FULL_USER_SELECT = `
  u.id,
  u.email,
  u.password_hash,
  u.role,
  u.status,
  u.is_email_verified,
  u.is_phone_verified,
  u.recovery_email,
  u.recovery_phone,
  u.login_alerts_enabled,
  u.deactivated_at,
  u.google_id,
  u.notification_prefs,
  u.password_user_set_at,
  u.created_at,
  u.updated_at,
  u.deleted_at,
  up.full_name,
  up.avatar_url,
  up.phone AS profile_phone,
  up.date_of_birth,
  up.gender,
  up.bio,
  up.website,
  up.tagline,
  up.district_city,
  up.city,
  up.state_province,
  up.country,
  up.cover_url,
  up.client_satisfaction_score,
  up.updated_at AS profile_updated_at,
  iv.account_type,
  iv.use_existing_account_info,
  iv.legal_first_name,
  iv.legal_last_name,
  iv.address_search,
  iv.address_street,
  iv.address_country,
  iv.address_state,
  iv.address_city,
  iv.address_postal,
  iv.contact_confirmed,
  iv.contact_confirmed_at,
  iv.selfie_url,
  iv.id_doc_type,
  iv.id_front_url,
  iv.id_back_url,
  iv.address_proof_type,
  iv.address_proof_url,
  iv.phone_submitted_at,
  iv.photo_submitted_at,
  iv.id_submitted_at,
  iv.address_proof_submitted_at,
  iv.submitted_for_review_at,
  iv.admin_review_status,
  iv.admin_reviewed_at,
  iv.admin_reviewed_by,
  iv.admin_review_note,
  iv.card_last4,
  iv.card_brand,
  iv.card_expiry,
  iv.cardholder_name,
  iv.is_business_card,
  iv.billing_street,
  iv.billing_country,
  iv.billing_state,
  iv.billing_city,
  iv.billing_postal,
  iv.billing_phone,
  iv.card_verified_at,
  iv.created_at AS iv_created_at,
  iv.updated_at AS iv_updated_at,
  fp.title AS freelancer_title,
  fp.hourly_rate,
  ${EXPERIENCE_YEARS_SELECT},
  fp.availability_status,
  fp.total_earnings,
  fp.rating_avg,
  fp.total_reviews,
  fp.languages,
  jss.job_success_score,
  arpm.avg_response_minutes,
  fp.profile_badges,
  fp.created_at AS fp_created_at,
  fp.updated_at AS fp_updated_at`;

const FULL_USER_FROM = `
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.user_id = u.id
  LEFT JOIN public.identity_verifications iv ON iv.user_id = u.id
  LEFT JOIN public.freelancer_profiles fp ON fp.user_id = u.id AND fp.deleted_at IS NULL
  ${freelancerStatsJoins("u.id")}`;

function mapFullUserRow(row) {
  const hasFreelancerProfile =
    row.freelancer_title != null ||
    row.hourly_rate != null ||
    row.experience_years != null ||
    row.availability_status != null;

  return {
    userId: row.id,
    account: {
      email: row.email,
      hasPassword: Boolean(row.password_hash),
      role: row.role,
      status: row.status || "active",
      isEmailVerified: Boolean(row.is_email_verified),
      isPhoneVerified: Boolean(row.is_phone_verified),
      recoveryEmail: row.recovery_email || null,
      recoveryPhone: row.recovery_phone || null,
      loginAlertsEnabled: row.login_alerts_enabled !== false,
      deactivatedAt: row.deactivated_at || null,
      googleId: row.google_id || null,
      notificationPrefs: row.notification_prefs || null,
      passwordUserSetAt: row.password_user_set_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || null,
    },
    profile: {
      fullName: row.full_name || null,
      avatarUrl: row.avatar_url || null,
      phone: row.profile_phone || null,
      dateOfBirth: row.date_of_birth || null,
      gender: row.gender || null,
      bio: row.bio || null,
      website: row.website || null,
      tagline: row.tagline || null,
      districtCity: row.district_city || null,
      city: row.city || null,
      stateProvince: row.state_province || null,
      country: row.country || null,
      coverUrl: row.cover_url || null,
      clientSatisfactionScore: row.client_satisfaction_score ?? null,
      updatedAt: row.profile_updated_at || null,
    },
    identity: row.account_type
      ? {
          accountType: row.account_type,
          useExistingAccountInfo: Boolean(row.use_existing_account_info),
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
          selfieUrl: row.selfie_url || null,
          idDocType: row.id_doc_type || null,
          idFrontUrl: row.id_front_url || null,
          idBackUrl: row.id_back_url || null,
          addressProofType: row.address_proof_type || null,
          addressProofUrl: row.address_proof_url || null,
          phoneSubmittedAt: row.phone_submitted_at || null,
          photoSubmittedAt: row.photo_submitted_at || null,
          idSubmittedAt: row.id_submitted_at || null,
          addressProofSubmittedAt: row.address_proof_submitted_at || null,
          submittedForReviewAt: row.submitted_for_review_at || null,
          adminReviewStatus: row.admin_review_status || null,
          adminReviewedAt: row.admin_reviewed_at || null,
          adminReviewedBy: row.admin_reviewed_by || null,
          adminReviewNote: row.admin_review_note || null,
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
          createdAt: row.iv_created_at || null,
          updatedAt: row.iv_updated_at || null,
        }
      : null,
    freelancer: hasFreelancerProfile
      ? {
          title: row.freelancer_title || null,
          hourlyRate: row.hourly_rate ?? null,
          experienceYears: row.experience_years ?? null,
          availabilityStatus: row.availability_status || null,
          totalEarnings: row.total_earnings ?? null,
          ratingAvg: row.rating_avg ?? null,
          totalReviews: row.total_reviews ?? null,
          languages: row.languages || [],
          jobSuccessScore: row.job_success_score ?? null,
          avgResponseMinutes: row.avg_response_minutes ?? null,
          profileBadges: row.profile_badges || [],
          createdAt: row.fp_created_at || null,
          updatedAt: row.fp_updated_at || null,
        }
      : null,
  };
}

async function queryFullUser(db, userId) {
  const result = await db.query(
    `SELECT ${FULL_USER_SELECT} ${FULL_USER_FROM} WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId],
  );
  return result.rows[0] || null;
}

async function getAdminUserFull(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const userId = parseUuidParam(req.params.userId);
  if (!userId) {
    return res.status(400).json({ message: "userId không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const row = await queryFullUser(db, userId);
    if (!row) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }
    return res.json({ item: mapFullUserRow(row) });
  } catch (error) {
    console.error("getAdminUserFull failed:", error.message);
    return res.status(500).json({ message: "Không thể tải thông tin đầy đủ tài khoản." });
  } finally {
    db.release();
  }
}

async function updateAdminUser(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const userId = parseUuidParam(req.params.userId);
  if (!userId) {
    return res.status(400).json({ message: "userId không hợp lệ." });
  }

  const body = req.body || {};
  const db = await pool.connect();

  try {
    const existing = await db.query(
      `SELECT id, email, role, status
       FROM public.users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    const target = existing.rows[0];
    const targetRole = String(target.role || "").toLowerCase();
    const isTargetAdmin = targetRole === "admin" || targetRole === "administrator";
    const isSelf = userId === payload.sub;

    if (isTargetAdmin && !isSelf) {
      return res.status(403).json({ message: "Không thể chỉnh sửa tài khoản admin khác." });
    }

    const email = body.email !== undefined ? String(body.email || "").trim().toLowerCase() : undefined;
    if (email !== undefined && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return res.status(400).json({ message: "Email không hợp lệ." });
    }

    const role =
      body.role !== undefined ? String(body.role || "").trim().toLowerCase() : undefined;
    if (role !== undefined && !["client", "freelancer", "admin"].includes(role)) {
      return res.status(400).json({ message: "Vai trò phải là client, freelancer hoặc admin." });
    }
    if (role !== undefined && isSelf && role !== "admin") {
      return res.status(400).json({ message: "Không thể đổi vai trò của chính bạn." });
    }

    const status =
      body.status !== undefined ? String(body.status || "").trim().toLowerCase() : undefined;
    if (status !== undefined && !["active", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Trạng thái phải là active hoặc rejected." });
    }
    if (status !== undefined && isSelf) {
      return res.status(400).json({ message: "Không thể thay đổi trạng thái tài khoản của chính bạn." });
    }

    const fullName =
      body.fullName !== undefined ? String(body.fullName || "").trim().slice(0, 255) : undefined;
    const phone =
      body.phone !== undefined ? String(body.phone || "").trim().slice(0, 20) || null : undefined;
    const avatarUrl =
      body.avatarUrl !== undefined ? String(body.avatarUrl || "").trim().slice(0, 2000) || null : undefined;
    const bio =
      body.bio !== undefined ? String(body.bio || "").trim().slice(0, 5000) || null : undefined;
    const website =
      body.website !== undefined ? String(body.website || "").trim().slice(0, 500) || null : undefined;
    const tagline =
      body.tagline !== undefined ? String(body.tagline || "").trim().slice(0, 220) || null : undefined;
    const districtCity =
      body.districtCity !== undefined
        ? String(body.districtCity || "").trim().slice(0, 180) || null
        : undefined;
    const city =
      body.city !== undefined ? String(body.city || "").trim().slice(0, 120) || null : undefined;
    const stateProvince =
      body.stateProvince !== undefined
        ? String(body.stateProvince || "").trim().slice(0, 120) || null
        : undefined;
    const country =
      body.country !== undefined ? String(body.country || "").trim().slice(0, 120) || null : undefined;
    const gender =
      body.gender !== undefined ? String(body.gender || "").trim().slice(0, 20) || null : undefined;
    const dateOfBirth =
      body.dateOfBirth !== undefined
        ? String(body.dateOfBirth || "").trim().slice(0, 10) || null
        : undefined;
    const recoveryEmail =
      body.recoveryEmail !== undefined
        ? String(body.recoveryEmail || "").trim().slice(0, 255) || null
        : undefined;
    const recoveryPhone =
      body.recoveryPhone !== undefined
        ? String(body.recoveryPhone || "").trim().slice(0, 40) || null
        : undefined;

    if (email && email !== target.email) {
      const dup = await db.query(
        `SELECT id FROM public.users WHERE email = $1 AND id <> $2 AND deleted_at IS NULL LIMIT 1`,
        [email, userId],
      );
      if (dup.rows.length) {
        return res.status(409).json({ message: "Email đã được sử dụng bởi tài khoản khác." });
      }
    }

    await db.query("BEGIN");

    const userSets = [];
    const userParams = [userId];
    let idx = 2;

    if (email !== undefined) {
      userSets.push(`email = $${idx}`);
      userParams.push(email);
      idx += 1;
    }
    if (role !== undefined) {
      userSets.push(`role = $${idx}`);
      userParams.push(role);
      idx += 1;
    }
    if (status !== undefined) {
      userSets.push(`status = $${idx}`);
      userParams.push(status);
      idx += 1;
    }
    if (body.isEmailVerified !== undefined) {
      userSets.push(`is_email_verified = $${idx}`);
      userParams.push(Boolean(body.isEmailVerified));
      idx += 1;
    }
    if (body.isPhoneVerified !== undefined) {
      userSets.push(`is_phone_verified = $${idx}`);
      userParams.push(Boolean(body.isPhoneVerified));
      idx += 1;
    }
    if (recoveryEmail !== undefined) {
      userSets.push(`recovery_email = $${idx}`);
      userParams.push(recoveryEmail);
      idx += 1;
    }
    if (recoveryPhone !== undefined) {
      userSets.push(`recovery_phone = $${idx}`);
      userParams.push(recoveryPhone);
      idx += 1;
    }
    if (body.loginAlertsEnabled !== undefined) {
      userSets.push(`login_alerts_enabled = $${idx}`);
      userParams.push(Boolean(body.loginAlertsEnabled));
      idx += 1;
    }

    if (userSets.length) {
      userSets.push("updated_at = CURRENT_TIMESTAMP");
      await db.query(`UPDATE public.users SET ${userSets.join(", ")} WHERE id = $1`, userParams);
    }

    const profileFields = {
      fullName,
      phone,
      avatarUrl,
      bio,
      website,
      tagline,
      districtCity,
      city,
      stateProvince,
      country,
      gender,
      dateOfBirth,
    };
    const hasProfileUpdate = Object.values(profileFields).some((v) => v !== undefined);

    if (hasProfileUpdate) {
      await db.query(
        `INSERT INTO public.user_profiles (
           user_id, full_name, phone, avatar_url, bio, website, tagline,
           district_city, city, state_province, country, gender, date_of_birth, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id)
         DO UPDATE SET
           full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
           phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
           avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
           bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
           website = COALESCE(EXCLUDED.website, user_profiles.website),
           tagline = COALESCE(EXCLUDED.tagline, user_profiles.tagline),
           district_city = COALESCE(EXCLUDED.district_city, user_profiles.district_city),
           city = COALESCE(EXCLUDED.city, user_profiles.city),
           state_province = COALESCE(EXCLUDED.state_province, user_profiles.state_province),
           country = COALESCE(EXCLUDED.country, user_profiles.country),
           gender = COALESCE(EXCLUDED.gender, user_profiles.gender),
           date_of_birth = COALESCE(EXCLUDED.date_of_birth, user_profiles.date_of_birth),
           updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          fullName ?? null,
          phone ?? null,
          avatarUrl ?? null,
          bio ?? null,
          website ?? null,
          tagline ?? null,
          districtCity ?? null,
          city ?? null,
          stateProvince ?? null,
          country ?? null,
          gender ?? null,
          dateOfBirth ?? null,
        ],
      );
    }

    await db.query("COMMIT");

    const row = await queryFullUser(db, userId);
    return res.json({
      message: "Đã cập nhật thông tin tài khoản.",
      item: mapFullUserRow(row),
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("updateAdminUser failed:", error.message);
    return res.status(500).json({ message: "Không thể cập nhật thông tin tài khoản." });
  } finally {
    db.release();
  }
}

async function updateAdminUserStatus(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const userId = parseUuidParam(req.params.userId);
  if (!userId) {
    return res.status(400).json({ message: "userId không hợp lệ." });
  }

  const nextStatus = String(req.body?.status || "").toLowerCase();
  if (!["active", "rejected"].includes(nextStatus)) {
    return res.status(400).json({ message: "Trạng thái phải là active hoặc rejected." });
  }

  if (userId === payload.sub) {
    return res.status(400).json({ message: "Không thể thay đổi trạng thái tài khoản của chính bạn." });
  }

  const db = await pool.connect();
  try {
    const existing = await db.query(
      `SELECT id, role, status
       FROM public.users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    const target = existing.rows[0];
    const role = String(target.role || "").toLowerCase();
    if (role === "admin" || role === "administrator") {
      return res.status(403).json({ message: "Không thể thay đổi trạng thái tài khoản admin." });
    }

    await db.query(
      `UPDATE public.users
       SET status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId, nextStatus],
    );

    return res.json({
      message: nextStatus === "active" ? "Đã kích hoạt tài khoản." : "Đã khóa tài khoản.",
      userId,
      status: nextStatus,
    });
  } catch (error) {
    console.error("updateAdminUserStatus failed:", error.message);
    return res.status(500).json({ message: "Không thể cập nhật trạng thái tài khoản." });
  } finally {
    db.release();
  }
}

module.exports = {
  listAdminUsers,
  getAdminUser,
  getAdminUserFull,
  updateAdminUser,
  updateAdminUserStatus,
};
