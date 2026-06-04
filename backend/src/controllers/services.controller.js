const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const {
  readServiceUpsertBody,
  buildDefaultServicePackages,
} = require("../utils/validators");
const { uploadServiceImages: uploadServiceImagesMw } = require("../middleware/serviceImagesUpload");
const { uploadServiceVideo: uploadServiceVideoMw } = require("../middleware/serviceVideoUpload");

function uploadServiceImages(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer được tải ảnh minh hoạ dịch vụ." });
  }

  const handler = uploadServiceImagesMw.array("images", 12);
  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Tải ảnh thất bại." });
    }
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "Chọn ít nhất một ảnh (tối đa 12)." });
    }
    const urls = files.map((f) => `/uploads/services/${f.filename}`);
    return res.status(201).json({ urls });
  });
}

function uploadServiceThumbnail(req, res) {

  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer được tải ảnh thumbnail dịch vụ." });
  }

  const handler = uploadServiceImagesMw.single("file");
  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Tải ảnh thất bại." });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Chọn một ảnh làm thumbnail." });
    }
    const url = `/uploads/services/${file.filename}`;
    return res.status(201).json({ url });
  });
}

function uploadServiceDemo(req, res) {

  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer được tải video demo (1 clip ngắn)." });
  }

  const handler = uploadServiceVideoMw.single("file");
  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Tải video thất bại." });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Chọn một file video (MP4, WebM hoặc MOV)." });
    }
    const url = `/uploads/services/${file.filename}`;
    return res.status(201).json({ url, kind: "video", demoMedia: { url, kind: "video" } });
  });
}

async function createMyService(req, res) {

  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới có thể tạo dịch vụ." });
  }

  const parsed = readServiceUpsertBody(req);
  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.message });
  }
  const v = parsed.values;

  const client = await pool.connect();
  try {
    const normalizedPackages = v.packages.length ? v.packages : buildDefaultServicePackages(v.price, v.deliveryDays);
    const listingStatus = v.listingStatus || "pending";
    const publishedAt = listingStatus === "active" ? "CURRENT_TIMESTAMP" : "NULL";
    const result = await client.query(
      `INSERT INTO public.services (
         freelancer_id, title, description, price, delivery_days,
         category, media_urls, packages, tech_stack, requirements, faqs, response_time_hours, support_upsell,
         demo_media, thumbnail_url, listing_status, published_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11::jsonb, $12, $13, $14::jsonb, $15, $16, ${publishedAt === "NULL" ? "NULL" : "CURRENT_TIMESTAMP"})
       RETURNING id, title, description, price, delivery_days, category, media_urls, packages, tech_stack, requirements, faqs, response_time_hours, support_upsell, demo_media, thumbnail_url, listing_status, admin_note, published_at, created_at, updated_at`,
      [
        payload.sub,
        v.title,
        v.description || null,
        v.price,
        v.deliveryDays,
        v.category || null,
        JSON.stringify(v.mediaUrls),
        JSON.stringify(normalizedPackages),
        JSON.stringify(v.techStack),
        v.requirements || null,
        JSON.stringify(v.faqs),
        v.responseTimeHours,
        v.supportUpsell || null,
        v.demoMedia ? JSON.stringify(v.demoMedia) : null,
        v.thumbnailUrl,
        listingStatus,
      ],
    );

    const msg =
      listingStatus === "draft"
        ? "Đã lưu nháp dịch vụ."
        : listingStatus === "pending"
          ? "Đã gửi dịch vụ chờ duyệt."
          : "Tạo dịch vụ thành công.";
    return res.status(201).json({ message: msg, service: mapMyServiceRow(result.rows[0]) });
  } catch (error) {
    console.error("Create service failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng services. Chạy backend/sql/services_detail_columns.sql, backend/sql/services_demo_media.sql và backend/sql/services_thumbnail.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tạo dịch vụ lúc này." });
  } finally {
    client.release();
  }
}

