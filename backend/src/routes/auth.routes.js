const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { pool } = require("../db/pool");
const { parseExpiryToMs } = require("../utils/time");
const { uploadJobImages } = require("../middleware/jobImagesUpload");

const router = express.Router();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

router.use((req, _res, next) => {
  if (req.path === "/me/avatar") {
    console.log(`[AUTH avatar] ${req.method} ${req.originalUrl}`);
  }
  next();
});

function getClientIp(req) {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string" && xForwardedFor.length > 0) {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.ip || null;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function signTokens(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
  };

  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

  return { accessToken, refreshToken };
}

function getAccessTokenFromRequest(req) {
  const raw = req.headers.authorization || "";
  if (!raw.startsWith("Bearer ")) return null;
  return raw.slice("Bearer ".length).trim();
}

function verifyAccessToken(req, res) {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ message: "Thi?u access token." });
    return null;
  }

  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    res.status(401).json({ message: "Access token kh�ng h?p l? ho?c ?� h?t h?n." });
    return null;
  }
}

/** Chuẩn hóa mảng URL ảnh (tối đa 3): https/http hoặc đường dẫn upload nội bộ */
function normalizeJobImageUrls(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (out.length >= 3) break;
    const u = String(item ?? "").trim();
    if (!u) continue;
    if (/^https?:\/\//i.test(u) || u.startsWith("/uploads/jobs/")) {
      out.push(u);
    }
  }
  return out;
}

function buildDefaultServicePackages(price, deliveryDays) {
  const base = Math.max(500000, Number(price) || 1500000);
  const deliveryBase = Number.isFinite(Number(deliveryDays)) && Number(deliveryDays) > 0 ? Number(deliveryDays) : 5;
  return [
    {
      id: "basic",
      name: "Basic",
      price: Math.round(base * 0.7),
      deliveryDays: Math.max(2, deliveryBase - 2),
      revisions: "1 lần",
      features: ["1 trang", "Responsive cơ bản", "Bàn giao mã nguồn"],
    },
    {
      id: "standard",
      name: "Standard",
      price: Math.round(base),
      deliveryDays: deliveryBase,
      revisions: "3 lần",
      features: ["3 trang", "Responsive đầy đủ", "SEO on-page"],
    },
    {
      id: "premium",
      name: "Premium",
      price: Math.round(base * 1.5),
      deliveryDays: deliveryBase + 4,
      revisions: "Không giới hạn",
      features: ["5+ trang", "SEO kỹ thuật", "Hỗ trợ sau bàn giao 7 ngày"],
    },
  ];
}

async function persistRefreshToken(client, userId, refreshToken, req) {
  const expiresAt = new Date(Date.now() + parseExpiryToMs(REFRESH_EXPIRY, 7 * 24 * 60 * 60 * 1000));
  const ipAddress = getClientIp(req);
  const userAgent = req.headers["user-agent"] || null;

  await client.query(
    `INSERT INTO public.refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, refreshToken, expiresAt, ipAddress, userAgent],
  );
}

async function logLoginAttempt(client, { email, ip, success }) {
  await client.query(
    `INSERT INTO public.login_attempts (email, ip_address, success)
     VALUES ($1, $2, $3)`,
    [email, ip || "unknown", success],
  );
}

router.post("/register", async (req, res) => {
  const { email, password, role, fullName, phone, bio, title, hourlyRate, experienceYears, availabilityStatus } = req.body || {};

  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (!normalizedEmail || !password || !fullName) {
    return res.status(400).json({ message: "Email, m?t kh?u v� h? t�n l� b?t bu?c." });
  }

  if (!["client", "freelancer"].includes(normalizedRole)) {
    return res.status(400).json({ message: "Vai tr� ph?i l� client ho?c freelancer." });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: "M?t kh?u t?i thi?u 8 k� t?." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existsResult = await client.query(
      `SELECT id FROM public.users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
      [normalizedEmail],
    );

    if (existsResult.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Email ?� t?n t?i." });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const userResult = await client.query(
      `INSERT INTO public.users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [normalizedEmail, passwordHash, normalizedRole],
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO public.user_profiles (user_id, full_name, phone, bio)
       VALUES ($1, $2, $3, $4)`,
      [user.id, String(fullName).trim(), phone || null, bio || null],
    );

    if (normalizedRole === "freelancer") {
      await client.query(
        `INSERT INTO public.freelancer_profiles
          (user_id, title, hourly_rate, experience_years, availability_status, languages)
         VALUES ($1, $2, $3, $4, $5, '[]'::jsonb)`,
        [
          user.id,
          title || null,
          hourlyRate ? Number(hourlyRate) : null,
          experienceYears !== undefined && experienceYears !== null && experienceYears !== "" ? Number(experienceYears) : null,
          availabilityStatus || "available",
        ],
      );
    }

    const { accessToken, refreshToken } = signTokens(user);
    await persistRefreshToken(client, user.id, refreshToken, req);

    await client.query("COMMIT");

    return res.status(201).json({
      message: "??ng k� th�nh c�ng.",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: String(fullName).trim(),
      },
      tokens: {
        accessToken,
        refreshToken,
        accessExpiry: ACCESS_EXPIRY,
        refreshExpiry: REFRESH_EXPIRY,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Register failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? ??ng k� t�i kho?n l�c n�y." });
  } finally {
    client.release();
  }
});

