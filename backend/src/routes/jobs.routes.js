const express = require("express");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");

const router = express.Router();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

function parseUuidParam(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)) return null;
  return s;
}

function tryVerifyAccessToken(req) {
  const raw = req.headers.authorization || "";
  if (!raw.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(raw.slice("Bearer ".length).trim(), ACCESS_SECRET);
  } catch {
    return null;
  }
}

router.get("/", async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || ""), 10) || 24, 1), 100);
  const offset = Math.max(Number.parseInt(String(req.query.offset || ""), 10) || 0, 0);

  const db = await pool.connect();
  try {
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
         up.full_name AS client_name
       FROM public.jobs j
       LEFT JOIN public.user_profiles up ON up.user_id = j.client_id
       WHERE j.status = 'open'
       ORDER BY j.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM public.jobs WHERE status = 'open'`);

    return res.json({
      jobs: listResult.rows,
      total: countResult.rows[0]?.total ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("List jobs failed:", error.message);
    if (error.code === "42703") {
      return res.status(503).json({
        message:
          "Thiếu cột trên bảng jobs (images/due_at/location). Chạy backend/sql/jobs_images_due_at.sql và backend/sql/jobs_location.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải danh sách việc làm." });
  } finally {
    db.release();
  }
});

/** Chi tiết job: tin đang mở công khai; tin khác chỉ client chủ hoặc freelancer có hợp đồng */
router.get("/:jobId", async (req, res) => {
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
         up.full_name AS client_name
       FROM public.jobs j
       LEFT JOIN public.user_profiles up ON up.user_id = j.client_id
       WHERE j.id = $1
       LIMIT 1`,
      [jobId],
    );

    if (jobResult.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy công việc." });
    }

    const job = jobResult.rows[0];
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
});

module.exports = router;
