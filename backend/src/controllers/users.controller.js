const bcrypt = require("bcryptjs");
const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { freelancerStatsJoins, EXPERIENCE_YEARS_SELECT } = require("../utils/freelancerStatsSql");

function normalizeEmail(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase();
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

async function loadUserAuthMethods(db, userId) {
  const result = await db.query(
    `SELECT email, google_id, password_user_set_at
     FROM public.users
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [userId],
  );
  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  const isGoogleAccount = Boolean(row.google_id);
  const hasLocalPassword = Boolean(row.password_user_set_at);
  return {
    email: row.email,
    isGoogleAccount,
    hasLocalPassword,
    isGoogleOnly: isGoogleAccount && !hasLocalPassword,
  };
}

async function verifyCurrentPassword(db, userId, currentPassword) {
  const result = await db.query(
    `SELECT password_hash, google_id, password_user_set_at
     FROM public.users
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [userId],
  );
  if (result.rowCount === 0) return { ok: false, status: 404, message: "Không tìm thấy người dùng." };
  const row = result.rows[0];
  if (row.google_id && !row.password_user_set_at) {
    return {
      ok: false,
      status: 400,
      message: "Tài khoản đăng nhập Google chưa có mật khẩu VLC. Hãy tạo mật khẩu trước.",
    };
  }
  const hash = row.password_hash;
  if (!hash) {
    return { ok: false, status: 400, message: "Tài khoản không có mật khẩu cục bộ." };
  }
  const match = await bcrypt.compare(String(currentPassword), hash);
  if (!match) {
    return { ok: false, status: 401, message: "Mật khẩu hiện tại không đúng." };
  }
  return { ok: true };
}

async function updateAvatar(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const avatarUrl = String(req.body?.avatarUrl || "").trim();
  if (!avatarUrl) {
    return res.status(400).json({ message: "Thi?u ???ng d?n avatar." });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO public.user_profiles (user_id, avatar_url, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
       RETURNING avatar_url`,
      [payload.sub, avatarUrl],
    );

    return res.json({ message: "C?p nh?t avatar th�nh c�ng.", avatarUrl: result.rows[0].avatar_url });
  } catch (error) {
    console.error("Update avatar failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? c?p nh?t avatar l�c n�y." });
  } finally {
    client.release();
  }
}

async function uploadAvatarAsset(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const { uploadAvatar: uploadMw } = require("../middleware/avatarUpload");
  const handler = uploadMw.single("file");
  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Tải ảnh thất bại." });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Chọn một ảnh làm đại diện." });
    }
    const url = `/uploads/avatars/${file.filename}`;
    return res.status(201).json({ url });
  });
}

async function updateProfile(req, res) {

  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const role = String(payload.role || "").toLowerCase();
  const fullName = String(req.body?.fullName ?? "").trim().slice(0, 180);
  const phone = String(req.body?.phone ?? "").trim().slice(0, 40);
  const bio = String(req.body?.bio ?? "").trim().slice(0, 8000);
  const website = String(req.body?.website ?? "").trim().slice(0, 255);
  const dateOfBirth = req.body?.dateOfBirth ? String(req.body.dateOfBirth).slice(0, 10) : null;
  const gender = req.body?.gender ? String(req.body.gender).trim().slice(0, 30) : null;
  const tagline = String(req.body?.tagline ?? "").trim().slice(0, 220);
  const districtCity = String(req.body?.districtCity ?? "").trim().slice(0, 180);
  const coverUrlProvided = Object.prototype.hasOwnProperty.call(req.body, "coverUrl");
  const coverUrl = coverUrlProvided ? String(req.body?.coverUrl ?? "").trim().slice(0, 500) : null;

  const title = String(req.body?.title ?? "").trim().slice(0, 180);
  const hourlyRateRaw = req.body?.hourlyRate;
  const experienceYearsRaw = req.body?.experienceYears;
  const availabilityStatus = req.body?.availabilityStatus ? String(req.body.availabilityStatus).trim().slice(0, 30) : null;
  const languages = Array.isArray(req.body?.languages)
    ? req.body.languages.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 20)
    : null;

  if (!fullName) {
    return res.status(400).json({ message: "Họ tên là bắt buộc." });
  }

  const hourlyRate =
    hourlyRateRaw !== undefined && hourlyRateRaw !== null && hourlyRateRaw !== "" ? Number(hourlyRateRaw) : null;
  const experienceYears =
    experienceYearsRaw !== undefined && experienceYearsRaw !== null && experienceYearsRaw !== ""
      ? Number(experienceYearsRaw)
      : null;

  if (hourlyRate !== null && (!Number.isFinite(hourlyRate) || hourlyRate < 0)) {
    return res.status(400).json({ message: "Đơn giá/giờ không hợp lệ." });
  }
  if (experienceYears !== null && (!Number.isFinite(experienceYears) || experienceYears < 0)) {
    return res.status(400).json({ message: "Số năm kinh nghiệm không hợp lệ." });
  }

  const profileBadges = Array.isArray(req.body?.profileBadges)
    ? req.body.profileBadges
        .map((v) => String(v || "").trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");

    await dbClient.query(
      `INSERT INTO public.user_profiles (user_id, full_name, phone, bio, website, date_of_birth, gender, tagline, district_city, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         bio = EXCLUDED.bio,
         website = EXCLUDED.website,
         date_of_birth = EXCLUDED.date_of_birth,
         gender = EXCLUDED.gender,
         tagline = EXCLUDED.tagline,
         district_city = EXCLUDED.district_city,
         updated_at = NOW()`,
      [
        userId,
        fullName,
        phone || null,
        bio || null,
        website || null,
        dateOfBirth,
        gender,
        tagline || null,
        districtCity || null,
      ],
    );

    if (coverUrlProvided) {
      await dbClient.query(
        `UPDATE public.user_profiles
         SET cover_url = $2, updated_at = NOW()
         WHERE user_id = $1`,
        [userId, coverUrl || null],
      );
    }

    if (role === "freelancer") {
      await dbClient.query(
        `INSERT INTO public.freelancer_profiles
          (user_id, title, hourly_rate, experience_years, availability_status, languages, profile_badges)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
         ON CONFLICT (user_id)
         DO UPDATE SET
           title = EXCLUDED.title,
           hourly_rate = EXCLUDED.hourly_rate,
           experience_years = EXCLUDED.experience_years,
           availability_status = EXCLUDED.availability_status,
           languages = EXCLUDED.languages,
           profile_badges = EXCLUDED.profile_badges,
           updated_at = NOW()`,
        [
          userId,
          title || null,
          hourlyRate,
          experienceYears,
          availabilityStatus || "available",
          JSON.stringify(languages || []),
          JSON.stringify(profileBadges),
        ],
      );
    }

    await dbClient.query("COMMIT");
    return res.json({ message: "Đã cập nhật hồ sơ." });
  } catch (error) {
    await dbClient.query("ROLLBACK").catch(() => {});
    console.error("Update profile failed:", error.message);
    return res.status(500).json({ message: "Không thể cập nhật hồ sơ lúc này." });
  } finally {
    dbClient.release();
  }
}

async function updateSkills(req, res) {

  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới cập nhật kỹ năng." });
  }
  const userId = payload.sub;
  const skills = Array.isArray(req.body?.skills) ? req.body.skills : [];

  const normalized = skills
    .map((s) => ({
      name: String(s?.name ?? "").trim().slice(0, 120),
      level: String(s?.level ?? "").trim().slice(0, 40),
      years: s?.yearsOfExperience !== undefined && s?.yearsOfExperience !== null && s?.yearsOfExperience !== "" ? Number(s.yearsOfExperience) : null,
    }))
    .filter((s) => s.name.length > 0)
    .slice(0, 40);

  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");
    await dbClient.query(`DELETE FROM public.user_skills WHERE user_id = $1`, [userId]);

    for (const item of normalized) {
      const skillRes = await dbClient.query(
        `INSERT INTO public.skills (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [item.name],
      );
      const skillId = skillRes.rows[0].id;
      await dbClient.query(
        `INSERT INTO public.user_skills (user_id, skill_id, level, years_of_experience)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, skill_id)
         DO UPDATE SET level = EXCLUDED.level, years_of_experience = EXCLUDED.years_of_experience`,
        [userId, skillId, item.level || null, item.years],
      );
    }

    await dbClient.query("COMMIT");
    return res.json({ message: "Đã cập nhật kỹ năng." });
  } catch (error) {
    await dbClient.query("ROLLBACK").catch(() => {});
    console.error("Update skills failed:", error.message);
    return res.status(500).json({ message: "Không thể cập nhật kỹ năng." });
  } finally {
    dbClient.release();
  }
}

async function uploadProfileFileAsset(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới tải tệp hồ sơ." });
  }

  const { uploadProfileFile: uploadMw } = require("../middleware/profileFilesUpload");
  const handler = uploadMw.single("file");
  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Tải tệp thất bại." });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Chọn một tệp để tải lên." });
    }
    return res.status(201).json({
      url: `/uploads/profile-files/${file.filename}`,
      fileName: file.originalname || file.filename,
      fileSize: file.size,
      mimeType: file.mimetype || null,
    });
  });
}