router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const ipAddress = getClientIp(req);

  if (!email || !password) {
    return res.status(400).json({ message: "Email v� m?t kh?u l� b?t bu?c." });
  }

  const client = await pool.connect();

  try {
    const userResult = await client.query(
      `SELECT u.id, u.email, u.role, u.password_hash, up.full_name, up.avatar_url
       FROM public.users u
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [email],
    );

    if (userResult.rowCount === 0) {
      await logLoginAttempt(client, { email, ip: ipAddress, success: false });
      return res.status(401).json({ message: "Sai th�ng tin ??ng nh?p." });
    }

    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      await logLoginAttempt(client, { email, ip: ipAddress, success: false });
      return res.status(401).json({ message: "Sai th�ng tin ??ng nh?p." });
    }

    const { accessToken, refreshToken } = signTokens(user);

    await client.query("BEGIN");
    await persistRefreshToken(client, user.id, refreshToken, req);
    await logLoginAttempt(client, { email, ip: ipAddress, success: true });
    await client.query(
      `INSERT INTO public.user_login_logs (user_id, ip_address, user_agent)
       VALUES ($1, $2::inet, $3)`,
      [user.id, ipAddress || null, req.headers["user-agent"] || null],
    );
    await client.query("COMMIT");

    return res.json({
      message: "??ng nh?p th�nh c�ng.",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name || null,
        avatarUrl: user.avatar_url || null,
      },
      tokens: {
        accessToken,
        refreshToken,
        accessExpiry: ACCESS_EXPIRY,
        refreshExpiry: REFRESH_EXPIRY,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Login failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? ??ng nh?p l�c n�y." });
  } finally {
    client.release();
  }
});

router.post("/refresh", async (req, res) => {
  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (!refreshToken) {
    return res.status(400).json({ message: "Thi?u refresh token." });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch {
    return res.status(401).json({ message: "Refresh token kh�ng h?p l? ho?c ?� h?t h?n." });
  }

  const client = await pool.connect();
  try {
    const tokenResult = await client.query(
      `SELECT token
       FROM public.refresh_tokens
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW()
       LIMIT 1`,
      [payload.sub, refreshToken],
    );

    if (tokenResult.rowCount === 0) {
      return res.status(401).json({ message: "Phi�n ??ng nh?p ?� h?t h?n. Vui l�ng ??ng nh?p l?i." });
    }

    const userResult = await client.query(
      `SELECT id, email, role
       FROM public.users
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [payload.sub],
    );
    if (userResult.rowCount === 0) {
      return res.status(401).json({ message: "Ng??i d�ng kh�ng c�n hi?u l?c." });
    }

    const user = userResult.rows[0];
    const accessToken = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
      },
      ACCESS_SECRET,
      { expiresIn: ACCESS_EXPIRY },
    );

    return res.json({
      message: "L�m m?i phi�n th�nh c�ng.",
      tokens: {
        accessToken,
        refreshToken,
        accessExpiry: ACCESS_EXPIRY,
        refreshExpiry: REFRESH_EXPIRY,
      },
    });
  } catch (error) {
    console.error("Refresh failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? l�m m?i phi�n l�c n�y." });
  } finally {
    client.release();
  }
});

