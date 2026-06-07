const { pool } = require("../db/pool");
const { parseUuidParam } = require("../utils/validators");

async function listFreelancers(req, res) {

  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || ""), 10) || 48, 1), 100);
  const offset = Math.max(Number.parseInt(String(req.query.offset || ""), 10) || 0, 0);
  const q = String(req.query.q || "").trim();
  const skill = String(req.query.skill || "").trim();
  const district = String(req.query.district || "").trim();
  const category = String(req.query.category || "").trim();
  const qPattern = q ? `%${q}%` : null;

  const dbClient = await pool.connect();
  try {
    const whereParts = [
      "u.role = 'freelancer'",
      "u.deleted_at IS NULL",
      "u.status = 'active'",
      "fp.deleted_at IS NULL",
    ];
    const filterParams = [];

    if (qPattern) {
      filterParams.push(qPattern);
      const slot = filterParams.length;
      whereParts.push(`(
        COALESCE(up.full_name, '') ILIKE $${slot}
        OR COALESCE(u.email, '') ILIKE $${slot}
        OR COALESCE(fp.title, '') ILIKE $${slot}
        OR COALESCE(up.bio, '') ILIKE $${slot}
        OR EXISTS (
          SELECT 1
          FROM public.user_skills us_q
          JOIN public.skills s_q ON s_q.id = us_q.skill_id
          WHERE us_q.user_id = fp.user_id AND s_q.name ILIKE $${slot}
        )
      )`);
    }

    if (skill && skill !== "Tất cả") {
      filterParams.push(skill);
      const slot = filterParams.length;
      whereParts.push(`EXISTS (
        SELECT 1
        FROM public.user_skills us_f
        JOIN public.skills s_f ON s_f.id = us_f.skill_id
        WHERE us_f.user_id = fp.user_id AND s_f.name ILIKE $${slot}
      )`);
    }

    if (district && district !== "Tất cả") {
      filterParams.push(`%${district}%`);
      const slot = filterParams.length;
      whereParts.push(`(
        COALESCE(up.district_city, '') ILIKE $${slot}
        OR COALESCE(up.city, '') ILIKE $${slot}
        OR COALESCE(up.state_province, '') ILIKE $${slot}
        OR COALESCE(up.country, '') ILIKE $${slot}
      )`);
    }

    if (category && category !== "Tất cả") {
      filterParams.push(category);
      const slot = filterParams.length;
      whereParts.push(`EXISTS (
        SELECT 1 FROM public.services s_cat
        WHERE s_cat.freelancer_id = fp.user_id
          AND COALESCE(s_cat.category, '') ILIKE $${slot}
      )`);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const listParams = [...filterParams, limit, offset];
    const limitSlot = filterParams.length + 1;
    const offsetSlot = filterParams.length + 2;

    const listResult = await dbClient.query(
      `SELECT
         u.id,
         COALESCE(up.full_name, u.email) AS full_name,
         COALESCE(fp.title, 'Freelancer') AS title,
         COALESCE(up.bio, '') AS bio,
         up.avatar_url,
         COALESCE(up.district_city, '') AS district_city,
         COALESCE(up.city, '') AS city,
         COALESCE(up.state_province, '') AS state_province,
         COALESCE(up.country, '') AS country,
         TRIM(BOTH ',' FROM COALESCE(
           NULLIF(
             CONCAT_WS(
               ', ',
               NULLIF(TRIM(up.city), ''),
               NULLIF(TRIM(up.state_province), ''),
               NULLIF(TRIM(up.country), '')
             ),
             ''
           ),
           NULLIF(TRIM(up.district_city), ''),
           ''
         )) AS location_label,
         fp.hourly_rate,
         fp.total_earnings,
         fp.experience_years,
         fp.avg_response_minutes,
         fp.job_success_score,
         COALESCE(fp.profile_badges, '[]'::jsonb) AS profile_badges,
         COALESCE(rv.rating_avg, 0)::float8 AS rating_avg,
         COALESCE(rv.total_reviews, 0)::int AS total_reviews,
         COALESCE(ct.completed_jobs, 0)::int AS completed_jobs,
         COALESCE(sk.skill_names, ARRAY[]::text[]) AS skills,
         COALESCE(svc.services_count, 0)::int AS services_count,
         COALESCE(pf.portfolio_count, 0)::int AS portfolio_count,
         feat.service_id AS featured_service_id,
         feat.service_title AS featured_service_title,
         feat.service_description AS featured_service_description,
         feat.service_category AS featured_service_category,
         feat.service_price AS featured_service_price,
         feat.service_min_package AS featured_service_min_package,
         feat.service_thumbnail AS featured_service_thumbnail,
         COALESCE(feat.has_demo_video, false) AS has_demo_video
       FROM public.freelancer_profiles fp
       INNER JOIN public.users u ON u.id = fp.user_id
       LEFT JOIN public.user_profiles up ON up.user_id = fp.user_id
       LEFT JOIN (
         SELECT freelancer_id, ROUND(AVG(rating)::numeric, 2) AS rating_avg, COUNT(*)::int AS total_reviews
         FROM public.contract_reviews
         GROUP BY freelancer_id
       ) rv ON rv.freelancer_id = fp.user_id
       LEFT JOIN (
         SELECT freelancer_id, COUNT(*)::int AS completed_jobs
         FROM public.contracts
         WHERE status = 'completed' AND deleted_at IS NULL
         GROUP BY freelancer_id
       ) ct ON ct.freelancer_id = fp.user_id
       LEFT JOIN (
         SELECT us.user_id, array_agg(s.name ORDER BY s.name) AS skill_names
         FROM public.user_skills us
         JOIN public.skills s ON s.id = us.skill_id
         GROUP BY us.user_id
       ) sk ON sk.user_id = fp.user_id
       LEFT JOIN (
         SELECT freelancer_id, COUNT(*)::int AS services_count
         FROM public.services
         GROUP BY freelancer_id
       ) svc ON svc.freelancer_id = fp.user_id
       LEFT JOIN (
         SELECT freelancer_id, COUNT(*)::int AS portfolio_count
         FROM public.freelancer_portfolios
         WHERE deleted_at IS NULL
         GROUP BY freelancer_id
       ) pf ON pf.freelancer_id = fp.user_id
       LEFT JOIN LATERAL (
         SELECT
           s.id AS service_id,
           s.title AS service_title,
           s.description AS service_description,
           s.category AS service_category,
           s.price AS service_price,
           s.thumbnail_url AS service_thumbnail,
           COALESCE(
             (
               SELECT MIN(NULLIF((elem->>'price')::numeric, 0))
               FROM jsonb_array_elements(
                 CASE WHEN jsonb_typeof(s.packages) = 'array' THEN s.packages ELSE '[]'::jsonb END
               ) AS elem
               WHERE elem ? 'price'
             ),
             s.price
           ) AS service_min_package,
           COALESCE(s.demo_media->>'kind', '') = 'video' AS has_demo_video
         FROM public.services s
         WHERE s.freelancer_id = fp.user_id
         ORDER BY s.created_at DESC
         LIMIT 1
       ) feat ON true
       ${whereSql}
       ORDER BY rv.rating_avg DESC NULLS LAST, rv.total_reviews DESC, fp.created_at DESC
       LIMIT $${limitSlot} OFFSET $${offsetSlot}`,
      listParams,
    );

    const countResult = await dbClient.query(
      `SELECT COUNT(*)::int AS total
       FROM public.freelancer_profiles fp
       INNER JOIN public.users u ON u.id = fp.user_id
       LEFT JOIN public.user_profiles up ON up.user_id = fp.user_id
       ${whereSql}`,
      filterParams,
    );

    const skillsFacet = await dbClient.query(
      `SELECT DISTINCT s.name
       FROM public.skills s
       INNER JOIN public.user_skills us ON us.skill_id = s.id
       INNER JOIN public.users u ON u.id = us.user_id AND u.role = 'freelancer' AND u.deleted_at IS NULL AND u.status = 'active'
       ORDER BY s.name ASC`,
    );

    const districtsFacet = await dbClient.query(
      `SELECT DISTINCT label AS name
       FROM (
         SELECT TRIM(up.district_city) AS label
         FROM public.user_profiles up
         INNER JOIN public.users u ON u.id = up.user_id AND u.role = 'freelancer' AND u.deleted_at IS NULL AND u.status = 'active'
         WHERE up.district_city IS NOT NULL AND TRIM(up.district_city) <> ''
         UNION
         SELECT TRIM(up.city) FROM public.user_profiles up
         INNER JOIN public.users u ON u.id = up.user_id AND u.role = 'freelancer' AND u.deleted_at IS NULL AND u.status = 'active'
         WHERE up.city IS NOT NULL AND TRIM(up.city) <> ''
         UNION
         SELECT TRIM(up.country) FROM public.user_profiles up
         INNER JOIN public.users u ON u.id = up.user_id AND u.role = 'freelancer' AND u.deleted_at IS NULL AND u.status = 'active'
         WHERE up.country IS NOT NULL AND TRIM(up.country) <> ''
       ) loc
       WHERE label IS NOT NULL AND label <> ''
       ORDER BY name ASC`,
    );

    const categoriesFacet = await dbClient.query(
      `SELECT DISTINCT TRIM(s.category) AS name
       FROM public.services s
       INNER JOIN public.users u ON u.id = s.freelancer_id AND u.role = 'freelancer' AND u.deleted_at IS NULL AND u.status = 'active'
       WHERE s.category IS NOT NULL AND TRIM(s.category) <> ''
       ORDER BY name ASC`,
    );

    const servicesTotalResult = await dbClient.query(
      `SELECT COUNT(*)::int AS total FROM public.services s
       INNER JOIN public.users u ON u.id = s.freelancer_id AND u.role = 'freelancer' AND u.deleted_at IS NULL`,
    );

    return res.json({
      freelancers: listResult.rows,
      total: countResult.rows[0]?.total ?? 0,
      limit,
      offset,
      servicesTotal: servicesTotalResult.rows[0]?.total ?? 0,
      filters: {
        skills: skillsFacet.rows.map((row) => row.name).filter(Boolean),
        districts: districtsFacet.rows.map((row) => row.name).filter(Boolean),
        categories: categoriesFacet.rows.map((row) => row.name).filter(Boolean),
      },
    });
  } catch (error) {
    console.error("List freelancers failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng contract_reviews. Chạy backend/sql/contracts_reviews.sql trên PostgreSQL.",
      });
    }
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên user_profiles hoặc freelancer_profiles. Chạy backend/sql/profile_landing_columns.sql và backend/sql/freelancer_search_listing.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải danh sách freelancer." });
  } finally {
    dbClient.release();
  }
}