async function createExclusiveResource(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới thêm tài nguyên." });
  }

  const userId = payload.sub;
  const title = String(req.body?.title ?? "").trim().slice(0, 200);
  const description = String(req.body?.description ?? "").trim().slice(0, 3000);
  const resourceType = String(req.body?.resourceType ?? "link").trim().toLowerCase() === "file" ? "file" : "link";
  const linkUrl = String(req.body?.linkUrl ?? "").trim().slice(0, 500);
  const fileUrl = String(req.body?.fileUrl ?? "").trim().slice(0, 500);
  const fileName = String(req.body?.fileName ?? "").trim().slice(0, 255);

  if (!title) {
    return res.status(400).json({ message: "Tiêu đề tài nguyên là bắt buộc." });
  }
  if (resourceType === "link" && !linkUrl) {
    return res.status(400).json({ message: "Vui lòng nhập link tài nguyên." });
  }
  if (resourceType === "file" && !fileUrl) {
    return res.status(400).json({ message: "Vui lòng tải lên tệp tài nguyên." });
  }

  const dbClient = await pool.connect();
  try {
    const result = await dbClient.query(
      `INSERT INTO public.freelancer_exclusive_resources
         (freelancer_id, title, description, resource_type, link_url, file_url, file_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, resource_type, link_url, file_url, file_name, created_at`,
      [
        userId,
        title,
        description || null,
        resourceType,
        resourceType === "link" ? linkUrl : null,
        resourceType === "file" ? fileUrl : null,
        resourceType === "file" ? fileName || null : null,
      ],
    );
    return res.status(201).json({ message: "Đã thêm tài nguyên.", resource: result.rows[0] });
  } catch (error) {
    console.error("Create exclusive resource failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng freelancer_exclusive_resources. Chạy backend/sql/freelancer_profile_assets.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể thêm tài nguyên." });
  } finally {
    dbClient.release();
  }
}