router.post("/logout", async (req, res) => {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (!refreshToken) {
    return res.status(400).json({ message: "Thi?u refresh token." });
  }

  const client = await pool.connect();
  try {
    await client.query(
      `DELETE FROM public.refresh_tokens
       WHERE user_id = $1 AND token = $2`,
      [payload.sub, refreshToken],
    );

    return res.json({ message: "??ng xu?t th�nh c�ng." });
  } catch (error) {
    console.error("Logout failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? ??ng xu?t l�c n�y." });
  } finally {
    client.release();
  }
});

async function updateAvatarHandler(req, res) {
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

router.options("/me/avatar", (_req, res) => res.sendStatus(204));
router.patch("/me/avatar", updateAvatarHandler);
router.post("/me/avatar", updateAvatarHandler);

/** Cập nhật thông tin hồ sơ theo vai trò */
router.patch("/me/profile", async (req, res) => {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const role = String(payload.role || "").toLowerCase();
  const fullName = String(req.body?.fullName ?? "").trim().slice(0, 180);
  const phone = String(req.body?.phone ?? "").trim().slice(0, 40);
  const bio = String(req.body?.bio ?? "").trim().slice(0, 3000);
  const website = String(req.body?.website ?? "").trim().slice(0, 255);
  const dateOfBirth = req.body?.dateOfBirth ? String(req.body.dateOfBirth).slice(0, 10) : null;
  const gender = req.body?.gender ? String(req.body.gender).trim().slice(0, 30) : null;

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

  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");

    await dbClient.query(
      `INSERT INTO public.user_profiles (user_id, full_name, phone, bio, website, date_of_birth, gender, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         bio = EXCLUDED.bio,
         website = EXCLUDED.website,
         date_of_birth = EXCLUDED.date_of_birth,
         gender = EXCLUDED.gender,
         updated_at = NOW()`,
      [userId, fullName, phone || null, bio || null, website || null, dateOfBirth, gender],
    );

    if (role === "freelancer") {
      await dbClient.query(
        `INSERT INTO public.freelancer_profiles
          (user_id, title, hourly_rate, experience_years, availability_status, languages)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (user_id)
         DO UPDATE SET
           title = EXCLUDED.title,
           hourly_rate = EXCLUDED.hourly_rate,
           experience_years = EXCLUDED.experience_years,
           availability_status = EXCLUDED.availability_status,
           languages = EXCLUDED.languages,
           updated_at = NOW()`,
        [userId, title || null, hourlyRate, experienceYears, availabilityStatus || "available", JSON.stringify(languages || [])],
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
});

/** Freelancer: cập nhật danh sách kỹ năng */
router.put("/me/skills", async (req, res) => {
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
});

/** Freelancer: thêm portfolio */
router.post("/me/portfolio", async (req, res) => {
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
});

router.post("/me/service", async (req, res) => {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới có thể tạo dịch vụ." });
  }

  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const price = Number(req.body?.price);
  const deliveryDays = req.body?.deliveryDays !== undefined ? Number(req.body.deliveryDays) : null;
  const category = String(req.body?.category || "").trim().slice(0, 255);
  const requirements = String(req.body?.requirements || "").trim().slice(0, 4000);
  const supportUpsell = String(req.body?.supportUpsell || "").trim().slice(0, 255);
  const mediaUrls = Array.isArray(req.body?.mediaUrls)
    ? req.body.mediaUrls.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 16)
    : [];
  const techStack = Array.isArray(req.body?.techStack)
    ? req.body.techStack.map((v) => String(v || "").trim()).filter(Boolean).slice(0, 32)
    : [];
  const faqs = Array.isArray(req.body?.faqs)
    ? req.body.faqs
        .map((row) => ({
          q: String(row?.q || "").trim().slice(0, 300),
          a: String(row?.a || "").trim().slice(0, 1200),
        }))
        .filter((row) => row.q && row.a)
        .slice(0, 20)
    : [];
  const packages = Array.isArray(req.body?.packages)
    ? req.body.packages
        .map((pack) => ({
          id: String(pack?.id || "").trim().toLowerCase().slice(0, 40),
          name: String(pack?.name || "").trim().slice(0, 60),
          price: Number(pack?.price),
          deliveryDays: Number(pack?.deliveryDays),
          revisions: String(pack?.revisions || "").trim().slice(0, 120),
          features: Array.isArray(pack?.features)
            ? pack.features.map((f) => String(f || "").trim()).filter(Boolean).slice(0, 20)
            : [],
        }))
        .filter((pack) => pack.id && pack.name && Number.isFinite(pack.price) && pack.price > 0)
        .slice(0, 3)
    : [];
  const responseTimeHoursRaw = req.body?.responseTimeHours;
  const responseTimeHours =
    responseTimeHoursRaw !== undefined && responseTimeHoursRaw !== null && responseTimeHoursRaw !== ""
      ? Number(responseTimeHoursRaw)
      : null;

  if (!title || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ message: "Tiêu đề và giá dịch vụ hợp lệ là bắt buộc." });
  }
  if (responseTimeHours !== null && (!Number.isFinite(responseTimeHours) || responseTimeHours <= 0)) {
    return res.status(400).json({ message: "Thời gian phản hồi trung bình không hợp lệ." });
  }

  const client = await pool.connect();
  try {
    const normalizedPackages = packages.length ? packages : buildDefaultServicePackages(price, deliveryDays);
    const result = await client.query(
      `INSERT INTO public.services (
         freelancer_id, title, description, price, delivery_days,
         category, media_urls, packages, tech_stack, requirements, faqs, response_time_hours, support_upsell
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11::jsonb, $12, $13)
       RETURNING id, title, description, price, delivery_days, category, media_urls, packages, tech_stack, requirements, faqs, response_time_hours, support_upsell, created_at`,
      [
        payload.sub,
        title,
        description || null,
        price,
        deliveryDays,
        category || null,
        JSON.stringify(mediaUrls),
        JSON.stringify(normalizedPackages),
        JSON.stringify(techStack),
        requirements || null,
        JSON.stringify(faqs),
        responseTimeHours,
        supportUpsell || null,
      ],
    );

    return res.status(201).json({ message: "Tạo dịch vụ thành công.", service: result.rows[0] });
  } catch (error) {
    console.error("Create service failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message: "Thiếu cột chi tiết dịch vụ. Chạy script backend/sql/services_detail_columns.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tạo dịch vụ lúc này." });
  } finally {
    client.release();
  }
});

