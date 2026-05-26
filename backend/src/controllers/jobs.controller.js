const { pool } = require("../db/pool");
const { verifyAccessToken, tryVerifyAccessToken } = require("../utils/authTokens");
const { normalizeJobImageUrls, parseUuidParam } = require("../utils/validators");
const { uploadJobImages: uploadJobImagesMw } = require("../middleware/jobImagesUpload");

function uploadJobImages(req, res) {

  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "client") {
    return res.status(403).json({ message: "Chỉ client được tải ảnh đính kèm tin việc làm." });
  }

  const handler = uploadJobImagesMw.array("images", 3);
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
}

async function createMyJob(req, res) {

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
    return res.status(400).json({ message: "Tiêu đề công việc là bắt buộc." });
  }
  if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
    return res.status(400).json({ message: "Ngân sách không hợp lệ." });
  }

  const category = String(req.body?.category || "").trim() || null;
  const tagsRaw = req.body?.tags;
  let tags = [];
  if (Array.isArray(tagsRaw)) {
    tags = tagsRaw.map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
  } else if (typeof tagsRaw === "string" && tagsRaw.trim()) {
    try {
      const parsed = JSON.parse(tagsRaw);
      if (Array.isArray(parsed)) {
        tags = parsed.map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
      }
    } catch {
      tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12);
    }
  }

  const locationLabel = String(req.body?.location_label || "").trim() || null;
  let locationLat = null;
  let locationLng = null;
  if (req.body?.location_lat !== undefined && req.body?.location_lat !== null && String(req.body.location_lat).trim() !== "") {
    locationLat = Number(req.body.location_lat);
  }
  if (req.body?.location_lng !== undefined && req.body?.location_lng !== null && String(req.body.location_lng).trim() !== "") {
    locationLng = Number(req.body.location_lng);
  }
  const hasCoords = locationLat !== null && locationLng !== null && Number.isFinite(locationLat) && Number.isFinite(locationLng);
  if (!hasCoords) {
    locationLat = null;
    locationLng = null;
  } else if (locationLat < -90 || locationLat > 90 || locationLng < -180 || locationLng > 180) {
    return res.status(400).json({ message: "Tọa độ vị trí không hợp lệ." });
  }
  const hasLocationText = Boolean(locationLabel);
  if (!hasLocationText && !hasCoords) {
    return res.status(400).json({
      message: "Vui lòng nhập vị trí làm việc hoặc gửi tọa độ GPS (cả hai cũng được).",
    });
  }


  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO public.jobs (client_id, title, description, budget, status, images, due_at, location_label, location_lat, location_lng, category, tags)
       VALUES ($1, $2, $3, $4, 'open', $5::jsonb, $6, $7, $8, $9, $10, $11::jsonb)
       RETURNING id, title, description, budget, status, images, due_at, location_label, location_lat, location_lng, category, tags, created_at`,
      [
        payload.sub,
        title,
        description || null,
        budget,
        JSON.stringify(images),
        dueAt,
        locationLabel,
        locationLat,
        locationLng,
        category,
        JSON.stringify(tags),
      ],
    );

    return res.status(201).json({ message: "??ng c�ng vi?c th�nh c�ng.", job: result.rows[0] });
  } catch (error) {
    console.error("Create job failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng jobs. Chạy backend/sql/jobs_images_due_at.sql, jobs_location.sql và jobs_listing_columns.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Kh�ng th? ??ng c�ng vi?c l�c n�y." });
  } finally {
    client.release();
  }
}

async function acceptJob(req, res) {

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
}

const JOB_SORT_VALUES = new Set([
  "newest",
  "budget_asc",
  "budget_desc",
  "proposals_asc",
  "proposals_desc",
]);

function parseOptionalBudget(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseTruthyQuery(raw) {
  return ["1", "true", "yes"].includes(String(raw || "").trim().toLowerCase());
}

/** Điều kiện WHERE + params (không gồm limit/offset) cho danh sách job mở */
function buildJobListFilters(req) {
  const q = String(req.query.q || "").trim();
  const category = String(req.query.category || "").trim();
  const location = String(req.query.location || "").trim();
  const verifiedOnly = parseTruthyQuery(req.query.verified);
  const hasLocation = parseTruthyQuery(req.query.has_location);
  const hasDue = parseTruthyQuery(req.query.has_due);
  const budgetMin = parseOptionalBudget(req.query.budget_min);
  const budgetMax = parseOptionalBudget(req.query.budget_max);
  const sortRaw = String(req.query.sort || "newest").trim();
  const sort = JOB_SORT_VALUES.has(sortRaw) ? sortRaw : "newest";

  const conditions = ["j.status = 'open'", "u.deleted_at IS NULL"];
  const params = [];
  let idx = 1;

  if (q) {
    conditions.push(
      `(j.title ILIKE $${idx} OR j.description ILIKE $${idx} OR up.full_name ILIKE $${idx} OR COALESCE(j.location_label, '') ILIKE $${idx} OR COALESCE(j.category, '') ILIKE $${idx})`,
    );
    params.push(`%${q}%`);
    idx += 1;
  }

  if (category) {
    conditions.push(`TRIM(COALESCE(j.category, '')) ILIKE $${idx}`);
    params.push(category);
    idx += 1;
  }

  if (location) {
    conditions.push(
      `(COALESCE(j.location_label, '') ILIKE $${idx} OR COALESCE(up.district_city, '') ILIKE $${idx})`,
    );
    params.push(`%${location}%`);
    idx += 1;
  }

  if (verifiedOnly) {
    conditions.push("u.is_email_verified = TRUE");
  }

  if (hasLocation) {
    conditions.push(
      "(TRIM(COALESCE(up.district_city, '')) <> '' OR TRIM(COALESCE(j.location_label, '')) <> '')",
    );
  }

  if (hasDue) {
    conditions.push("j.due_at IS NOT NULL");
  }

  if (budgetMin != null) {
    conditions.push(`j.budget >= $${idx}`);
    params.push(budgetMin);
    idx += 1;
  }

  if (budgetMax != null) {
    conditions.push(`j.budget <= $${idx}`);
    params.push(budgetMax);
    idx += 1;
  }

  const orderByMap = {
    newest: "j.created_at DESC",
    budget_asc: "j.budget ASC NULLS LAST, j.created_at DESC",
    budget_desc: "j.budget DESC NULLS LAST, j.created_at DESC",
    proposals_asc: "proposal_count ASC, j.created_at DESC",
    proposals_desc: "proposal_count DESC, j.created_at DESC",
  };

  return {
    conditions,
    params,
    orderBy: orderByMap[sort],
    sort,
  };
}

function mapJobListingRow(row) {
  return {
    id: row.id,
    client_id: row.client_id,
    title: row.title,
    description: row.description,
    budget: row.budget,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    images: row.images ?? [],
    due_at: row.due_at,
    location_label: row.location_label,
    location_lat: row.location_lat,
    location_lng: row.location_lng,
    category: row.category,
    tags: row.tags ?? [],
    client_name: row.client_name,
    client_avatar_url: row.client_avatar_url,
    client_district_city: row.client_district_city,
    client_email_verified: Boolean(row.client_email_verified),
    proposal_count: Number(row.proposal_count) || 0,
  };
}

async function listJobCategories(_req, res) {
  const db = await pool.connect();
  try {
    const result = await db.query(
      `SELECT TRIM(j.category) AS name, COUNT(*)::int AS job_count
       FROM public.jobs j
       INNER JOIN public.users u ON u.id = j.client_id AND u.deleted_at IS NULL
       WHERE j.status = 'open' AND TRIM(COALESCE(j.category, '')) <> ''
       GROUP BY TRIM(j.category)
       ORDER BY job_count DESC, name ASC`,
    );
    return res.json({ categories: result.rows });
  } catch (error) {
    console.error("List job categories failed:", error.message);
    if (error.code === "42703") {
      return res.json({ categories: [] });
    }
    return res.status(500).json({ message: "Không thể tải danh mục việc làm." });
  } finally {
    db.release();
  }
}

async function listJobs(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || ""), 10) || 24, 1), 100);
  const offset = Math.max(Number.parseInt(String(req.query.offset || ""), 10) || 0, 0);
  const { conditions, params, orderBy } = buildJobListFilters(req);

  const db = await pool.connect();
  try {
    const listParams = [...params];
    const limitIdx = listParams.length + 1;
    listParams.push(limit);
    const offsetIdx = listParams.length + 1;
    listParams.push(offset);

    const listResult = await db.query(
      `SELECT
         j.id,
         j.client_id,
         j.title,
         j.description,
         j.budget,
         j.status,
         j.created_at,
         j.updated_at,
         j.images,
         j.due_at,
         j.location_label,
         j.location_lat,
         j.location_lng,
         j.category,
         j.tags,
         up.full_name AS client_name,
         up.avatar_url AS client_avatar_url,
         up.district_city AS client_district_city,
         u.is_email_verified AS client_email_verified,
         COALESCE(pc.proposal_count, 0)::int AS proposal_count
       FROM public.jobs j
       INNER JOIN public.users u ON u.id = j.client_id
       LEFT JOIN public.user_profiles up ON up.user_id = j.client_id
       LEFT JOIN (
         SELECT job_id, COUNT(*)::int AS proposal_count
         FROM public.contracts
         WHERE deleted_at IS NULL AND job_id IS NOT NULL
         GROUP BY job_id
       ) pc ON pc.job_id = j.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${orderBy}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams,
    );

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM public.jobs j
       INNER JOIN public.users u ON u.id = j.client_id
       LEFT JOIN public.user_profiles up ON up.user_id = j.client_id
       WHERE ${conditions.join(" AND ")}`,
      params,
    );

    return res.json({
      jobs: listResult.rows.map(mapJobListingRow),
      total: countResult.rows[0]?.total ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("List jobs failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng jobs. Chạy backend/sql/jobs_images_due_at.sql, jobs_location.sql và jobs_listing_columns.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải danh sách việc làm." });
  } finally {
    db.release();
  }
}

async function getJob(req, res) {
  const jobId = parseUuidParam(req.params.jobId);
  if (!jobId) {
    return res.status(400).json({ message: "Mã công việc không hợp lệ." });
  }

  const payload = tryVerifyAccessToken(req);
  const db = await pool.connect();

  try {
    const jobResult = await db.query(
      `SELECT
         j.id,
         j.client_id,
         j.title,
         j.description,
         j.budget,
         j.status,
         j.created_at,
         j.updated_at,
         j.images,
         j.due_at,
         j.location_label,
         j.location_lat,
         j.location_lng,
         j.category,
         j.tags,
         up.full_name AS client_name,
         up.avatar_url AS client_avatar_url,
         up.district_city AS client_district_city,
         u.is_email_verified AS client_email_verified,
         COALESCE(pc.proposal_count, 0)::int AS proposal_count
       FROM public.jobs j
       INNER JOIN public.users u ON u.id = j.client_id
       LEFT JOIN public.user_profiles up ON up.user_id = j.client_id
       LEFT JOIN (
         SELECT job_id, COUNT(*)::int AS proposal_count
         FROM public.contracts
         WHERE deleted_at IS NULL AND job_id IS NOT NULL
         GROUP BY job_id
       ) pc ON pc.job_id = j.id
       WHERE j.id = $1
       LIMIT 1`,
      [jobId],
    );

    if (jobResult.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy công việc." });
    }

    const job = mapJobListingRow(jobResult.rows[0]);
    let allowed = job.status === "open";

    if (!allowed && payload) {
      if (String(payload.sub) === String(job.client_id)) {
        allowed = true;
      } else if (payload.role === "freelancer") {
        const c = await db.query(
          `SELECT 1 FROM public.contracts
           WHERE job_id = $1 AND freelancer_id = $2 AND deleted_at IS NULL
           LIMIT 1`,
          [jobId, payload.sub],
        );
        allowed = c.rowCount > 0;
      }
    }

    if (!allowed) {
      return res.status(403).json({
        message: "Không có quyền xem công việc này (tin đã đóng hoặc cần đăng nhập đúng vai trò).",
      });
    }

    return res.json({ job });
  } catch (error) {
    console.error("Get job failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng jobs (images/due_at/location). Chạy backend/sql/jobs_images_due_at.sql và backend/sql/jobs_location.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải chi tiết công việc." });
  } finally {
    db.release();
  }
}

module.exports = {
  listJobs,
  listJobCategories,
  getJob,
  uploadJobImages,
  createMyJob,
  acceptJob,
};