async function updateMyService(req, res) {

  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer mới có thể cập nhật dịch vụ." });
  }

  const serviceId = String(req.params.serviceId || "").trim();
  if (!serviceId) {
    return res.status(400).json({ message: "Thiếu mã dịch vụ." });
  }

  const parsed = readServiceUpsertBody(req);
  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.message });
  }
  const v = parsed.values;

  const client = await pool.connect();
  try {
    const normalizedPackages = v.packages.length ? v.packages : buildDefaultServicePackages(v.price, v.deliveryDays);
    const result = await client.query(
      `UPDATE public.services SET
         title = $1,
         description = $2,
         price = $3,
         delivery_days = $4,
         category = $5,
         media_urls = $6::jsonb,
         packages = $7::jsonb,
         tech_stack = $8::jsonb,
         requirements = $9,
         faqs = $10::jsonb,
         response_time_hours = $11,
         support_upsell = $12,
         demo_media = $13::jsonb,
         thumbnail_url = $14,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $15 AND freelancer_id = $16
       RETURNING id, title, description, price, delivery_days, category, media_urls, packages, tech_stack, requirements, faqs, response_time_hours, support_upsell, demo_media, thumbnail_url, listing_status, admin_note, published_at, created_at, updated_at`,
      [
        v.title,
        v.description || null,
        v.price,
        v.deliveryDays,
        v.category || null,
        JSON.stringify(v.mediaUrls),
        JSON.stringify(normalizedPackages),
        JSON.stringify(v.techStack),
        v.requirements || null,
        JSON.stringify(v.faqs),
        v.responseTimeHours,
        v.supportUpsell || null,
        v.demoMedia ? JSON.stringify(v.demoMedia) : null,
        v.thumbnailUrl,
        serviceId,
        payload.sub,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ hoặc bạn không có quyền chỉnh sửa." });
    }

    return res.json({ message: "Đã cập nhật dịch vụ.", service: mapMyServiceRow(result.rows[0]) });
  } catch (error) {
    console.error("Update service failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng services. Chạy backend/sql/services_detail_columns.sql, backend/sql/services_demo_media.sql và backend/sql/services_thumbnail.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể cập nhật dịch vụ lúc này." });
  } finally {
    client.release();
  }
}