async function createProfileFile(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới thêm tệp." });
  }

  const userId = payload.sub;
  const title = String(req.body?.title ?? "").trim().slice(0, 200);
  const description = String(req.body?.description ?? "").trim().slice(0, 3000);
  const fileUrl = String(req.body?.fileUrl ?? "").trim().slice(0, 500);
  const fileName = String(req.body?.fileName ?? "").trim().slice(0, 255);
  const fileSize = Number(req.body?.fileSize);
  const mimeType = String(req.body?.mimeType ?? "").trim().slice(0, 120);

  if (!title) {
    return res.status(400).json({ message: "Tiêu đề tệp là bắt buộc." });
  }
  if (!fileUrl) {
    return res.status(400).json({ message: "Vui lòng tải lên tệp." });
  }

  const dbClient = await pool.connect();
  try {
    const result = await dbClient.query(
      `INSERT INTO public.freelancer_profile_files
         (freelancer_id, title, description, file_url, file_name, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, file_url, file_name, file_size, mime_type, created_at`,
      [
        userId,
        title,
        description || null,
        fileUrl,
        fileName || null,
        Number.isFinite(fileSize) ? Math.round(fileSize) : null,
        mimeType || null,
      ],
    );
    return res.status(201).json({ message: "Đã thêm tệp.", file: result.rows[0] });
  } catch (error) {
    console.error("Create profile file failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng freelancer_profile_files. Chạy backend/sql/freelancer_profile_assets.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể thêm tệp." });
  } finally {
    dbClient.release();
  }
}

