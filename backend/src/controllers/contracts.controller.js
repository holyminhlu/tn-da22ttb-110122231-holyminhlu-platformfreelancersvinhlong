const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { parseUuidParam } = require("../utils/validators");

async function listMyContracts(req, res) {

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
}

async function getMyWork(req, res) {

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
           c.service_id,
           c.workflow_stage,
           c.escrow_status,
           c.proposal_text,
           c.proposal_submitted_at,
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
         WHERE j.client_id = $1 AND j.deleted_at IS NULL
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
           c.service_id,
           c.workflow_stage,
           c.escrow_status,
           c.proposal_text,
           c.proposal_submitted_at,
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
          "Thiếu cột DB. Chạy backend/sql/service_order_workflow.sql (đơn dịch vụ), contracts_workflow_columns.sql, jobs_images_due_at.sql và contracts_reviews.sql.",
      });
    }
    return res.status(500).json({ message: "Không thể tải công việc của bạn." });
  } finally {
    dbClient.release();
  }
}

async function patchMyContract(req, res) {

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
}

async function reviewContract(req, res) {

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
}

module.exports = {
  listMyContracts,
  getMyWork,
  patchMyContract,
  reviewContract,
};