async function getFreelancer(req, res) {

  const freelancerId = parseUuidParam(req.params.freelancerId);
  if (!freelancerId) {
    return res.status(400).json({ message: "Mã freelancer không hợp lệ." });
  }

  const serviceIdParam = parseUuidParam(req.query?.service);

  const dbClient = await pool.connect();
  try {
    const profileResult = await dbClient.query(
      `SELECT
         u.id,
         COALESCE(up.full_name, u.email) AS full_name,
         up.avatar_url,
         COALESCE(fp.title, 'Freelancer') AS title,
         COALESCE(up.bio, '') AS bio,
         COALESCE(up.tagline, '') AS tagline,
         COALESCE(up.district_city, '') AS district_city,
         COALESCE(up.city, '') AS city,
         COALESCE(up.state_province, '') AS state_province,
         COALESCE(up.country, '') AS country,
         TRIM(BOTH ',' FROM COALESCE(
           NULLIF(
             CONCAT_WS(
               ', ',
               NULLIF(TRIM(up.city), ''),
               NULLIF(TRIM(up.state_province), ''),
               NULLIF(TRIM(up.country), '')
             ),
             ''
           ),
           NULLIF(TRIM(up.district_city), ''),
           ''
         )) AS location_label,
         fp.hourly_rate,
         fp.total_earnings,
         fp.experience_years,
         fp.avg_response_minutes,
         fp.job_success_score,
         COALESCE(fp.profile_badges, '[]'::jsonb) AS profile_badges,
         COALESCE(rv.rating_avg, 0)::float8 AS rating_avg,
         COALESCE(rv.total_reviews, 0)::int AS total_reviews,
         COALESCE(ct.completed_jobs, 0)::int AS completed_jobs,
         COALESCE(sk.skill_names, ARRAY[]::text[]) AS skills,
         COALESCE(fp.languages, '[]'::jsonb) AS languages
       FROM public.users u
       INNER JOIN public.freelancer_profiles fp ON fp.user_id = u.id AND fp.deleted_at IS NULL
       LEFT JOIN public.user_profiles up ON up.user_id = u.id
       LEFT JOIN (
         SELECT freelancer_id, ROUND(AVG(rating)::numeric, 2) AS rating_avg, COUNT(*)::int AS total_reviews
         FROM public.contract_reviews
         GROUP BY freelancer_id
       ) rv ON rv.freelancer_id = u.id
       LEFT JOIN (
         SELECT freelancer_id, COUNT(*)::int AS completed_jobs
         FROM public.contracts
         WHERE status = 'completed' AND deleted_at IS NULL
         GROUP BY freelancer_id
       ) ct ON ct.freelancer_id = u.id
       LEFT JOIN (
         SELECT us.user_id, array_agg(s.name ORDER BY s.name) AS skill_names
         FROM public.user_skills us
         JOIN public.skills s ON s.id = us.skill_id
         GROUP BY us.user_id
       ) sk ON sk.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL AND u.role = 'freelancer' AND u.status = 'active'
       LIMIT 1`,
      [freelancerId],
    );

    if (profileResult.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy freelancer." });
    }

    const servicesResult = await dbClient.query(
      `SELECT
         s.id,
         s.title,
         s.description,
         s.price,
         s.delivery_days,
         s.category,
         s.media_urls,
         s.packages,
         s.demo_media,
         s.thumbnail_url,
         s.response_time_hours,
         s.created_at
       FROM public.services s
       WHERE s.freelancer_id = $1
       ORDER BY s.created_at DESC`,
      [freelancerId],
    );

    let featuredService = null;
    if (serviceIdParam) {
      featuredService = servicesResult.rows.find((row) => String(row.id) === serviceIdParam) || null;
    }
    if (!featuredService && servicesResult.rows.length > 0) {
      featuredService =
        servicesResult.rows.find((row) => {
          const packs = row.packages;
          return Array.isArray(packs) && packs.length > 0;
        }) || servicesResult.rows[0];
    }

    const portfolioResult = await dbClient.query(
      `SELECT id, title, description, project_url, images, created_at
       FROM public.freelancer_portfolios
       WHERE freelancer_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 12`,
      [freelancerId],
    );

    const reviewsResult = await dbClient.query(
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
       LIMIT 12`,
      [freelancerId],
    );

    return res.json({
      freelancer: profileResult.rows[0],
      featuredService,
      services: servicesResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        price: row.price,
        delivery_days: row.delivery_days,
        category: row.category,
        thumbnail_url: row.thumbnail_url,
        response_time_hours: row.response_time_hours,
      })),
      portfolio: portfolioResult.rows,
      reviews: reviewsResult.rows,
    });
  } catch (error) {
    console.error("Get freelancer profile failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng dữ liệu. Chạy các script SQL trong backend/sql/ trên PostgreSQL.",
      });
    }
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên user_profiles hoặc freelancer_profiles. Chạy backend/sql/profile_landing_columns.sql và backend/sql/freelancer_search_listing.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải hồ sơ freelancer." });
  } finally {
    dbClient.release();
  }
}

async function getTopSkills(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || ""), 10) || 9, 1), 24);

  const dbClient = await pool.connect();
  try {
    const result = await dbClient.query(
      `SELECT s.name,
              COUNT(DISTINCT us.user_id)::int AS freelancer_count
       FROM public.skills s
       INNER JOIN public.user_skills us ON us.skill_id = s.id
       INNER JOIN public.users u
         ON u.id = us.user_id
        AND u.role = 'freelancer'
        AND u.deleted_at IS NULL
        AND u.status = 'active'
       INNER JOIN public.freelancer_profiles fp
         ON fp.user_id = u.id
        AND fp.deleted_at IS NULL
       GROUP BY s.id, s.name
       ORDER BY freelancer_count DESC, s.name ASC
       LIMIT $1`,
      [limit],
    );

    return res.json({
      skills: result.rows.map((row) => ({
        name: row.name,
        freelancerCount: row.freelancer_count,
      })),
    });
  } catch (error) {
    console.error("Get top skills failed:", error.message);
    return res.status(500).json({ message: "Không thể tải danh sách kỹ năng." });
  } finally {
    dbClient.release();
  }
}

module.exports = {
  listFreelancers,
  getFreelancer,
  getTopSkills,
};