async function createPortfolio(req, res) {

  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới thêm portfolio." });
  }

  const userId = payload.sub;
  const title = String(req.body?.title ?? "").trim().slice(0, 200);
  const description = String(req.body?.description ?? "").trim().slice(0, 3000);
  const projectUrl = String(req.body?.projectUrl ?? "").trim().slice(0, 500);
  const images = Array.isArray(req.body?.images)
    ? req.body.images.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 12)
    : [];

  if (!title) {
    return res.status(400).json({ message: "Tiêu đề portfolio là bắt buộc." });
  }

  const dbClient = await pool.connect();
  try {
    const result = await dbClient.query(
      `INSERT INTO public.freelancer_portfolios (freelancer_id, title, description, project_url, images)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, title, description, project_url, images, created_at`,
      [userId, title, description || null, projectUrl || null, JSON.stringify(images)],
    );
    return res.status(201).json({ message: "Đã thêm portfolio.", portfolio: result.rows[0] });
  } catch (error) {
    console.error("Create portfolio failed:", error.message);
    return res.status(500).json({ message: "Không thể thêm portfolio." });
  } finally {
    dbClient.release();
  }
}

async function getMe(req, res) {

  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const client = await pool.connect();

  try {
    const baseResult = await client.query(
      `SELECT
         u.id,
         u.email,
         u.role,
         u.status,
         u.is_email_verified,
         u.is_phone_verified,
         u.created_at,
         up.full_name,
         up.avatar_url,
         up.phone,
         up.date_of_birth,
         up.gender,
         up.bio,
         up.website,
         up.tagline,
         up.district_city,
         up.cover_url,
         CASE
           WHEN up.location IS NULL THEN NULL
           ELSE ST_AsText(up.location::geometry)
         END AS location_wkt
       FROM public.users u
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );

    if (baseResult.rowCount === 0) {
      return res.status(404).json({ message: "Kh�ng t�m th?y ng??i d�ng." });
    }

    const user = baseResult.rows[0];
    const completionChecks = [
      Boolean(user.full_name),
      Boolean(user.avatar_url),
      Boolean(user.phone),
      Boolean(user.bio),
      Boolean(user.website),
      Boolean(user.date_of_birth),
      Boolean(user.gender),
      Boolean(user.tagline),
      Boolean(user.district_city),
    ];
    const completionScore = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

    const skillsResult = await client.query(
      `SELECT s.id, s.name, us.level, us.years_of_experience
       FROM public.user_skills us
       JOIN public.skills s ON s.id = us.skill_id
       WHERE us.user_id = $1
       ORDER BY s.name ASC`,
      [userId],
    );

    if (user.role === "freelancer") {
      const freelancerResult = await client.query(
        `SELECT
           fp.title,
           fp.hourly_rate,
           ${EXPERIENCE_YEARS_SELECT},
           COALESCE(fp.availability_status, 'available') AS availability_status,
           fp.total_earnings,
           jss.job_success_score,
           arpm.avg_response_minutes,
           COALESCE(fp.profile_badges, '[]'::jsonb) AS profile_badges,
           COALESCE(rv.rating_avg, 0) AS rating_avg,
           COALESCE(rv.total_reviews, 0) AS total_reviews,
           fp.languages,
           COALESCE((SELECT COUNT(*) FROM public.services sv WHERE sv.freelancer_id = u.id), 0) AS services_count,
           COALESCE(ct.completed_jobs, 0)::int AS completed_jobs
         FROM public.users u
         LEFT JOIN public.freelancer_profiles fp ON fp.user_id = u.id
         LEFT JOIN (
           SELECT freelancer_id, ROUND(AVG(rating)::numeric, 2) AS rating_avg, COUNT(*)::int AS total_reviews
           FROM public.contract_reviews
           GROUP BY freelancer_id
         ) rv ON rv.freelancer_id = u.id
         ${freelancerStatsJoins("u.id")}
         WHERE u.id = $1 AND u.deleted_at IS NULL
         LIMIT 1`,
        [userId],
      );

      const servicesResult = await client.query(
        `SELECT id, title, description, price, delivery_days, demo_media, thumbnail_url, created_at
         FROM public.services
         WHERE freelancer_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId],
      );

      const portfolioResult = await client.query(
        `SELECT id, title, description, project_url, images, created_at
         FROM public.freelancer_portfolios
         WHERE freelancer_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId],
      );

      let exclusiveResources = [];
      let profileFiles = [];
      try {
        const resourcesResult = await client.query(
          `SELECT id, title, description, resource_type, link_url, file_url, file_name, created_at
           FROM public.freelancer_exclusive_resources
           WHERE freelancer_id = $1 AND deleted_at IS NULL
           ORDER BY created_at DESC
           LIMIT 50`,
          [userId],
        );
        exclusiveResources = resourcesResult.rows;
      } catch (resourcesErr) {
        if (resourcesErr.code !== "42P01") throw resourcesErr;
      }
      try {
        const filesResult = await client.query(
          `SELECT id, title, description, file_url, file_name, file_size, mime_type, created_at
           FROM public.freelancer_profile_files
           WHERE freelancer_id = $1 AND deleted_at IS NULL
           ORDER BY created_at DESC
           LIMIT 50`,
          [userId],
        );
        profileFiles = filesResult.rows;
      } catch (filesErr) {
        if (filesErr.code !== "42P01") throw filesErr;
      }

      const reviewsResult = await client.query(
        `SELECT
           cr.id,
           cr.rating,
           cr.comment,
           cr.created_at,
           reviewer_up.full_name AS reviewer_name
         FROM public.contract_reviews cr
         LEFT JOIN public.user_profiles reviewer_up ON reviewer_up.user_id = cr.client_id
         WHERE cr.freelancer_id = $1
         ORDER BY cr.created_at DESC
         LIMIT 50`,
        [userId],
      );

      const timelineResult = await client.query(
        `SELECT event_type, event_time, event_title
         FROM (
          SELECT 'service_created'::text AS event_type, s.created_at AS event_time, ('Tạo dịch vụ: ' || s.title)::text AS event_title
           FROM public.services s
           WHERE s.freelancer_id = $1
           UNION ALL
          SELECT 'job_accepted'::text AS event_type, c.created_at AS event_time, ('Đã nhận việc: ' || COALESCE(j.title, 'Hợp đồng'))::text AS event_title
           FROM public.contracts c
           LEFT JOIN public.jobs j ON j.id = c.job_id
           WHERE c.freelancer_id = $1 AND c.job_id IS NOT NULL AND c.deleted_at IS NULL
           UNION ALL
         SELECT 'review_received'::text AS event_type, cr.created_at AS event_time, ('Nhận đánh giá ' || cr.rating || '/5')::text AS event_title
          FROM public.contract_reviews cr
          WHERE cr.freelancer_id = $1
           UNION ALL
          SELECT 'login'::text AS event_type, l.logged_in_at AS event_time, 'Đăng nhập hệ thống'::text AS event_title
           FROM public.user_login_logs l
           WHERE l.user_id = $1
         ) t
         ORDER BY event_time DESC
         LIMIT 10`,
        [userId],
      );

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          isEmailVerified: user.is_email_verified,
          isPhoneVerified: user.is_phone_verified,
          createdAt: user.created_at,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
          phone: user.phone,
          dateOfBirth: user.date_of_birth,
          gender: user.gender,
          bio: user.bio,
          website: user.website,
          tagline: user.tagline,
          districtCity: user.district_city,
          coverUrl: user.cover_url,
          locationWkt: user.location_wkt,
          completedJobs: Number(freelancerResult.rows[0]?.completed_jobs) || 0,
        },
        completionScore,
        skills: skillsResult.rows,
        freelancerProfile: freelancerResult.rows[0] || null,
        services: servicesResult.rows,
        portfolio: portfolioResult.rows,
        exclusiveResources,
        profileFiles,
        reviews: reviewsResult.rows,
        timeline: timelineResult.rows,
      });
    }

    const clientStatsResult = await client.query(
      `SELECT
         COALESCE((SELECT COUNT(*) FROM public.jobs j WHERE j.client_id = $1), 0) AS total_jobs,
         COALESCE((SELECT COUNT(*) FROM public.jobs j WHERE j.client_id = $1 AND j.status = 'open'), 0) AS open_jobs,
         COALESCE((SELECT COUNT(*) FROM public.contracts c WHERE c.client_id = $1), 0) AS total_contracts
       `,
      [userId],
    );

    const recentJobsResult = await client.query(
      `SELECT id, title, budget, status, created_at
       FROM public.jobs
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );

    let accountBalance = 0;
    let escrowBalance = 0;
    try {
      const accountResult = await client.query(
        `SELECT balance, escrow_balance
         FROM public.accounts
         WHERE user_id = $1 AND currency = 'VND'
         LIMIT 1`,
        [userId],
      );
      if (accountResult.rows[0]) {
        accountBalance = Number(accountResult.rows[0].balance) || 0;
        escrowBalance = Number(accountResult.rows[0].escrow_balance) || 0;
      }
    } catch (accountErr) {
      if (accountErr.code === "42703") {
        const fallback = await client.query(
          `SELECT balance FROM public.accounts WHERE user_id = $1 AND currency = 'VND' LIMIT 1`,
          [userId],
        );
        accountBalance = Number(fallback.rows[0]?.balance) || 0;
      } else {
        throw accountErr;
      }
    }

    let recentPayments = [];
    try {
      const paymentsResult = await client.query(
        `SELECT
           c.id,
           c.job_id,
           c.service_id,
           COALESCE(j.title, s.title, 'Đơn hàng dịch vụ') AS title,
           c.agreed_price AS amount,
           COALESCE(c.funded_at, c.created_at) AS paid_at,
           fup.full_name AS freelancer_name,
           c.escrow_status
         FROM public.contracts c
         LEFT JOIN public.jobs j ON j.id = c.job_id
         LEFT JOIN public.services s ON s.id = c.service_id
         LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
         WHERE c.client_id = $1
           AND c.deleted_at IS NULL
           AND COALESCE(c.escrow_status, 'none') IN ('funded', 'released')
         ORDER BY COALESCE(c.funded_at, c.created_at) DESC
         LIMIT 30`,
        [userId],
      );
      recentPayments = paymentsResult.rows;
    } catch (paymentsErr) {
      if (paymentsErr.code !== "42703") throw paymentsErr;
    }

    // Đánh giá khách hàng gửi cho freelancer nằm ở contract_reviews (không phải bảng reviews cũ).
    const clientReviewsResult = await client.query(
      `SELECT
         cr.id,
         cr.rating,
         cr.comment,
         cr.created_at,
         freelancer_up.full_name AS reviewer_name
       FROM public.contract_reviews cr
       LEFT JOIN public.user_profiles freelancer_up ON freelancer_up.user_id = cr.freelancer_id
       WHERE cr.client_id = $1
       ORDER BY cr.created_at DESC
       LIMIT 8`,
      [userId],
    );

    const timelineResult = await client.query(
      `SELECT event_type, event_time, event_title
       FROM (
        SELECT 'job_created'::text AS event_type, j.created_at AS event_time, ('Tạo công việc: ' || j.title)::text AS event_title
         FROM public.jobs j
         WHERE j.client_id = $1
         UNION ALL
        SELECT 'contract_created'::text AS event_type, c.created_at AS event_time, ('Khởi tạo hợp đồng — ' || COALESCE(j.title, 'dịch vụ'))::text AS event_title
         FROM public.contracts c
         LEFT JOIN public.jobs j ON j.id = c.job_id
         WHERE c.client_id = $1 AND c.deleted_at IS NULL
         UNION ALL
        SELECT 'login'::text AS event_type, l.logged_in_at AS event_time, 'Đăng nhập hệ thống'::text AS event_title
         FROM public.user_login_logs l
         WHERE l.user_id = $1
       ) t
       ORDER BY event_time DESC
       LIMIT 10`,
      [userId],
    );

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        isEmailVerified: user.is_email_verified,
        isPhoneVerified: user.is_phone_verified,
        createdAt: user.created_at,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        dateOfBirth: user.date_of_birth,
        gender: user.gender,
        bio: user.bio,
        website: user.website,
        tagline: user.tagline,
        districtCity: user.district_city,
        locationWkt: user.location_wkt,
      },
      completionScore,
      skills: skillsResult.rows,
      clientStats: clientStatsResult.rows[0],
      recentJobs: recentJobsResult.rows,
      reviews: clientReviewsResult.rows,
      timeline: timelineResult.rows,
      account: {
        balance: accountBalance,
        escrowBalance,
      },
      recentPayments,
    });
  } catch (error) {
    console.error("Get profile failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? l?y h? s? ng??i d�ng l�c n�y." });
  } finally {
    client.release();
  }
}

