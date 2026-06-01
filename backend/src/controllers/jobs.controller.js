const { pool } = require("../db/pool");
const { verifyAccessToken, tryVerifyAccessToken } = require("../utils/authTokens");
const { normalizeJobImageUrls, parseUuidParam } = require("../utils/validators");
const { uploadJobImages: uploadJobImagesMw } = require("../middleware/jobImagesUpload");
const {
  isClientIdentityVerified: checkClientIdentityVerified,
  IDV_VERIFY_SELECT,
} = require("../utils/clientIdentityVerified");

async function isClientIdentityVerified(db, userId) {
  const result = await db.query(
    `SELECT ${IDV_VERIFY_SELECT}
     FROM public.users u
     LEFT JOIN public.identity_verifications iv ON iv.user_id = u.id
     LEFT JOIN public.user_profiles up ON up.user_id = u.id
     WHERE u.id = $1
     LIMIT 1`,
    [userId],
  );
  const row = result.rows[0];
  return checkClientIdentityVerified(row, {
    phone: row?.profile_phone,
    avatar_url: row?.profile_avatar_url,
  });
}

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
    return res.status(403).json({ message: "Chỉ client mới có thể đăng công việc." });
  }

  const verifyDb = await pool.connect();
  try {
    const verified = await isClientIdentityVerified(verifyDb, payload.sub);
    if (!verified) {
      return res.status(403).json({
        message:
          "Bạn cần hoàn tất xác minh danh tính trước khi đăng tin tuyển dụng. Vào Tài khoản → Xác minh danh tính.",
        code: "IDENTITY_NOT_VERIFIED",
      });
    }
  } catch (error) {
    console.error("Verify client before create job failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng identity_verifications. Chạy backend/sql/identity_verification.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể kiểm tra trạng thái xác minh." });
  } finally {
    verifyDb.release();
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


  const budgetTypeRaw = String(req.body?.budget_type || "fixed").trim().toLowerCase();
  const budgetType = budgetTypeRaw === "hourly" ? "hourly" : "fixed";
  let budgetMax = null;
  if (req.body?.budget_max !== undefined && req.body?.budget_max !== null && String(req.body.budget_max).trim() !== "") {
    budgetMax = Number(req.body.budget_max);
    if (!Number.isFinite(budgetMax) || budgetMax < 0) {
      return res.status(400).json({ message: "Ngân sách tối đa không hợp lệ." });
    }
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO public.jobs (
         client_id, title, description, budget, budget_type, budget_max, status,
         images, due_at, location_label, location_lat, location_lng, category, tags
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'open', $7::jsonb, $8, $9, $10, $11, $12, $13::jsonb)
       RETURNING id, title, description, budget, budget_type, budget_max, status, images, due_at,
         location_label, location_lat, location_lng, category, tags, created_at`,
      [
        payload.sub,
        title,
        description || null,
        budget,
        budgetType,
        budgetMax,
        JSON.stringify(images),
        dueAt,
        locationLabel,
        locationLat,
        locationLng,
        category,
        JSON.stringify(tags),
      ],
    );

    return res.status(201).json({ message: "Đăng công việc thành công.", job: result.rows[0] });
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

async function loadClientJobRow(db, jobId, clientId) {
  const result = await db.query(
    `SELECT j.id, j.client_id, j.status, j.title,
            EXISTS (
              SELECT 1 FROM public.contracts c
              WHERE c.job_id = j.id AND c.deleted_at IS NULL
                AND c.status IN ('pending', 'active')
            ) AS has_active_contract
     FROM public.jobs j
     WHERE j.id = $1 AND j.client_id = $2 AND j.deleted_at IS NULL
     LIMIT 1`,
    [jobId, clientId],
  );
  return result.rows[0] || null;
}

async function updateMyJob(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "client") {
    return res.status(403).json({ message: "Chỉ client được chỉnh sửa công việc của mình." });
  }

  const jobId = parseUuidParam(req.params.jobId);
  if (!jobId) {
    return res.status(400).json({ message: "Mã công việc không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const row = await loadClientJobRow(db, jobId, payload.sub);
    if (!row) {
      return res.status(404).json({ message: "Không tìm thấy công việc hoặc bạn không có quyền." });
    }

    const statusOnly =
      req.body?.status !== undefined &&
      req.body?.status !== null &&
      String(req.body.status).trim() !== "" &&
      Object.keys(req.body || {}).length === 1;

    const nextStatus = statusOnly ? String(req.body.status).trim().toLowerCase() : null;

    if (statusOnly && nextStatus === "closed") {
      if (row.status !== "open") {
        return res.status(400).json({ message: "Chỉ có thể gỡ tin đang mở tuyển." });
      }
      if (row.has_active_contract) {
        return res.status(409).json({
          message: "Không thể gỡ tin khi đã có hợp đồng đang chờ hoặc đang thực hiện.",
        });
      }
      const closed = await db.query(
        `UPDATE public.jobs
         SET status = 'closed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, title, status, updated_at`,
        [jobId],
      );
      return res.json({
        message: "Đã gỡ tin — không nhận thêm báo giá.",
        job: closed.rows[0],
      });
    }

    if (row.status !== "open") {
      return res.status(400).json({
        message: "Chỉ chỉnh sửa được tin đang mở tuyển. Tin đã đóng hoặc đang tiến hành không thể sửa.",
      });
    }
    if (row.has_active_contract) {
      return res.status(409).json({
        message: "Không thể chỉnh sửa khi đã có hợp đồng đang chờ hoặc đang thực hiện.",
      });
    }

    const title =
      req.body?.title !== undefined ? String(req.body.title || "").trim() : String(row.title || "").trim();
    const description =
      req.body?.description !== undefined
        ? String(req.body.description || "").trim()
        : undefined;
    const budget =
      req.body?.budget !== undefined && req.body?.budget !== ""
        ? Number(req.body.budget)
        : undefined;
    const images =
      req.body?.images !== undefined ? normalizeJobImageUrls(req.body.images) : undefined;

    let dueAt = undefined;
    if (req.body?.due_at !== undefined) {
      const dueRaw = req.body.due_at;
      if (dueRaw === null || String(dueRaw).trim() === "") {
        dueAt = null;
      } else {
        const d = new Date(String(dueRaw));
        if (!Number.isFinite(d.getTime())) {
          return res.status(400).json({ message: "Thời hạn hoàn thành không hợp lệ." });
        }
        dueAt = d;
      }
    }

    if (!title) {
      return res.status(400).json({ message: "Tiêu đề công việc là bắt buộc." });
    }
    if (budget !== undefined && budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      return res.status(400).json({ message: "Ngân sách không hợp lệ." });
    }

    const category =
      req.body?.category !== undefined
        ? String(req.body.category || "").trim() || null
        : undefined;
    let tags = undefined;
    if (req.body?.tags !== undefined) {
      const tagsRaw = req.body.tags;
      tags = [];
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
    }

    const locationLabel =
      req.body?.location_label !== undefined
        ? String(req.body.location_label || "").trim() || null
        : undefined;
    let locationLat = undefined;
    let locationLng = undefined;
    if (req.body?.location_lat !== undefined || req.body?.location_lng !== undefined) {
      const latRaw = req.body?.location_lat;
      const lngRaw = req.body?.location_lng;
      if (
        latRaw !== undefined &&
        latRaw !== null &&
        String(latRaw).trim() !== "" &&
        lngRaw !== undefined &&
        lngRaw !== null &&
        String(lngRaw).trim() !== ""
      ) {
        locationLat = Number(latRaw);
        locationLng = Number(lngRaw);
        if (
          !Number.isFinite(locationLat) ||
          !Number.isFinite(locationLng) ||
          locationLat < -90 ||
          locationLat > 90 ||
          locationLng < -180 ||
          locationLng > 180
        ) {
          return res.status(400).json({ message: "Tọa độ vị trí không hợp lệ." });
        }
      } else {
        locationLat = null;
        locationLng = null;
      }
    }

    const budgetTypeRaw =
      req.body?.budget_type !== undefined
        ? String(req.body.budget_type || "fixed").trim().toLowerCase()
        : undefined;
    const budgetType = budgetTypeRaw === "hourly" ? "hourly" : budgetTypeRaw === "fixed" ? "fixed" : undefined;
    let budgetMax = undefined;
    if (req.body?.budget_max !== undefined) {
      if (req.body.budget_max === null || String(req.body.budget_max).trim() === "") {
        budgetMax = null;
      } else {
        budgetMax = Number(req.body.budget_max);
        if (!Number.isFinite(budgetMax) || budgetMax < 0) {
          return res.status(400).json({ message: "Ngân sách tối đa không hợp lệ." });
        }
      }
    }

    const sets = ["title = $2", "updated_at = CURRENT_TIMESTAMP"];
    const values = [jobId, title];
    let idx = 3;

    if (description !== undefined) {
      sets.push(`description = $${idx}`);
      values.push(description || null);
      idx += 1;
    }
    if (budget !== undefined) {
      sets.push(`budget = $${idx}`);
      values.push(budget);
      idx += 1;
    }
    if (budgetType !== undefined) {
      sets.push(`budget_type = $${idx}`);
      values.push(budgetType);
      idx += 1;
    }
    if (budgetMax !== undefined) {
      sets.push(`budget_max = $${idx}`);
      values.push(budgetMax);
      idx += 1;
    }
    if (images !== undefined) {
      sets.push(`images = $${idx}::jsonb`);
      values.push(JSON.stringify(images));
      idx += 1;
    }
    if (dueAt !== undefined) {
      sets.push(`due_at = $${idx}`);
      values.push(dueAt);
      idx += 1;
    }
    if (locationLabel !== undefined) {
      sets.push(`location_label = $${idx}`);
      values.push(locationLabel);
      idx += 1;
    }
    if (locationLat !== undefined) {
      sets.push(`location_lat = $${idx}`);
      values.push(locationLat);
      idx += 1;
    }
    if (locationLng !== undefined) {
      sets.push(`location_lng = $${idx}`);
      values.push(locationLng);
      idx += 1;
    }
    if (category !== undefined) {
      sets.push(`category = $${idx}`);
      values.push(category);
      idx += 1;
    }
    if (tags !== undefined) {
      sets.push(`tags = $${idx}::jsonb`);
      values.push(JSON.stringify(tags));
      idx += 1;
    }

    const result = await db.query(
      `UPDATE public.jobs SET ${sets.join(", ")} WHERE id = $1
       RETURNING id, title, description, budget, budget_type, budget_max, status, images, due_at,
         location_label, location_lat, location_lng, category, tags, updated_at`,
      values,
    );

    return res.json({ message: "Đã cập nhật công việc.", job: result.rows[0] });
  } catch (error) {
    console.error("Update my job failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng jobs. Chạy backend/sql/jobs_soft_delete.sql và các migration jobs_* trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể cập nhật công việc." });
  } finally {
    db.release();
  }
}

