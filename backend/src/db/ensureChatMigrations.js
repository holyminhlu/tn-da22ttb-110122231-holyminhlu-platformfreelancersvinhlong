const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

const CHAT_FIX_SQL = path.join(__dirname, "..", "..", "sql", "chat_messages_image_file_fix.sql");

async function queryChatSchemaStatus(db) {
  const columns = await db.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'chat_messages'
       AND column_name = ANY($1::text[])`,
    [["kind", "attachment_url", "attachment_name", "attachment_mime", "context_type"]],
  );
  const present = new Set(columns.rows.map((row) => row.column_name));

  let kindCheck = "";
  try {
    const constraint = await db.query(
      `SELECT pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conrelid = 'public.chat_messages'::regclass
         AND conname = 'chat_messages_kind_check'`,
    );
    kindCheck = constraint.rows[0]?.def || "";
  } catch {
    kindCheck = "";
  }

  const hasAttachments =
    present.has("attachment_url") &&
    present.has("attachment_name") &&
    present.has("attachment_mime");
  const kindSupportsMedia = /image/.test(kindCheck) && /file/.test(kindCheck);

  return {
    ok: hasAttachments && kindSupportsMedia && present.has("kind"),
    columns: {
      kind: present.has("kind"),
      context_type: present.has("context_type"),
      attachment_url: present.has("attachment_url"),
      attachment_name: present.has("attachment_name"),
      attachment_mime: present.has("attachment_mime"),
    },
    kindCheck: kindCheck || null,
    hasAttachments,
    kindSupportsMedia,
  };
}

async function ensureChatMigrations() {
  const client = await pool.connect();
  try {
    const before = await queryChatSchemaStatus(client);
    if (before.ok) {
      console.log("[db] Chat schema OK (ảnh/tệp đính kèm).");
      return before;
    }

    if (!fs.existsSync(CHAT_FIX_SQL)) {
      console.warn(`[db] WARN: Thiếu file migration ${CHAT_FIX_SQL}`);
      return before;
    }

    const sql = fs.readFileSync(CHAT_FIX_SQL, "utf8");
    console.log("[db] Áp dụng chat_messages_image_file_fix.sql …");
    await client.query(sql);

    const after = await queryChatSchemaStatus(client);
    if (after.ok) {
      console.log("[db] Chat schema đã cập nhật — gửi ảnh/tệp sẵn sàng.");
    } else {
      console.warn("[db] WARN: Chat schema vẫn thiếu sau migration:", JSON.stringify(after));
    }
    return after;
  } catch (error) {
    console.error("[db] Chat migration failed:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ensureChatMigrations, queryChatSchemaStatus };