async function listMyFeedback(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const role = String(payload.role || "").toLowerCase();
  const db = await pool.connect();

  try {
    if (role === "freelancer") {
      const result = await db.query(
        `SELECT
           cr.id,
           cr.rating,
           cr.comment,
           cr.created_at,
           cr.contract_id,
           cr.job_id,
           reviewer_up.full_name AS reviewer_name,
           j.title AS job_title,
           c.status AS contract_status,
           c.end_date AS contract_end
         FROM public.contract_reviews cr
         INNER JOIN public.contracts c
           ON c.id = cr.contract_id AND c.deleted_at IS NULL AND c.status = 'completed'
         INNER JOIN public.jobs j ON j.id = cr.job_id
         LEFT JOIN public.user_profiles reviewer_up ON reviewer_up.user_id = cr.client_id
         WHERE cr.freelancer_id = $1
         ORDER BY cr.created_at DESC`,
        [userId],
      );
      return res.json({ role: "freelancer", reviews: result.rows });
    }

    if (role === "client") {
      const result = await db.query(
        `SELECT
           cr.id,
           cr.rating,
           cr.comment,
           cr.created_at,
           cr.contract_id,
           cr.job_id,
           freelancer_up.full_name AS reviewer_name,
           j.title AS job_title,
           c.status AS contract_status,
           c.end_date AS contract_end
         FROM public.contract_reviews cr
         INNER JOIN public.contracts c
           ON c.id = cr.contract_id AND c.deleted_at IS NULL AND c.status = 'completed'
         INNER JOIN public.jobs j ON j.id = cr.job_id
         LEFT JOIN public.user_profiles freelancer_up ON freelancer_up.user_id = cr.freelancer_id
         WHERE cr.client_id = $1
         ORDER BY cr.created_at DESC`,
        [userId],
      );
      return res.json({ role: "client", reviews: result.rows });
    }

    return res.status(403).json({ message: "Chỉ khách hàng hoặc freelancer có thể xem phản hồi." });
  } catch (error) {
    console.error("List my feedback failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu bảng contract_reviews hoặc cột contracts. Chạy backend/sql/contracts_reviews.sql và contracts_workflow_columns.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể tải phản hồi." });
  } finally {
    db.release();
  }
}