router.post("/me/job-images", (req, res) => {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "client") {
    return res.status(403).json({ message: "Chỉ client được tải ảnh đính kèm tin việc làm." });
  }

  const handler = uploadJobImages.array("images", 3);
  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Tải ảnh thất bại." });
    }
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "Chọn từ 1 đến 3 ảnh." });
    }
    const urls = files.map((f) => `/uploads/jobs/${f.filename}`);
    return res.status(201).json({ urls });
  });
});

router.post("/me/job", async (req, res) => {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "client") {
    return res.status(403).json({ message: "Ch? client m?i c� th? ??ng c�ng vi?c." });
  }

  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const budget = req.body?.budget !== undefined && req.body?.budget !== "" ? Number(req.body.budget) : null;
  const images = normalizeJobImageUrls(req.body?.images);

  let dueAt = null;
  const dueRaw = req.body?.due_at;
  if (dueRaw !== undefined && dueRaw !== null && String(dueRaw).trim() !== "") {
    const d = new Date(String(dueRaw));
    if (!Number.isFinite(d.getTime())) {
      return res.status(400).json({ message: "Thời hạn hoàn thành không hợp lệ." });
    }
    dueAt = d;
  }

  if (!title) {
    return res.status(400).json({ message: "Ti�u ?? c�ng vi?c l� b?t bu?c." });
  }
  if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
    return res.status(400).json({ message: "Ng�n s�ch kh�ng h?p l?." });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO public.jobs (client_id, title, description, budget, status, images, due_at)
       VALUES ($1, $2, $3, $4, 'open', $5::jsonb, $6)
       RETURNING id, title, description, budget, status, images, due_at, created_at`,
      [payload.sub, title, description || null, budget, JSON.stringify(images), dueAt],
    );

    return res.status(201).json({ message: "??ng c�ng vi?c th�nh c�ng.", job: result.rows[0] });
  } catch (error) {
    console.error("Create job failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột jobs.images hoặc jobs.due_at. Chạy backend/sql/jobs_images_due_at.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Kh�ng th? ??ng c�ng vi?c l�c n�y." });
  } finally {
    client.release();
  }
});

function parseUuidParam(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)) return null;
  return s;
}

/** Freelancer nhận việc: tạo hợp đồng (contracts) và đặt jobs.status = in_progress */
router.post("/me/jobs/:jobId/accept", async (req, res) => {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới có thể tiếp nhận việc." });
  }

  const jobId = parseUuidParam(req.params.jobId);
  if (!jobId) {
    return res.status(400).json({ message: "Mã công việc không hợp lệ." });
  }

  const freelancerId = payload.sub;
  const dbClient = await pool.connect();

  try {
    await dbClient.query("BEGIN");

    const jobResult = await dbClient.query(
      `SELECT id, client_id, budget, status FROM public.jobs WHERE id = $1 FOR UPDATE`,
      [jobId],
    );

    if (jobResult.rowCount === 0) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy công việc." });
    }

    const job = jobResult.rows[0];

    if (job.status !== "open") {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "Công việc không còn trạng thái mở để nhận." });
    }

    if (String(job.client_id) === String(freelancerId)) {
      await dbClient.query("ROLLBACK");
      return res.status(403).json({ message: "Bạn không thể nhận công việc do chính bạn đăng." });
    }

    const existing = await dbClient.query(
      `SELECT id FROM public.contracts
       WHERE job_id = $1 AND deleted_at IS NULL AND status IN ('pending', 'active')
       LIMIT 1`,
      [jobId],
    );

    if (existing.rowCount > 0) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "Công việc đã được freelancer khác tiếp nhận." });
    }

    const insertResult = await dbClient.query(
      `INSERT INTO public.contracts (job_id, service_id, client_id, freelancer_id, agreed_price, start_date, status)
       VALUES ($1, NULL, $2, $3, $4, CURRENT_TIMESTAMP, 'active')
       RETURNING id, job_id, agreed_price, status, created_at`,
      [jobId, job.client_id, freelancerId, job.budget],
    );

    await dbClient.query(`UPDATE public.jobs SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
      jobId,
    ]);

    await dbClient.query("COMMIT");

    return res.status(201).json({
      message: "Bạn đã tiếp nhận công việc thành công.",
      contract: insertResult.rows[0],
    });
  } catch (error) {
    await dbClient.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") {
      return res.status(409).json({ message: "Công việc đã được freelancer khác tiếp nhận." });
    }
    console.error("Accept job failed:", error.message);
    return res.status(500).json({ message: "Không thể tiếp nhận công việc lúc này." });
  } finally {
    dbClient.release();
  }
});

