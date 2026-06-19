const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { parseUuidParam } = require("../utils/validators");

function requireClientPayload(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return null;
  if (payload.role !== "client") {
    res.status(403).json({ message: "Chỉ client được lưu freelancer yêu thích." });
    return null;
  }
  return payload;
}

async function countFreelancerFavorites(db, freelancerId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS favorite_count
     FROM public.client_favorite_freelancers
     WHERE freelancer_id = $1`,
    [freelancerId],
  );
  return result.rows[0]?.favorite_count ?? 0;
}

async function ensureActiveFreelancer(db, freelancerId, res) {
  const check = await db.query(
    `SELECT u.id
     FROM public.users u
     INNER JOIN public.freelancer_profiles fp ON fp.user_id = u.id AND fp.deleted_at IS NULL
     WHERE u.id = $1
       AND u.role = 'freelancer'
       AND u.deleted_at IS NULL
       AND u.status = 'active'
     LIMIT 1`,
    [freelancerId],
  );
  if (check.rowCount === 0) {
    res.status(404).json({ message: "Không tìm thấy freelancer." });
    return false;
  }
  return true;
}

async function listFavoriteFreelancerIds(req, res) {
  const payload = requireClientPayload(req, res);
  if (!payload) return;

  const db = await pool.connect();
  try {
    const result = await db.query(
      `SELECT freelancer_id
       FROM public.client_favorite_freelancers
       WHERE client_id = $1
       ORDER BY saved_at DESC`,
      [payload.sub],
    );
    return res.json({ freelancerIds: result.rows.map((row) => row.freelancer_id) });
  } catch (error) {
    console.error("List favorite freelancer ids failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message:
          "Thiếu bảng client_favorite_freelancers. Chạy backend/sql/client_favorite_freelancers.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải danh sách yêu thích." });
  } finally {
    db.release();
  }
}

async function addFavoriteFreelancer(req, res) {
  const payload = requireClientPayload(req, res);
  if (!payload) return;

  const freelancerId = parseUuidParam(req.params.freelancerId);
  if (!freelancerId) {
    return res.status(400).json({ message: "Mã freelancer không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    if (!(await ensureActiveFreelancer(db, freelancerId, res))) return;

    await db.query(
      `INSERT INTO public.client_favorite_freelancers (client_id, freelancer_id)
       VALUES ($1, $2)
       ON CONFLICT (client_id, freelancer_id) DO NOTHING`,
      [payload.sub, freelancerId],
    );

    const favoriteCount = await countFreelancerFavorites(db, freelancerId);
    return res.json({
      message: "Đã thêm vào danh sách yêu thích.",
      isFavorite: true,
      favoriteCount,
    });
  } catch (error) {
    console.error("Add favorite freelancer failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message:
          "Thiếu bảng client_favorite_freelancers. Chạy backend/sql/client_favorite_freelancers.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể lưu yêu thích." });
  } finally {
    db.release();
  }
}

async function removeFavoriteFreelancer(req, res) {
  const payload = requireClientPayload(req, res);
  if (!payload) return;

  const freelancerId = parseUuidParam(req.params.freelancerId);
  if (!freelancerId) {
    return res.status(400).json({ message: "Mã freelancer không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    await db.query(
      `DELETE FROM public.client_favorite_freelancers
       WHERE client_id = $1 AND freelancer_id = $2`,
      [payload.sub, freelancerId],
    );

    const favoriteCount = await countFreelancerFavorites(db, freelancerId);
    return res.json({
      message: "Đã bỏ khỏi danh sách yêu thích.",
      isFavorite: false,
      favoriteCount,
    });
  } catch (error) {
    console.error("Remove favorite freelancer failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message:
          "Thiếu bảng client_favorite_freelancers. Chạy backend/sql/client_favorite_freelancers.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể bỏ yêu thích." });
  } finally {
    db.release();
  }
}

async function syncFavoriteFreelancers(req, res) {
  const payload = requireClientPayload(req, res);
  if (!payload) return;

  const rawIds = req.body?.freelancerIds ?? req.body?.ids ?? [];
  if (!Array.isArray(rawIds)) {
    return res.status(400).json({ message: "freelancerIds phải là mảng." });
  }

  const ids = [...new Set(rawIds.map((id) => parseUuidParam(id)).filter(Boolean))].slice(0, 200);
  if (ids.length === 0) {
    return res.json({ synced: 0, freelancerIds: [] });
  }

  const db = await pool.connect();
  try {
    let synced = 0;
    for (const freelancerId of ids) {
      if (!(await ensureActiveFreelancer(db, freelancerId, null))) continue;
      const insert = await db.query(
        `INSERT INTO public.client_favorite_freelancers (client_id, freelancer_id)
         VALUES ($1, $2)
         ON CONFLICT (client_id, freelancer_id) DO NOTHING
         RETURNING id`,
        [payload.sub, freelancerId],
      );
      if (insert.rowCount > 0) synced += 1;
    }

    const list = await db.query(
      `SELECT freelancer_id
       FROM public.client_favorite_freelancers
       WHERE client_id = $1
       ORDER BY saved_at DESC`,
      [payload.sub],
    );

    return res.json({
      synced,
      freelancerIds: list.rows.map((row) => row.freelancer_id),
    });
  } catch (error) {
    console.error("Sync favorite freelancers failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message:
          "Thiếu bảng client_favorite_freelancers. Chạy backend/sql/client_favorite_freelancers.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể đồng bộ yêu thích." });
  } finally {
    db.release();
  }
}

module.exports = {
  listFavoriteFreelancerIds,
  addFavoriteFreelancer,
  removeFavoriteFreelancer,
  syncFavoriteFreelancers,
};
