const { pool } = require("../db/pool");
const { requireAdmin } = require("../utils/requireAdmin");
const { parseUuidParam } = require("../utils/validators");

const DEFAULT_CONTACT = {
  email: "vinhlongconnect@gmail.com",
  phone: "0983149203",
  address: "Tiểu Cần, Vĩnh Long",
};

function mapSocialRow(row) {
  return {
    id: row.id,
    platform: row.platform,
    label: row.label,
    url: row.url || "",
    sortOrder: row.sort_order,
    isVisible: Boolean(row.is_visible),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadContactCore(db) {
  const result = await db.query(
    `SELECT email, phone, address, updated_at
     FROM public.site_contact
     WHERE id = 1
     LIMIT 1`,
  );
  if (result.rowCount === 0) {
    return { ...DEFAULT_CONTACT, updatedAt: null };
  }
  const row = result.rows[0];
  return {
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    updatedAt: row.updated_at,
  };
}

async function loadSocialLinks(db, { visibleOnly = false } = {}) {
  const where = visibleOnly ? "WHERE is_visible = TRUE" : "";
  const result = await db.query(
    `SELECT id, platform, label, url, sort_order, is_visible, created_at, updated_at
     FROM public.contact_social_links
     ${where}
     ORDER BY sort_order ASC, created_at ASC`,
  );
  return result.rows.map(mapSocialRow);
}

function tableMissingError(res, error) {
  if (error.code === "42P01" || /site_contact|contact_social_links/.test(String(error.message))) {
    return res.status(503).json({
      message: "Chưa cấu hình bảng liên hệ. Chạy backend/sql/site_contact.sql trên PostgreSQL.",
    });
  }
  return null;
}

async function getPublicContact(_req, res) {
  const db = await pool.connect();
  try {
    const core = await loadContactCore(db);
    const socialLinks = await loadSocialLinks(db, { visibleOnly: true });
    return res.json({ ...core, socialLinks });
  } catch (error) {
    const missing = tableMissingError(res, error);
    if (missing) return missing;
    console.error("getPublicContact failed:", error.message);
    return res.status(500).json({ message: "Không thể tải thông tin liên hệ." });
  } finally {
    db.release();
  }
}

async function getAdminContact(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const db = await pool.connect();
  try {
    const core = await loadContactCore(db);
    const socialLinks = await loadSocialLinks(db);
    return res.json({ ...core, socialLinks });
  } catch (error) {
    const missing = tableMissingError(res, error);
    if (missing) return missing;
    console.error("getAdminContact failed:", error.message);
    return res.status(500).json({ message: "Không thể tải cài đặt liên hệ." });
  } finally {
    db.release();
  }
}

async function updateAdminContact(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const email = String(body.email ?? "").trim().slice(0, 200);
  const phone = String(body.phone ?? "").trim().slice(0, 40);
  const address = String(body.address ?? "").trim().slice(0, 500);

  if (!email && !phone && !address) {
    return res.status(400).json({ message: "Cần ít nhất một trường thông tin liên hệ." });
  }

  const db = await pool.connect();
  try {
    await db.query(
      `INSERT INTO public.site_contact (id, email, phone, address, updated_at)
       VALUES (1, $1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           address = EXCLUDED.address,
           updated_at = CURRENT_TIMESTAMP`,
      [email, phone, address],
    );
    const core = await loadContactCore(db);
    return res.json({ message: "Đã lưu thông tin liên hệ.", ...core });
  } catch (error) {
    const missing = tableMissingError(res, error);
    if (missing) return missing;
    console.error("updateAdminContact failed:", error.message);
    return res.status(500).json({ message: "Không thể lưu thông tin liên hệ." });
  } finally {
    db.release();
  }
}

async function createSocialLink(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const platform = String(body.platform || "custom").trim().slice(0, 40);
  const label = String(body.label || "").trim().slice(0, 80);
  const url = String(body.url || "").trim().slice(0, 500);
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
  const isVisible = body.isVisible !== false;

  if (!label) {
    return res.status(400).json({ message: "Nhãn hiển thị không được để trống." });
  }

  const db = await pool.connect();
  try {
    const result = await db.query(
      `INSERT INTO public.contact_social_links
         (platform, label, url, sort_order, is_visible, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, platform, label, url, sort_order, is_visible, created_at, updated_at`,
      [platform, label, url, sortOrder, isVisible],
    );
    return res.status(201).json({
      message: "Đã thêm liên kết mạng xã hội.",
      item: mapSocialRow(result.rows[0]),
    });
  } catch (error) {
    const missing = tableMissingError(res, error);
    if (missing) return missing;
    console.error("createSocialLink failed:", error.message);
    return res.status(500).json({ message: "Không thể thêm liên kết." });
  } finally {
    db.release();
  }
}

async function updateSocialLink(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const linkId = parseUuidParam(req.params.linkId);
  if (!linkId) {
    return res.status(400).json({ message: "Mã liên kết không hợp lệ." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const sets = [];
  const params = [linkId];
  let idx = 2;

  if (body.platform !== undefined) {
    sets.push(`platform = $${idx}`);
    params.push(String(body.platform || "custom").trim().slice(0, 40));
    idx += 1;
  }
  if (body.label !== undefined) {
    const label = String(body.label || "").trim().slice(0, 80);
    if (!label) return res.status(400).json({ message: "Nhãn hiển thị không được để trống." });
    sets.push(`label = $${idx}`);
    params.push(label);
    idx += 1;
  }
  if (body.url !== undefined) {
    sets.push(`url = $${idx}`);
    params.push(String(body.url || "").trim().slice(0, 500));
    idx += 1;
  }
  if (body.sortOrder !== undefined) {
    sets.push(`sort_order = $${idx}`);
    params.push(Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0);
    idx += 1;
  }
  if (body.isVisible !== undefined) {
    sets.push(`is_visible = $${idx}`);
    params.push(Boolean(body.isVisible));
    idx += 1;
  }

  if (sets.length === 0) {
    return res.status(400).json({ message: "Không có thay đổi." });
  }

  sets.push("updated_at = CURRENT_TIMESTAMP");

  const db = await pool.connect();
  try {
    const result = await db.query(
      `UPDATE public.contact_social_links
       SET ${sets.join(", ")}
       WHERE id = $1
       RETURNING id, platform, label, url, sort_order, is_visible, created_at, updated_at`,
      params,
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy liên kết." });
    }
    return res.json({
      message: "Đã cập nhật liên kết.",
      item: mapSocialRow(result.rows[0]),
    });
  } catch (error) {
    const missing = tableMissingError(res, error);
    if (missing) return missing;
    console.error("updateSocialLink failed:", error.message);
    return res.status(500).json({ message: "Không thể cập nhật liên kết." });
  } finally {
    db.release();
  }
}

async function deleteSocialLink(req, res) {
  const payload = requireAdmin(req, res);
  if (!payload) return;

  const linkId = parseUuidParam(req.params.linkId);
  if (!linkId) {
    return res.status(400).json({ message: "Mã liên kết không hợp lệ." });
  }

  const db = await pool.connect();
  try {
    const result = await db.query(
      `DELETE FROM public.contact_social_links WHERE id = $1 RETURNING id`,
      [linkId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy liên kết." });
    }
    return res.json({ message: "Đã xóa liên kết mạng xã hội." });
  } catch (error) {
    const missing = tableMissingError(res, error);
    if (missing) return missing;
    console.error("deleteSocialLink failed:", error.message);
    return res.status(500).json({ message: "Không thể xóa liên kết." });
  } finally {
    db.release();
  }
}

module.exports = {
  getPublicContact,
  getAdminContact,
  updateAdminContact,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
};