/** Hợp đồng của user (freelancer hoặc client), kèm tiêu đề job và đối tác */
router.get("/me/contracts", async (req, res) => {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const dbClient = await pool.connect();

  try {
    const result = await dbClient.query(
      `SELECT
         c.id,
         c.job_id,
         c.service_id,
         c.agreed_price,
         c.status,
         c.start_date,
         c.end_date,
         c.created_at,
         c.progress_note,
         c.delivered_at,
         j.title AS job_title,
         j.status AS job_status,
         CASE
           WHEN c.client_id = $1 THEN fup.full_name
           ELSE cup.full_name
         END AS counterparty_name
       FROM public.contracts c
       LEFT JOIN public.jobs j ON j.id = c.job_id
       LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
       LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
       WHERE (c.client_id = $1 OR c.freelancer_id = $1) AND c.deleted_at IS NULL
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [userId],
    );

    return res.json({ contracts: result.rows });
  } catch (error) {
    console.error("List contracts failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng contracts. Chạy script backend/sql/contracts_workflow_columns.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải danh sách hợp đồng." });
  } finally {
    dbClient.release();
  }
});

/** Dashboard: Client — tin đã đăng + freelancer nhận việc; Freelancer — việc đã nhận */
router.get("/me/my-work", async (req, res) => {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const role = String(payload.role || "").toLowerCase();
  const dbClient = await pool.connect();

  try {
    if (role === "client") {
      const result = await dbClient.query(
        `SELECT
           j.id AS job_id,
           j.title,
           j.description,
           j.budget,
           j.status AS job_status,
           j.created_at AS job_created_at,
           j.updated_at AS job_updated_at,
           j.images AS job_images,
           j.due_at AS job_due_at,
           c.id AS contract_id,
           c.status AS contract_status,
           c.agreed_price,
           c.start_date AS contract_start,
           c.end_date AS contract_end,
           c.created_at AS contract_created_at,
           c.progress_note,
           c.delivered_at,
           c.freelancer_id,
           cr.id AS review_id,
           cr.rating AS review_rating,
           cr.comment AS review_comment,
           cr.created_at AS review_created_at,
           fup.full_name AS freelancer_name,
           fu.email AS freelancer_email
         FROM public.jobs j
         LEFT JOIN public.contracts c ON c.job_id = j.id AND c.deleted_at IS NULL
         LEFT JOIN public.contract_reviews cr ON cr.contract_id = c.id AND cr.client_id = j.client_id
         LEFT JOIN public.user_profiles fup ON fup.user_id = c.freelancer_id
         LEFT JOIN public.users fu ON fu.id = c.freelancer_id AND fu.deleted_at IS NULL
         WHERE j.client_id = $1
         ORDER BY j.created_at DESC`,
        [userId],
      );
      return res.json({ role: "client", jobs: result.rows });
    }

    if (role === "freelancer") {
      const result = await dbClient.query(
        `SELECT
           c.id AS contract_id,
           c.status AS contract_status,
           c.agreed_price,
           c.start_date AS contract_start,
           c.end_date AS contract_end,
           c.created_at AS contract_created_at,
           c.progress_note,
           c.delivered_at,
           j.id AS job_id,
           j.title,
           j.description,
           j.budget,
           j.status AS job_status,
           j.created_at AS job_created_at,
           j.images AS job_images,
           j.due_at AS job_due_at,
           cr.id AS review_id,
           cr.rating AS review_rating,
           cr.comment AS review_comment,
           cr.created_at AS review_created_at,
           cup.full_name AS client_name,
           cu.email AS client_email
         FROM public.contracts c
         INNER JOIN public.jobs j ON j.id = c.job_id
         LEFT JOIN public.contract_reviews cr ON cr.contract_id = c.id
         LEFT JOIN public.user_profiles cup ON cup.user_id = c.client_id
         LEFT JOIN public.users cu ON cu.id = c.client_id AND cu.deleted_at IS NULL
         WHERE c.freelancer_id = $1 AND c.deleted_at IS NULL
         ORDER BY c.created_at DESC`,
        [userId],
      );
      return res.json({ role: "freelancer", assignments: result.rows });
    }

    return res.status(403).json({ message: "Chỉ client hoặc freelancer có thể xem trang này." });
  } catch (error) {
    console.error("My work failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột DB (contracts.progress_note/delivered_at, jobs.images/due_at hoặc contract_reviews). Chạy backend/sql/contracts_workflow_columns.sql, backend/sql/jobs_images_due_at.sql và backend/sql/contracts_reviews.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể tải công việc của bạn." });
  } finally {
    dbClient.release();
  }
});

/** Freelancer: ghi chú tiến độ / đánh dấu đã bàn giao (đóng job liên quan) */
router.patch("/me/contracts/:contractId", async (req, res) => {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới cập nhật tiến độ và bàn giao." });
  }

  const contractId = parseUuidParam(req.params.contractId);
  if (!contractId) {
    return res.status(400).json({ message: "Mã hợp đồng không hợp lệ." });
  }

  const hasProgressKey =
    req.body !== null && req.body !== undefined && Object.prototype.hasOwnProperty.call(req.body, "progressNote");
  const progressNote = hasProgressKey ? String(req.body.progressNote ?? "").trim().slice(0, 4000) : undefined;
  const markDelivered = req.body?.markDelivered === true;

  if (!hasProgressKey && !markDelivered) {
    return res.status(400).json({ message: "Gửi progressNote và/hoặc markDelivered." });
  }

  const freelancerId = payload.sub;
  const dbClient = await pool.connect();

  try {
    await dbClient.query("BEGIN");

    const check = await dbClient.query(
      `SELECT id, job_id, status FROM public.contracts WHERE id = $1 AND freelancer_id = $2 AND deleted_at IS NULL`,
      [contractId, freelancerId],
    );

    if (check.rowCount === 0) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy hợp đồng." });
    }

    const current = check.rows[0];
    if (["cancelled"].includes(String(current.status || "").toLowerCase())) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "Hợp đồng đã hủy, không thể cập nhật." });
    }

    let i = 1;
    const params = [];
    const sets = [];

    if (hasProgressKey) {
      sets.push(`progress_note = $${i++}`);
      params.push(progressNote);
    }
    if (markDelivered) {
      sets.push(`delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)`);
      sets.push(`status = 'completed'::public.contract_status`);
    }

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    const idSlot = i++;
    const userSlot = i++;
    params.push(contractId);
    params.push(freelancerId);

    const updSql = `
      UPDATE public.contracts
      SET ${sets.join(", ")}
      WHERE id = $${idSlot} AND freelancer_id = $${userSlot} AND deleted_at IS NULL
      RETURNING id, job_id, progress_note, delivered_at, status`;

    const upd = await dbClient.query(updSql, params);

    const updated = upd.rows[0];
    if (markDelivered && updated?.job_id) {
      await dbClient.query(`UPDATE public.jobs SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
        updated.job_id,
      ]);
    }

    await dbClient.query("COMMIT");

    return res.json({
      message: markDelivered ? "Đã ghi nhận bàn giao và đóng công việc." : "Đã lưu ghi chú tiến độ.",
      contract: updated,
    });
  } catch (error) {
    await dbClient.query("ROLLBACK").catch(() => {});
    console.error("Patch contract failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng contracts. Chạy script backend/sql/contracts_workflow_columns.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể cập nhật hợp đồng." });
  } finally {
    dbClient.release();
  }
});