async function listServices(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || ""), 10) || 48, 1), 100);
  const offset = Math.max(Number.parseInt(String(req.query.offset || ""), 10) || 0, 0);
  const q = String(req.query.q || "").trim();
  const pattern = q ? `%${q}%` : null;

  const db = await pool.connect();
  try {
    const searchClause = pattern
      ? `AND (
        s.title ILIKE $3
        OR COALESCE(s.description, '') ILIKE $3
        OR COALESCE(up.full_name, '') ILIKE $3
        OR COALESCE(u.email, '') ILIKE $3
        OR COALESCE(fp.title, '') ILIKE $3
      )`
      : "";

    const listParams = pattern ? [limit, offset, pattern] : [limit, offset];
    const listResult = await db.query(
      `SELECT
         s.id, s.title, s.description, s.price, s.delivery_days,
         s.category, s.media_urls, s.packages, s.tech_stack, s.requirements,
         s.faqs, s.response_time_hours, s.support_upsell, s.demo_media, s.thumbnail_url,
         s.created_at, s.freelancer_id,
         COALESCE(up.full_name, u.email) AS freelancer_name,
         up.avatar_url AS freelancer_avatar_url,
         fp.title AS freelancer_title,
         COALESCE(rv.rating_avg, 0)::float8 AS rating_avg,
         COALESCE(rv.total_reviews, 0)::int AS total_reviews
       FROM public.services s
       INNER JOIN public.users u ON u.id = s.freelancer_id AND u.deleted_at IS NULL AND u.role = 'freelancer'
       LEFT JOIN public.user_profiles up ON up.user_id = s.freelancer_id
       LEFT JOIN public.freelancer_profiles fp ON fp.user_id = s.freelancer_id
       LEFT JOIN (
         SELECT freelancer_id, ROUND(AVG(rating)::numeric, 2) AS rating_avg, COUNT(*)::int AS total_reviews
         FROM public.contract_reviews
         GROUP BY freelancer_id
       ) rv ON rv.freelancer_id = s.freelancer_id
       WHERE COALESCE(s.listing_status, 'active') = 'active'
       ${searchClause}
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      listParams,
    );

    const countParams = pattern ? [pattern] : [];
    const countSearch = pattern
      ? `AND (
        s.title ILIKE $1
        OR COALESCE(s.description, '') ILIKE $1
        OR COALESCE(up.full_name, '') ILIKE $1
        OR COALESCE(u.email, '') ILIKE $1
        OR COALESCE(fp.title, '') ILIKE $1
      )`
      : "";

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM public.services s
       INNER JOIN public.users u ON u.id = s.freelancer_id AND u.deleted_at IS NULL AND u.role = 'freelancer'
       LEFT JOIN public.user_profiles up ON up.user_id = s.freelancer_id
       LEFT JOIN public.freelancer_profiles fp ON fp.user_id = s.freelancer_id
       WHERE COALESCE(s.listing_status, 'active') = 'active'
       ${countSearch}`,
      countParams,
    );

    return res.json({
      services: listResult.rows,
      total: countResult.rows[0]?.total ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("List services failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({ message: "Chưa có bảng services trên PostgreSQL." });
    }
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng services. Chạy backend/sql/services_detail_columns.sql, backend/sql/services_demo_media.sql và backend/sql/services_thumbnail.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải danh sách dịch vụ." });
  } finally {
    db.release();
  }
}

async function listCategories(_req, res) {
  const db = await pool.connect();
  try {
    const result = await db.query(
      `SELECT id, name FROM public.service_categories ORDER BY sort_order ASC, name ASC`,
    );
    return res.json({ categories: result.rows });
  } catch (error) {
    console.error("List service categories failed:", error.message);
    if (error.code === "42P01") {
      return res.json({ categories: [] });
    }
    return res.status(500).json({ message: "Không thể tải danh mục dịch vụ." });
  } finally {
    db.release();
  }
}

async function getService(req, res) {
  const serviceId = String(req.params.serviceId || "").trim();
  if (!serviceId) {
    return res.status(400).json({ message: "Thiếu mã dịch vụ." });
  }

  const db = await pool.connect();
  try {
    const detailResult = await db.query(
      `SELECT
         s.id, s.title, s.description, s.price, s.delivery_days, s.category,
         s.media_urls, s.packages, s.tech_stack, s.requirements, s.faqs,
         s.response_time_hours, s.support_upsell, s.demo_media, s.thumbnail_url,
         s.created_at, s.freelancer_id,
         COALESCE(up.full_name, u.email) AS freelancer_name,
         up.avatar_url AS freelancer_avatar_url,
         fp.title AS freelancer_title,
         COALESCE(up.bio, '') AS freelancer_bio,
         COALESCE(sk.skills, '[]'::jsonb) AS freelancer_skills,
         COALESCE(fp.languages::text, '[]') AS freelancer_languages,
         COALESCE(rv.rating_avg, 0)::float8 AS rating_avg,
         COALESCE(rv.total_reviews, 0)::int AS total_reviews
       FROM public.services s
       INNER JOIN public.users u ON u.id = s.freelancer_id AND u.deleted_at IS NULL AND u.role = 'freelancer'
       LEFT JOIN public.user_profiles up ON up.user_id = s.freelancer_id
       LEFT JOIN public.freelancer_profiles fp ON fp.user_id = s.freelancer_id
       LEFT JOIN (
         SELECT freelancer_id, ROUND(AVG(rating)::numeric, 2) AS rating_avg, COUNT(*)::int AS total_reviews
         FROM public.contract_reviews
         GROUP BY freelancer_id
       ) rv ON rv.freelancer_id = s.freelancer_id
       LEFT JOIN (
         SELECT us.user_id, jsonb_agg(s2.name ORDER BY s2.name) AS skills
         FROM public.user_skills us
         INNER JOIN public.skills s2 ON s2.id = us.skill_id
         GROUP BY us.user_id
       ) sk ON sk.user_id = s.freelancer_id
       WHERE s.id = $1
       LIMIT 1`,
      [serviceId],
    );

    if (detailResult.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ." });
    }

    const reviewResult = await db.query(
      `SELECT cr.id, cr.rating, cr.comment, cr.created_at,
              COALESCE(up.full_name, u.email) AS client_name
       FROM public.contract_reviews cr
       INNER JOIN public.users u ON u.id = cr.client_id AND u.deleted_at IS NULL
       LEFT JOIN public.user_profiles up ON up.user_id = cr.client_id
       WHERE cr.freelancer_id = $1
       ORDER BY cr.created_at DESC
       LIMIT 5`,
      [detailResult.rows[0].freelancer_id],
    );

    return res.json({
      service: detailResult.rows[0],
      reviews: reviewResult.rows,
    });
  } catch (error) {
    console.error("Get service detail failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({ message: "Chưa có bảng services trên PostgreSQL." });
    }
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng services. Chạy backend/sql/services_detail_columns.sql, backend/sql/services_demo_media.sql và backend/sql/services_thumbnail.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải chi tiết dịch vụ." });
  } finally {
    db.release();
  }
}

function mapMyServiceRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    delivery_days: row.delivery_days,
    category: row.category,
    media_urls: row.media_urls ?? [],
    packages: row.packages ?? [],
    tech_stack: row.tech_stack ?? [],
    requirements: row.requirements,
    faqs: row.faqs ?? [],
    response_time_hours: row.response_time_hours,
    support_upsell: row.support_upsell,
    demo_media: row.demo_media,
    thumbnail_url: row.thumbnail_url,
    listing_status: row.listing_status || "active",
    admin_note: row.admin_note || null,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    rating_avg: row.rating_avg != null ? Number(row.rating_avg) : null,
    total_reviews: row.total_reviews != null ? Number(row.total_reviews) : 0,
  };
}

