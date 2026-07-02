const { pool } = require("../db/pool");
const { requireAdmin } = require("../utils/requireAdmin");
const { parseUuidParam } = require("../utils/validators");
const { notifyJobModeration } = require("../utils/notificationService");

const MODERATION_SCHEMA_HINT =
  "Chạy backend/sql/jobs_admin_moderation.sql trên PostgreSQL.";

function mapAdminJobRow(row) {
  return {
    id: row.id,
    client_id: row.client_id,
    title: row.title,
    description: row.description,
    budget: row.budget,
    budget_type: row.budget_type ?? null,
    budget_max: row.budget_max ?? null,
    status: row.status,
    category: row.category,
    tags: row.tags ?? [],
    images: row.images ?? [],
    due_at: row.due_at,
    location_label: row.location_label,
    location_lat: row.location_lat,
    location_lng: row.location_lng,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    admin_hidden_at: row.admin_hidden_at,
    admin_hidden_reason: row.admin_hidden_reason,
    admin_hidden_by: row.admin_hidden_by,
    client_name: row.client_name,
    client_email: row.client_email,
    client_phone: row.client_phone,
    client_avatar_url: row.client_avatar_url,
    client_district_city: row.client_district_city,
    quote_count: Number(row.quote_count) || 0,
    contract_count: Number(row.contract_count) || 0,
  };
}

function buildListFilters(query) {
  const visibility = String(query.visibility || "all").toLowerCase();
  const status = String(query.status || "all").toLowerCase();
  const q = String(query.q || "").trim().slice(0, 160);
  const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(10, Number.parseInt(String(query.limit || "25"), 10) || 25));
  const offset = (page - 1) * limit;

  const where = ["1=1"];
  const params = [];
  let idx = 1;

  if (visibility === "visible") {
    where.push("j.deleted_at IS NULL", "j.admin_hidden_at IS NULL");
  } else if (visibility === "hidden") {
    where.push("j.deleted_at IS NULL", "j.admin_hidden_at IS NOT NULL");
  } else if (visibility === "deleted") {
    where.push("j.deleted_at IS NOT NULL");
  }

  if (status === "open" || status === "in_progress" || status === "closed" || status === "cancelled") {
    where.push(`j.status = $${idx}`);
    params.push(status);
    idx += 1;
  }

  if (q) {
    const pattern = `%${q}%`;
    where.push(`(
      j.title ILIKE $${idx}
      OR COALESCE(j.description, '') ILIKE $${idx}
      OR COALESCE(j.category, '') ILIKE $${idx}
      OR COALESCE(up.full_name, '') ILIKE $${idx}
      OR COALESCE(u.email, '') ILIKE $${idx}
    )`);
    params.push(pattern);
    idx += 1;
  }

  return { visibility, status, q, page, limit, offset, where, params, idx };
}

const JOB_ADMIN_SELECT = `
  j.id,
  j.client_id,
  j.title,
  j.description,
  j.budget,
  j.budget_type,
  j.budget_max,
  j.status,
  j.category,
  j.tags,
  j.images,
  j.due_at,
  j.location_label,
  j.location_lat,
  j.location_lng,
  j.created_at,
  j.updated_at,
  j.deleted_at,
  j.admin_hidden_at,
  j.admin_hidden_reason,
  j.admin_hidden_by,
  up.full_name AS client_name,
  u.email AS client_email,
  up.phone AS client_phone,
  up.avatar_url AS client_avatar_url,
  up.district_city AS client_district_city,
  COALESCE(qc.quote_count, 0)::int AS quote_count,
  COALESCE(cc.contract_count, 0)::int AS contract_count`;

const JOB_ADMIN_JOINS = `
  FROM public.jobs j
  INNER JOIN public.users u ON u.id = j.client_id
  LEFT JOIN public.user_profiles up ON up.user_id = j.client_id
  LEFT JOIN (
    SELECT job_id, COUNT(*)::int AS quote_count
    FROM public.job_quotes
    WHERE status NOT IN ('withdrawn', 'declined')
    GROUP BY job_id
  ) qc ON qc.job_id = j.id
  LEFT JOIN (
    SELECT job_id, COUNT(*)::int AS contract_count
    FROM public.contracts
    WHERE deleted_at IS NULL AND job_id IS NOT NULL
    GROUP BY job_id
  ) cc ON cc.job_id = j.id`;

async function loadAdminJob(db, jobId) {
  const result = await db.query(
    `SELECT ${JOB_ADMIN_SELECT}
     ${JOB_ADMIN_JOINS}
     WHERE j.id = $1
     LIMIT 1`,
    [jobId],
  );
  return result.rows[0] || null;
}