/** Client: đánh giá freelancer sau khi hoàn thành */
router.post("/me/contracts/:contractId/review", async (req, res) => {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "client") {
    return res.status(403).json({ message: "Chỉ client mới có thể đánh giá freelancer." });
  }

  const contractId = parseUuidParam(req.params.contractId);
  if (!contractId) {
    return res.status(400).json({ message: "Mã hợp đồng không hợp lệ." });
  }

  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment ?? "").trim().slice(0, 2000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Số sao đánh giá phải từ 1 đến 5." });
  }

  const clientId = payload.sub;
  const dbClient = await pool.connect();
  try {
    await dbClient.query("BEGIN");

    const contractRes = await dbClient.query(
      `SELECT c.id, c.job_id, c.client_id, c.freelancer_id, c.status, c.delivered_at
       FROM public.contracts c
       WHERE c.id = $1 AND c.client_id = $2 AND c.deleted_at IS NULL
       LIMIT 1`,
      [contractId, clientId],
    );

    if (contractRes.rowCount === 0) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy hợp đồng để đánh giá." });
    }

    const contract = contractRes.rows[0];
    if (!contract.freelancer_id) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "Chưa có freelancer nhận hợp đồng này." });
    }

    const statusKey = String(contract.status || "").toLowerCase();
    if (statusKey !== "completed" && !contract.delivered_at) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "Chỉ đánh giá khi công việc đã hoàn thành/bàn giao." });
    }

    const upsert = await dbClient.query(
      `INSERT INTO public.contract_reviews (contract_id, job_id, client_id, freelancer_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (contract_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = CURRENT_TIMESTAMP
       RETURNING id, contract_id, rating, comment, created_at, updated_at`,
      [contract.id, contract.job_id, clientId, contract.freelancer_id, rating, comment || null],
    );

    await dbClient.query("COMMIT");
    return res.status(201).json({ message: "Đã lưu đánh giá freelancer.", review: upsert.rows[0] });
  } catch (error) {
    await dbClient.query("ROLLBACK").catch(() => {});
    console.error("Create review failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng contract_reviews. Chạy backend/sql/contracts_reviews.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể lưu đánh giá lúc này." });
  } finally {
    dbClient.release();
  }
});