async function listMyServices(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer được quản lý dịch vụ." });
  }

  const db = await pool.connect();
  try {
    const result = await db.query(
      `SELECT
         s.*,
         COALESCE(rv.rating_avg, 0)::float8 AS rating_avg,
         COALESCE(rv.total_reviews, 0)::int AS total_reviews
       FROM public.services s
       LEFT JOIN (
         SELECT c.service_id, ROUND(AVG(cr.rating)::numeric, 2) AS rating_avg, COUNT(*)::int AS total_reviews
         FROM public.contract_reviews cr
         INNER JOIN public.contracts c ON c.id = cr.contract_id AND c.service_id IS NOT NULL
         GROUP BY c.service_id
       ) rv ON rv.service_id = s.id
       WHERE s.freelancer_id = $1
       ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC`,
      [payload.sub],
    );
    return res.json({ services: result.rows.map(mapMyServiceRow) });
  } catch (error) {
    console.error("listMyServices failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message: "Chạy backend/sql/services_listing_status.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải dịch vụ của bạn." });
  } finally {
    db.release();
  }
}

async function getMyService(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer được xem dịch vụ của mình." });
  }

  const serviceId = String(req.params.serviceId || "").trim();
  if (!serviceId) {
    return res.status(400).json({ message: "Thiếu mã dịch vụ." });
  }

  const db = await pool.connect();
  try {
    const result = await db.query(
      `SELECT
         s.*,
         COALESCE(rv.rating_avg, 0)::float8 AS rating_avg,
         COALESCE(rv.total_reviews, 0)::int AS total_reviews
       FROM public.services s
       LEFT JOIN (
         SELECT c.service_id, ROUND(AVG(cr.rating)::numeric, 2) AS rating_avg, COUNT(*)::int AS total_reviews
         FROM public.contract_reviews cr
         INNER JOIN public.contracts c ON c.id = cr.contract_id AND c.service_id IS NOT NULL
         GROUP BY c.service_id
       ) rv ON rv.service_id = s.id
       WHERE s.id = $1 AND s.freelancer_id = $2
       LIMIT 1`,
      [serviceId, payload.sub],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ." });
    }
    return res.json({ service: mapMyServiceRow(result.rows[0]) });
  } catch (error) {
    console.error("getMyService failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message: "Chạy backend/sql/services_listing_status.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải chi tiết dịch vụ." });
  } finally {
    db.release();
  }
}