async function listAdminJobs(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const filters = buildListFilters(req.query);
  const db = await pool.connect();

  try {
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       ${JOB_ADMIN_JOINS}
       WHERE ${filters.where.join(" AND ")}`,
      filters.params,
    );
    const total = countResult.rows[0]?.total ?? 0;

    const listParams = [...filters.params, filters.limit, filters.offset];
    const listResult = await db.query(
      `SELECT ${JOB_ADMIN_SELECT}
       ${JOB_ADMIN_JOINS}
       WHERE ${filters.where.join(" AND ")}
       ORDER BY j.created_at DESC
       LIMIT $${filters.idx} OFFSET $${filters.idx + 1}`,
      listParams,
    );

    return res.json({
      jobs: listResult.rows.map(mapAdminJobRow),
      total,
      page: filters.page,
      limit: filters.limit,
    });
  } catch (error) {
    console.error("List admin jobs failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({ message: MODERATION_SCHEMA_HINT });
    }
    return res.status(500).json({ message: "Không thể tải danh sách bài đăng." });
  } finally {
    db.release();
  }
}

async function getAdminJobDetail(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const jobId = parseUuidParam(req.params.jobId);
  if (!jobId) {
    return res.status(400).json({ message: "Mã bài đăng không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const row = await loadAdminJob(db, jobId);
    if (!row) {
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }
    return res.json({ job: mapAdminJobRow(row) });
  } catch (error) {
    console.error("Get admin job detail failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({ message: MODERATION_SCHEMA_HINT });
    }
    return res.status(500).json({ message: "Không thể tải chi tiết bài đăng." });
  } finally {
    db.release();
  }
}

async function moderateAdminJob(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const jobId = parseUuidParam(req.params.jobId);
  if (!jobId) {
    return res.status(400).json({ message: "Mã bài đăng không hợp lệ." });
  }

  const action = String(req.body?.action || "").trim().toLowerCase();
  const reason = String(req.body?.reason || "").trim().slice(0, 2000);

  if (!["hide", "unhide", "delete"].includes(action)) {
    return res.status(400).json({ message: "Hành động không hợp lệ (hide, unhide, delete)." });
  }

  if ((action === "hide" || action === "delete") && reason.length < 10) {
    return res.status(400).json({
      message: "Vui lòng nhập lý do xử lý (ít nhất 10 ký tự) để gửi thông báo cho người đăng.",
    });
  }

  const db = await pool.connect();
  try {
    await db.query("BEGIN");

    const cur = await db.query(
      `SELECT id, client_id, title, deleted_at, admin_hidden_at
       FROM public.jobs
       WHERE id = $1
       FOR UPDATE`,
      [jobId],
    );
    if (cur.rowCount === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy bài đăng." });
    }

    const job = cur.rows[0];

    if (action === "hide") {
      if (job.deleted_at) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Bài đăng đã bị xóa, không thể ẩn." });
      }
      if (job.admin_hidden_at) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Bài đăng đã được ẩn trước đó." });
      }
      await db.query(
        `UPDATE public.jobs
         SET admin_hidden_at = CURRENT_TIMESTAMP,
             admin_hidden_reason = $2,
             admin_hidden_by = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [jobId, reason, payload.sub],
      );
    } else if (action === "unhide") {
      if (!job.admin_hidden_at) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Bài đăng không ở trạng thái ẩn." });
      }
      await db.query(
        `UPDATE public.jobs
         SET admin_hidden_at = NULL,
             admin_hidden_reason = NULL,
             admin_hidden_by = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [jobId],
      );
    } else if (action === "delete") {
      if (job.deleted_at) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Bài đăng đã bị xóa trước đó." });
      }
      await db.query(
        `UPDATE public.jobs
         SET deleted_at = CURRENT_TIMESTAMP,
             status = CASE WHEN status = 'open' THEN 'closed' ELSE status END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [jobId],
      );
    }

    await notifyJobModeration(db, {
      clientId: job.client_id,
      adminId: payload.sub,
      jobId,
      jobTitle: job.title,
      action,
      reason,
    });

    await db.query("COMMIT");

    const updated = await loadAdminJob(db, jobId);
    const messages = {
      hide: "Đã ẩn bài đăng và gửi thông báo cho khách hàng.",
      unhide: "Đã hiển thị lại bài đăng và gửi thông báo cho khách hàng.",
      delete: "Đã xóa bài đăng và gửi thông báo cho khách hàng.",
    };

    return res.json({
      message: messages[action],
      job: updated ? mapAdminJobRow(updated) : null,
    });
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("Moderate admin job failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({ message: MODERATION_SCHEMA_HINT });
    }
    return res.status(500).json({ message: "Không thể xử lý bài đăng lúc này." });
  } finally {
    db.release();
  }
}

module.exports = {
  listAdminJobs,
  getAdminJobDetail,
  moderateAdminJob,
};