async function getCredentials(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const db = await pool.connect();
  try {
    const auth = await loadUserAuthMethods(db, payload.sub);
    if (!auth) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    return res.json({
      email: auth.email,
      isGoogleAccount: auth.isGoogleAccount,
      hasLocalPassword: auth.hasLocalPassword,
      isGoogleOnly: auth.isGoogleOnly,
    });
  } catch (error) {
    console.error("Get credentials failed:", error.message);
    return res.status(500).json({ message: "Không thể tải thông tin đăng nhập." });
  } finally {
    db.release();
  }
}

async function changeEmail(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const newEmail = normalizeEmail(req.body?.newEmail);
  const currentPassword = String(req.body?.currentPassword || "");

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return res.status(400).json({ message: "Email không hợp lệ." });
  }
  if (!currentPassword) {
    return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại." });
  }

  const db = await pool.connect();
  try {
    const auth = await loadUserAuthMethods(db, payload.sub);
    if (!auth) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
    if (auth.isGoogleAccount) {
      return res.status(403).json({
        message:
          "Email đang liên kết với tài khoản Google. Địa chỉ đăng nhập được quản lý qua Google và không thể đổi tại đây.",
        code: "GOOGLE_EMAIL_LOCKED",
      });
    }

    const check = await verifyCurrentPassword(db, payload.sub, currentPassword);
    if (!check.ok) {
      return res.status(check.status).json({ message: check.message });
    }

    const existing = await db.query(
      `SELECT id FROM public.users WHERE LOWER(email) = $1 AND id <> $2 AND deleted_at IS NULL LIMIT 1`,
      [newEmail, payload.sub],
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: "Email đã được sử dụng." });
    }

    await db.query(
      `UPDATE public.users SET email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [payload.sub, newEmail],
    );

    return res.json({
      message: "Đã cập nhật tên người dùng. Vui lòng đăng nhập lại.",
      email: newEmail,
      requireReLogin: true,
    });
  } catch (error) {
    console.error("Change email failed:", error.message);
    return res.status(500).json({ message: "Không thể đổi email." });
  } finally {
    db.release();
  }
}

async function changePassword(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  const pwdError = validateNewPassword(newPassword);
  if (pwdError) {
    return res.status(400).json({ message: pwdError });
  }

  const db = await pool.connect();
  try {
    const auth = await loadUserAuthMethods(db, payload.sub);
    if (!auth) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    if (auth.isGoogleOnly) {
      if (currentPassword) {
        return res.status(400).json({
          message: "Tài khoản Google chưa có mật khẩu VLC — chỉ cần nhập mật khẩu mới.",
        });
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.query(
        `UPDATE public.users
         SET password_hash = $2,
             password_user_set_at = NOW(),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [payload.sub, passwordHash],
      );
      return res.json({
        message:
          "Đã tạo mật khẩu VLC. Bạn có thể đăng nhập bằng Google hoặc email/mật khẩu vừa tạo.",
        requireReLogin: false,
        hasLocalPassword: true,
        isGoogleOnly: false,
      });
    }

    if (!currentPassword) {
      return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại." });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "Mật khẩu mới phải khác mật khẩu hiện tại." });
    }

    const check = await verifyCurrentPassword(db, payload.sub, currentPassword);
    if (!check.ok) {
      return res.status(check.status).json({ message: check.message });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE public.users
       SET password_hash = $2,
           password_user_set_at = COALESCE(password_user_set_at, NOW()),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [payload.sub, passwordHash],
    );

    return res.json({
      message: "Đã cập nhật mật khẩu. Vui lòng đăng nhập lại.",
      requireReLogin: true,
    });
  } catch (error) {
    console.error("Change password failed:", error.message);
    return res.status(500).json({ message: "Không thể đổi mật khẩu." });
  } finally {
    db.release();
  }
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function toMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