async function deleteMyJob(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "client") {
    return res.status(403).json({ message: "Chỉ client được xóa công việc của mình." });
  }

  const jobId = parseUuidParam(req.params.jobId);
  if (!jobId) {
    return res.status(400).json({ message: "Mã công việc không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const row = await loadClientJobRow(db, jobId, payload.sub);
    if (!row) {
      return res.status(404).json({ message: "Không tìm thấy công việc hoặc bạn không có quyền." });
    }
    if (row.status !== "open") {
      return res.status(400).json({
        message: "Chỉ xóa được tin đang mở tuyển. Tin đã đóng hoặc đang tiến hành không thể xóa.",
      });
    }
    if (row.has_active_contract) {
      return res.status(409).json({
        message: "Không thể xóa khi đã có hợp đồng đang chờ hoặc đang thực hiện.",
      });
    }

    await db.query(
      `UPDATE public.jobs
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [jobId],
    );

    return res.json({ message: "Đã xóa công việc khỏi danh sách của bạn." });
  } catch (error) {
    console.error("Delete my job failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message: "Thiếu cột deleted_at trên jobs. Chạy backend/sql/jobs_soft_delete.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể xóa công việc." });
  } finally {
    db.release();
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

  const conditions = ["j.status = 'open'", "u.deleted_at IS NULL", "j.deleted_at IS NULL"];
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
    budget_type: row.budget_type ?? null,
    budget_max: row.budget_max ?? null,
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
    client_country: row.client_country ?? null,
    client_total_spent: row.client_total_spent != null ? Number(row.client_total_spent) : 0,
    client_satisfaction_score:
      row.client_satisfaction_score != null ? Number(row.client_satisfaction_score) : null,
    client_email_verified: Boolean(row.client_email_verified),
    proposal_count: Number(row.proposal_count) || 0,
    quote_count: Number(row.quote_count) || 0,
  };
}

const JOB_LISTING_SELECT = `
         j.id,
         j.client_id,
         j.title,
         j.description,
         j.budget,
         j.budget_type,
         j.budget_max,
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
         COALESCE(up.country, '') AS client_country,
         u.is_email_verified AS client_email_verified,
         up.client_satisfaction_score,
         COALESCE(csp.total_spent, 0)::float8 AS client_total_spent,
         COALESCE(pc.proposal_count, 0)::int AS proposal_count,
         COALESCE(qc.quote_count, 0)::int AS quote_count`;

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
      `SELECT${JOB_LISTING_SELECT}
       FROM public.jobs j
       INNER JOIN public.users u ON u.id = j.client_id
       LEFT JOIN public.user_profiles up ON up.user_id = j.client_id
       LEFT JOIN (
         SELECT client_id, COALESCE(SUM(agreed_price), 0) AS total_spent
         FROM public.contracts
         WHERE deleted_at IS NULL AND status IN ('completed', 'active')
         GROUP BY client_id
       ) csp ON csp.client_id = j.client_id
       LEFT JOIN (
         SELECT job_id, COUNT(*)::int AS proposal_count
         FROM public.contracts
         WHERE deleted_at IS NULL AND job_id IS NOT NULL
         GROUP BY job_id
       ) pc ON pc.job_id = j.id
       LEFT JOIN (
         SELECT job_id, COUNT(*)::int AS quote_count
         FROM public.job_quotes
         WHERE status NOT IN ('withdrawn', 'declined')
         GROUP BY job_id
       ) qc ON qc.job_id = j.id
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
      `SELECT${JOB_LISTING_SELECT}
       FROM public.jobs j
       INNER JOIN public.users u ON u.id = j.client_id
       LEFT JOIN public.user_profiles up ON up.user_id = j.client_id
       LEFT JOIN (
         SELECT client_id, COALESCE(SUM(agreed_price), 0) AS total_spent
         FROM public.contracts
         WHERE deleted_at IS NULL AND status IN ('completed', 'active')
         GROUP BY client_id
       ) csp ON csp.client_id = j.client_id
       LEFT JOIN (
         SELECT job_id, COUNT(*)::int AS proposal_count
         FROM public.contracts
         WHERE deleted_at IS NULL AND job_id IS NOT NULL
         GROUP BY job_id
       ) pc ON pc.job_id = j.id
       LEFT JOIN (
         SELECT job_id, COUNT(*)::int AS quote_count
         FROM public.job_quotes
         WHERE status NOT IN ('withdrawn', 'declined')
         GROUP BY job_id
       ) qc ON qc.job_id = j.id
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

async function listMyJobs(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  if (payload.role !== "client") {
    return res.status(403).json({ message: "Chỉ client được xem danh sách công việc đã đăng." });
  }

  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || ""), 10) || 24, 1), 100);
  const offset = Math.max(Number.parseInt(String(req.query.offset || ""), 10) || 0, 0);
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "").trim().toLowerCase();

  const conditions = ["j.client_id = $1", "u.deleted_at IS NULL", "j.deleted_at IS NULL"];
  const params = [payload.sub];
  let idx = 2;

  if (q) {
    conditions.push(`(j.title ILIKE $${idx} OR j.description ILIKE $${idx})`);
    params.push(`%${q}%`);
    idx += 1;
  }

  if (status && ["open", "in_progress", "closed", "cancelled"].includes(status)) {
    conditions.push(`j.status = $${idx}`);
    params.push(status);
    idx += 1;
  }

  const db = await pool.connect();
  try {
    const listParams = [...params, limit, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const listResult = await db.query(
      `SELECT${JOB_LISTING_SELECT}
       FROM public.jobs j
       INNER JOIN public.users u ON u.id = j.client_id
       LEFT JOIN public.user_profiles up ON up.user_id = j.client_id
       LEFT JOIN (
         SELECT client_id, COALESCE(SUM(agreed_price), 0) AS total_spent
         FROM public.contracts
         WHERE deleted_at IS NULL AND status IN ('completed', 'active')
         GROUP BY client_id
       ) csp ON csp.client_id = j.client_id
       LEFT JOIN (
         SELECT job_id, COUNT(*)::int AS proposal_count
         FROM public.contracts
         WHERE deleted_at IS NULL AND job_id IS NOT NULL
         GROUP BY job_id
       ) pc ON pc.job_id = j.id
       LEFT JOIN (
         SELECT job_id, COUNT(*)::int AS quote_count
         FROM public.job_quotes
         WHERE status NOT IN ('withdrawn', 'declined')
         GROUP BY job_id
       ) qc ON qc.job_id = j.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY j.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams,
    );

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM public.jobs j
       INNER JOIN public.users u ON u.id = j.client_id
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
    console.error("List my jobs failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message:
          "Thiếu bảng job_quotes hoặc cột jobs. Chạy backend/sql/hire_joblist_columns.sql trên PostgreSQL.",
      });
    }
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên jobs/user_profiles. Chạy backend/sql/hire_joblist_columns.sql và jobs_listing_columns.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải danh sách công việc của bạn." });
  } finally {
    db.release();
  }
}

module.exports = {
  listJobs,
  listMyJobs,
  listJobCategories,
  getJob,
  uploadJobImages,
  createMyJob,
  updateMyJob,
  deleteMyJob,
  acceptJob,
};