router.get("/me", async (req, res) => {
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
           fp.experience_years,
           COALESCE(fp.availability_status, 'available') AS availability_status,
           fp.total_earnings,
           COALESCE(rv.rating_avg, 0) AS rating_avg,
           COALESCE(rv.total_reviews, 0) AS total_reviews,
           fp.languages,
           COALESCE((SELECT COUNT(*) FROM public.services sv WHERE sv.freelancer_id = u.id), 0) AS services_count
         FROM public.users u
         LEFT JOIN public.freelancer_profiles fp ON fp.user_id = u.id
         LEFT JOIN (
           SELECT freelancer_id, ROUND(AVG(rating)::numeric, 2) AS rating_avg, COUNT(*)::int AS total_reviews
           FROM public.contract_reviews
           GROUP BY freelancer_id
         ) rv ON rv.freelancer_id = u.id
         WHERE u.id = $1 AND u.deleted_at IS NULL
         LIMIT 1`,
        [userId],
      );

      const servicesResult = await client.query(
        `SELECT id, title, description, price, delivery_days, created_at
         FROM public.services
         WHERE freelancer_id = $1
         ORDER BY created_at DESC
         LIMIT 6`,
        [userId],
      );

      const portfolioResult = await client.query(
        `SELECT id, title, description, project_url, images, created_at
         FROM public.freelancer_portfolios
         WHERE freelancer_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 12`,
        [userId],
      );

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
         LIMIT 8`,
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
          locationWkt: user.location_wkt,
        },
        completionScore,
        skills: skillsResult.rows,
        freelancerProfile: freelancerResult.rows[0] || null,
        services: servicesResult.rows,
        portfolio: portfolioResult.rows,
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
       LIMIT 6`,
      [userId],
    );

    // Đánh giá client gửi cho freelancer nằm ở contract_reviews (không phải bảng reviews cũ).
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
        locationWkt: user.location_wkt,
      },
      completionScore,
      skills: skillsResult.rows,
      clientStats: clientStatsResult.rows[0],
      recentJobs: recentJobsResult.rows,
      reviews: clientReviewsResult.rows,
      timeline: timelineResult.rows,
    });
  } catch (error) {
    console.error("Get profile failed:", error.message);
    return res.status(500).json({ message: "Kh�ng th? l?y h? s? ng??i d�ng l�c n�y." });
  } finally {
    client.release();
  }
});

/** Public: danh sách freelancer theo điểm đánh giá */
router.get("/freelancers", async (req, res) => {
  const limitRaw = Number(req.query?.limit);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(24, Math.trunc(limitRaw))) : 8;
  const dbClient = await pool.connect();
  try {
    const result = await dbClient.query(
      `SELECT
         u.id,
         COALESCE(up.full_name, u.email) AS full_name,
         COALESCE(fp.title, 'Freelancer') AS title,
         COALESCE(rv.rating_avg, 0)::float8 AS rating_avg,
         COALESCE(rv.total_reviews, 0)::int AS total_reviews
       FROM public.freelancer_profiles fp
       INNER JOIN public.users u ON u.id = fp.user_id AND u.deleted_at IS NULL
       LEFT JOIN public.user_profiles up ON up.user_id = fp.user_id
       LEFT JOIN (
         SELECT freelancer_id, ROUND(AVG(rating)::numeric, 2) AS rating_avg, COUNT(*)::int AS total_reviews
         FROM public.contract_reviews
         GROUP BY freelancer_id
       ) rv ON rv.freelancer_id = fp.user_id
       ORDER BY rv.rating_avg DESC NULLS LAST, rv.total_reviews DESC, fp.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return res.json({ freelancers: result.rows, total: result.rowCount });
  } catch (error) {
    console.error("List freelancers failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng contract_reviews. Chạy backend/sql/contracts_reviews.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải danh sách freelancer." });
  } finally {
    dbClient.release();
  }
});

router.get("/google", (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === "your-google-client-id") {
    return res.status(501).json({
      message: "Google OAuth ch?a ???c c?u h�nh. C?p nh?t GOOGLE_CLIENT_ID/SECRET trong .env.",
    });
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/google/callback", (_req, res) => {
  return res.status(501).json({
    message: "Callback Google OAuth ?ang ? ch? ?? placeholder. C?n tri?n khai trao ??i code l?y token.",
  });
});

module.exports = router;