async function getPublicHomeStats(_req, res) {
  let db;
  try {
    db = await pool.connect();
    // Ưu tiên dữ liệu có released_at để phản ánh giao dịch đã giải ngân thực.
    let statsQuery = `
      SELECT
        (SELECT COUNT(*)::int FROM public.users u
         WHERE u.deleted_at IS NULL AND LOWER(COALESCE(u.role, '')) = 'client') AS total_clients,
        (SELECT COUNT(*)::int FROM public.contracts c
         WHERE c.deleted_at IS NULL AND c.released_at IS NOT NULL) AS paid_invoices,
        (SELECT COALESCE(SUM(c.agreed_price), 0) FROM public.contracts c
         WHERE c.deleted_at IS NULL AND c.released_at IS NOT NULL) AS paid_to_freelancers,
        (SELECT
           CASE
             WHEN COUNT(*) = 0 THEN 0
             ELSE ROUND(100.0 * SUM(CASE WHEN cr.rating >= 4 THEN 1 ELSE 0 END) / COUNT(*), 0)::int
           END
         FROM public.contract_reviews cr) AS satisfaction_rate
    `;

    let rows;
    try {
      const result = await db.query(statsQuery);
      rows = result.rows;
    } catch (error) {
      if (error.code !== "42703") throw error;
      // Fallback cho DB cũ chưa có released_at.
      statsQuery = `
        SELECT
          (SELECT COUNT(*)::int FROM public.users u
           WHERE u.deleted_at IS NULL AND LOWER(COALESCE(u.role, '')) = 'client') AS total_clients,
          (SELECT COUNT(*)::int FROM public.contracts c
           WHERE c.deleted_at IS NULL AND LOWER(COALESCE(c.status, '')) = 'completed') AS paid_invoices,
          (SELECT COALESCE(SUM(c.agreed_price), 0) FROM public.contracts c
           WHERE c.deleted_at IS NULL AND LOWER(COALESCE(c.status, '')) = 'completed') AS paid_to_freelancers,
          (SELECT
             CASE
               WHEN COUNT(*) = 0 THEN 0
               ELSE ROUND(100.0 * SUM(CASE WHEN cr.rating >= 4 THEN 1 ELSE 0 END) / COUNT(*), 0)::int
             END
           FROM public.contract_reviews cr) AS satisfaction_rate
      `;
      const result = await db.query(statsQuery);
      rows = result.rows;
    }

    const row = rows[0] || {};
    return res.json({
      stats: {
        totalClients: toInt(row.total_clients),
        paidInvoices: toInt(row.paid_invoices),
        paidToFreelancers: toMoney(row.paid_to_freelancers),
        satisfactionRate: Math.min(100, toInt(row.satisfaction_rate)),
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getPublicHomeStats failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng dữ liệu thống kê. Chạy backend/sql/client_billing_payments.sql và contracts_reviews.sql.",
      });
    }
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return res.status(503).json({
        message: "Không thể kết nối cơ sở dữ liệu. Kiểm tra DB_HOST và Postgres đang chạy.",
      });
    }
    return res.status(500).json({ message: "Không thể tải thống kê trang chủ." });
  } finally {
    db?.release();
  }
}

module.exports = {
  updateAvatar,
  uploadAvatarAsset,
  updateProfile,
  updateSkills,
  createPortfolio,
  createExclusiveResource,
  createProfileFile,
  uploadProfileFileAsset,
  getMe,
  getCredentials,
  listMyFeedback,
  changeEmail,
  changePassword,
  getPublicHomeStats,
};