async function patchMyServiceStatus(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer được cập nhật trạng thái dịch vụ." });
  }

  const serviceId = String(req.params.serviceId || "").trim();
  const nextStatus = String(req.body?.status || req.body?.listingStatus || "").trim().toLowerCase();
  const allowed = ["draft", "pending", "active", "paused", "denied"];
  if (!serviceId || !allowed.includes(nextStatus)) {
    return res.status(400).json({ message: "status không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const cur = await db.query(
      `SELECT id, listing_status FROM public.services WHERE id = $1 AND freelancer_id = $2`,
      [serviceId, payload.sub],
    );
    if (cur.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy dịch vụ." });
    }
    const current = String(cur.rows[0].listing_status || "").toLowerCase();

    if (nextStatus === "active" && !["paused", "pending"].includes(current)) {
      return res.status(409).json({ message: "Chỉ kích hoạt từ trạng thái chờ duyệt hoặc tạm dừng." });
    }
    if (nextStatus === "paused" && current !== "active") {
      return res.status(409).json({ message: "Chỉ tạm dừng dịch vụ đang hoạt động." });
    }
    if (nextStatus === "pending" && !["draft", "denied", "paused"].includes(current)) {
      return res.status(409).json({ message: "Chỉ gửi duyệt từ nháp hoặc sau khi chỉnh sửa." });
    }

    const publishClause =
      nextStatus === "active"
        ? ", published_at = COALESCE(published_at, CURRENT_TIMESTAMP)"
        : nextStatus === "pending"
          ? ", published_at = NULL"
          : "";

    const result = await db.query(
      `UPDATE public.services
       SET listing_status = $1, updated_at = CURRENT_TIMESTAMP${publishClause}
       WHERE id = $2 AND freelancer_id = $3
       RETURNING *`,
      [nextStatus, serviceId, payload.sub],
    );

    const labels = {
      draft: "Đã chuyển sang nháp.",
      pending: "Đã gửi chờ duyệt.",
      active: "Dịch vụ đang hiển thị.",
      paused: "Đã tạm dừng dịch vụ.",
      denied: "Đã đánh dấu cần chỉnh sửa.",
    };

    return res.json({
      message: labels[nextStatus] || "Đã cập nhật.",
      service: mapMyServiceRow(result.rows[0]),
    });
  } catch (error) {
    console.error("patchMyServiceStatus failed:", error.message);
    return res.status(500).json({ message: "Không thể cập nhật trạng thái." });
  } finally {
    db.release();
  }
}

async function listMyServiceReviews(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer được xem đánh giá." });
  }

  const db = await pool.connect();
  try {
    const result = await db.query(
      `SELECT
         cr.id,
         cr.rating,
         cr.comment,
         cr.created_at,
         cr.freelancer_reply,
         cr.freelancer_reply_at,
         c.id AS contract_id,
         c.service_id,
         s.title AS service_title,
         cup.full_name AS client_name,
         up.avatar_url AS client_avatar_url
       FROM public.contract_reviews cr
       INNER JOIN public.contracts c ON c.id = cr.contract_id AND c.deleted_at IS NULL
       LEFT JOIN public.services s ON s.id = c.service_id
       LEFT JOIN public.user_profiles cup ON cup.user_id = cr.client_id
       LEFT JOIN public.user_profiles up ON up.user_id = cr.client_id
       WHERE cr.freelancer_id = $1
       ORDER BY cr.created_at DESC
       LIMIT 200`,
      [payload.sub],
    );
    return res.json({
      reviews: result.rows.map((row) => ({
        id: row.id,
        rating: Number(row.rating),
        comment: row.comment,
        createdAt: row.created_at,
        freelancerReply: row.freelancer_reply,
        freelancerReplyAt: row.freelancer_reply_at,
        contractId: row.contract_id,
        serviceId: row.service_id,
        serviceTitle: row.service_title,
        clientName: row.client_name,
        clientAvatarUrl: row.client_avatar_url,
      })),
    });
  } catch (error) {
    console.error("listMyServiceReviews failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message: "Chạy backend/sql/services_listing_status.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải đánh giá." });
  } finally {
    db.release();
  }
}

async function replyServiceReview(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;
  if (payload.role !== "freelancer") {
    return res.status(403).json({ message: "Chỉ freelancer được phản hồi đánh giá." });
  }

  const reviewId = String(req.params.reviewId || "").trim();
  const reply = String(req.body?.reply || "").trim().slice(0, 2000);
  if (!reviewId || !reply) {
    return res.status(400).json({ message: "Nội dung phản hồi là bắt buộc." });
  }

  const db = await pool.connect();
  try {
    const result = await db.query(
      `UPDATE public.contract_reviews
       SET freelancer_reply = $1, freelancer_reply_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND freelancer_id = $3
       RETURNING id, freelancer_reply, freelancer_reply_at`,
      [reply, reviewId, payload.sub],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá." });
    }
    return res.json({ message: "Đã gửi phản hồi.", review: result.rows[0] });
  } catch (error) {
    console.error("replyServiceReview failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message: "Chạy backend/sql/services_listing_status.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể lưu phản hồi." });
  } finally {
    db.release();
  }
}

module.exports = {
  listServices,
  listCategories,
  getService,
  uploadServiceImages,
  uploadServiceThumbnail,
  uploadServiceDemo,
  createMyService,
  updateMyService,
  listMyServices,
  getMyService,
  patchMyServiceStatus,
  listMyServiceReviews,
  replyServiceReview,
};
