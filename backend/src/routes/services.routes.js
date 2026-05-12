const express = require("express");
const { pool } = require("../db/pool");

const router = express.Router();

router.get("/", async (req, res) => {
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
         s.id,
         s.title,
         s.description,
         s.price,
         s.delivery_days,
        s.category,
        s.media_urls,
        s.packages,
        s.tech_stack,
        s.requirements,
        s.faqs,
        s.response_time_hours,
        s.support_upsell,
        s.demo_media,
        s.thumbnail_url,
         s.created_at,
         s.freelancer_id,
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
       WHERE 1=1
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
       WHERE 1=1
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
      return res.status(503).json({
        message: "Chưa có bảng services trên PostgreSQL.",
      });
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
});

router.get("/categories", async (_req, res) => {
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
});

router.get("/:serviceId", async (req, res) => {
  const serviceId = String(req.params.serviceId || "").trim();
  if (!serviceId) {
    return res.status(400).json({ message: "Thiếu mã dịch vụ." });
  }

  const db = await pool.connect();
  try {
    const detailResult = await db.query(
      `SELECT
         s.id,
         s.title,
         s.description,
         s.price,
         s.delivery_days,
         s.category,
         s.media_urls,
         s.packages,
         s.tech_stack,
         s.requirements,
         s.faqs,
         s.response_time_hours,
         s.support_upsell,
         s.demo_media,
         s.thumbnail_url,
         s.created_at,
         s.freelancer_id,
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
      `SELECT
         cr.id,
         cr.rating,
         cr.comment,
         cr.created_at,
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
      return res.status(503).json({
        message: "Chưa có bảng services trên PostgreSQL.",
      });
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
});

module.exports = router;
