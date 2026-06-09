const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { parseUuidParam } = require("../utils/validators");
const { notifyChatMessage } = require("../utils/notificationService");

async function assertConversationAccess(db, conversationId, userId) {
  const result = await db.query(
    `SELECT id, client_id, freelancer_id, job_quote_id, created_at, updated_at
     FROM public.chat_conversations
     WHERE id = $1
       AND (client_id = $2 OR freelancer_id = $2)
     LIMIT 1`,
    [conversationId, userId],
  );
  return result.rows[0] || null;
}

async function resolveFreelancerUser(db, freelancerId) {
  const result = await db.query(
    `SELECT u.id, u.role, COALESCE(up.full_name, u.email) AS display_name, up.avatar_url
     FROM public.users u
     LEFT JOIN public.user_profiles up ON up.user_id = u.id
     WHERE u.id = $1 AND u.deleted_at IS NULL AND u.role = 'freelancer' AND u.status = 'active'
     LIMIT 1`,
    [freelancerId],
  );
  return result.rows[0] || null;
}

function mapMessageRow(row, viewerId) {
  const kind = row.kind || "text";
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    kind,
    contextType: row.context_type || null,
    createdAt: row.created_at,
    mine: String(row.sender_id) === String(viewerId),
  };
}

function mapConversationRow(row, viewerId) {
  const isClient = String(row.client_id) === String(viewerId);
  const contextTitle = row.context_title || row.job_title || row.service_title || null;
  const contextType = row.job_quote_id ? "job" : row.service_id ? "service" : null;
  return {
    id: row.id,
    clientId: row.client_id,
    freelancerId: row.freelancer_id,
    jobQuoteId: row.job_quote_id,
    serviceId: row.service_id || null,
    contextTitle,
    contextType,
    jobTitle: contextTitle,
    quoteStatus: row.quote_status || null,
    peerId: isClient ? row.freelancer_id : row.client_id,
    peerName: isClient ? row.freelancer_name : row.client_name,
    peerAvatarUrl: isClient ? row.freelancer_avatar_url : row.client_avatar_url,
    peerCompletedJobs: isClient ? Number(row.freelancer_completed_jobs) || 0 : null,
    lastMessageBody: row.last_message_body || null,
    lastMessageAt: row.last_message_at || null,
    lastMessageSenderId: row.last_message_sender_id || null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

async function resolveChatContext(db, { jobQuoteId, serviceId, contextTitleParam, freelancerId }) {
  let contextTitle = String(contextTitleParam || "").trim() || null;
  let contextType = null;
  let resolvedJobQuoteId = jobQuoteId || null;
  let resolvedServiceId = serviceId || null;

  if (jobQuoteId) {
    const quote = await db.query(
      `SELECT jq.id, j.title
       FROM public.job_quotes jq
       INNER JOIN public.jobs j ON j.id = jq.job_id
       WHERE jq.id = $1
       LIMIT 1`,
      [jobQuoteId],
    );
    if (quote.rowCount === 0) {
      resolvedJobQuoteId = null;
    } else {
      contextTitle = contextTitle || quote.rows[0].title;
      contextType = "job";
      resolvedServiceId = null;
    }
  } else if (serviceId) {
    const service = await db.query(
      `SELECT id, title
       FROM public.services
       WHERE id = $1 AND freelancer_id = $2
       LIMIT 1`,
      [serviceId, freelancerId],
    );
    if (service.rowCount === 0) {
      resolvedServiceId = null;
    } else {
      contextTitle = contextTitle || service.rows[0].title;
      contextType = "service";
      resolvedJobQuoteId = null;
    }
  } else if (contextTitle) {
    contextType = "job";
  }

  return {
    contextTitle,
    contextType,
    jobQuoteId: resolvedJobQuoteId,
    serviceId: resolvedServiceId,
  };
}

function contextFingerprint(row) {
  return [
    row?.job_quote_id || "",
    row?.service_id || "",
    String(row?.context_title || "").trim(),
  ].join("|");
}

async function insertContextMessage(db, { conversationId, senderId, title, contextType }) {
  const insert = await db.query(
    `INSERT INTO public.chat_messages (conversation_id, sender_id, body, kind, context_type)
     VALUES ($1, $2, $3, 'context', $4)
     RETURNING id, conversation_id, sender_id, body, kind, context_type, created_at`,
    [conversationId, senderId, title, contextType],
  );
  return insert.rows[0];
}

const CONVERSATION_DETAIL_SELECT = `
  c.id,
  c.client_id,
  c.freelancer_id,
  c.job_quote_id,
  c.service_id,
  c.context_title,
  c.created_at,
  c.updated_at,
  COALESCE(up_client.full_name, u_client.email) AS client_name,
  up_client.avatar_url AS client_avatar_url,
  COALESCE(up_fl.full_name, u_fl.email) AS freelancer_name,
  up_fl.avatar_url AS freelancer_avatar_url,
  j.title AS job_title,
  s.title AS service_title,
  jq.status AS quote_status,
  lm.body AS last_message_body,
  lm.created_at AS last_message_at,
  lm.sender_id AS last_message_sender_id,
  COALESCE(ct_fl.completed_jobs, 0)::int AS freelancer_completed_jobs
`;

const CONVERSATION_DETAIL_JOINS = `
  INNER JOIN public.users u_client ON u_client.id = c.client_id
  LEFT JOIN public.user_profiles up_client ON up_client.user_id = c.client_id
  INNER JOIN public.users u_fl ON u_fl.id = c.freelancer_id
  LEFT JOIN public.user_profiles up_fl ON up_fl.user_id = c.freelancer_id
  LEFT JOIN public.job_quotes jq ON jq.id = c.job_quote_id
  LEFT JOIN public.jobs j ON j.id = jq.job_id
  LEFT JOIN public.services s ON s.id = c.service_id
  LEFT JOIN LATERAL (
    SELECT m.body, m.created_at, m.sender_id
    FROM public.chat_messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN (
    SELECT freelancer_id, COUNT(*)::int AS completed_jobs
    FROM public.contracts
    WHERE status = 'completed' AND deleted_at IS NULL
    GROUP BY freelancer_id
  ) ct_fl ON ct_fl.freelancer_id = c.freelancer_id
`;

async function listConversations(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const dbClient = await pool.connect();
  try {
    const result = await dbClient.query(
      `SELECT ${CONVERSATION_DETAIL_SELECT}
       FROM public.chat_conversations c
       ${CONVERSATION_DETAIL_JOINS}
       WHERE c.client_id = $1 OR c.freelancer_id = $1
       ORDER BY COALESCE(lm.created_at, c.updated_at) DESC`,
      [userId],
    );

    return res.json({
      conversations: result.rows.map((row) => mapConversationRow(row, userId)),
    });
  } catch (error) {
    console.error("listConversations failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng chat. Chạy backend/sql/chat_messages.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải danh sách tin nhắn." });
  } finally {
    dbClient.release();
  }
}

async function openConversation(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const userId = payload.sub;
  const role = String(payload.role || "").toLowerCase();
  const freelancerId = parseUuidParam(req.body?.freelancerId);
  const clientIdParam = parseUuidParam(req.body?.clientId);
  const jobQuoteId = parseUuidParam(req.body?.jobQuoteId);
  const serviceId = parseUuidParam(req.body?.serviceId);
  const contextTitleParam = String(req.body?.contextTitle || "").trim();

  let clientId;
  let freelancerIdFinal;

  if (role === "client") {
    if (!freelancerId) {
      return res.status(400).json({ message: "Thiếu mã freelancer." });
    }
    clientId = userId;
    freelancerIdFinal = freelancerId;
  } else if (role === "freelancer") {
    if (!clientIdParam) {
      return res.status(400).json({ message: "Thiếu mã client." });
    }
    clientId = clientIdParam;
    freelancerIdFinal = userId;
  } else {
    return res.status(403).json({ message: "Chỉ client hoặc freelancer được sử dụng chat." });
  }

  const dbClient = await pool.connect();
  try {
    const freelancer = await resolveFreelancerUser(dbClient, freelancerIdFinal);
    if (!freelancer) {
      return res.status(404).json({ message: "Không tìm thấy freelancer." });
    }

    const clientCheck = await dbClient.query(
      `SELECT id FROM public.users
       WHERE id = $1 AND deleted_at IS NULL AND role = 'client' AND status = 'active'
       LIMIT 1`,
      [clientId],
    );
    if (clientCheck.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy client." });
    }

    const existing = await dbClient.query(
      `SELECT id, job_quote_id, service_id, context_title
       FROM public.chat_conversations
       WHERE client_id = $1 AND freelancer_id = $2
       LIMIT 1`,
      [clientId, freelancerIdFinal],
    );

    const context = await resolveChatContext(dbClient, {
      jobQuoteId,
      serviceId,
      contextTitleParam,
      freelancerId: freelancerIdFinal,
    });

    const upsert = await dbClient.query(
      `INSERT INTO public.chat_conversations (
         client_id, freelancer_id, job_quote_id, service_id, context_title
       )
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (client_id, freelancer_id)
       DO UPDATE SET
         updated_at = NOW(),
         job_quote_id = CASE
           WHEN EXCLUDED.service_id IS NOT NULL THEN NULL
           WHEN EXCLUDED.job_quote_id IS NOT NULL THEN EXCLUDED.job_quote_id
           ELSE public.chat_conversations.job_quote_id
         END,
         service_id = CASE
           WHEN EXCLUDED.job_quote_id IS NOT NULL THEN NULL
           WHEN EXCLUDED.service_id IS NOT NULL THEN EXCLUDED.service_id
           ELSE public.chat_conversations.service_id
         END,
         context_title = CASE
           WHEN EXCLUDED.context_title IS NOT NULL THEN EXCLUDED.context_title
           ELSE public.chat_conversations.context_title
         END
       RETURNING id, client_id, freelancer_id, job_quote_id, service_id, context_title, created_at, updated_at`,
      [
        clientId,
        freelancerIdFinal,
        context.jobQuoteId,
        context.serviceId,
        context.contextTitle,
      ],
    );

    const conversationId = upsert.rows[0].id;
    const prevRow = existing.rows[0] || null;
    const nextRow = upsert.rows[0];
    let contextMessage = null;

    if (
      context.contextTitle &&
      context.contextType &&
      contextFingerprint(prevRow) !== contextFingerprint(nextRow)
    ) {
      const inserted = await insertContextMessage(dbClient, {
        conversationId,
        senderId: userId,
        title: context.contextTitle,
        contextType: context.contextType,
      });
      contextMessage = mapMessageRow(inserted, userId);
    }

    const detail = await dbClient.query(
      `SELECT ${CONVERSATION_DETAIL_SELECT}
       FROM public.chat_conversations c
       ${CONVERSATION_DETAIL_JOINS}
       WHERE c.id = $1
       LIMIT 1`,
      [conversationId],
    );

    return res.json({
      conversation: mapConversationRow(detail.rows[0], userId),
      contextMessage,
    });
  } catch (error) {
    console.error("openConversation failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng chat. Chạy backend/sql/chat_messages.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể mở cuộc trò chuyện." });
  } finally {
    dbClient.release();
  }
}

async function listMessages(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const conversationId = parseUuidParam(req.params.conversationId);
  if (!conversationId) {
    return res.status(400).json({ message: "Mã cuộc trò chuyện không hợp lệ." });
  }

  const after = req.query.after ? String(req.query.after) : null;
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || ""), 10) || 80, 1), 200);

  const dbClient = await pool.connect();
  try {
    const conversation = await assertConversationAccess(dbClient, conversationId, payload.sub);
    if (!conversation) {
      return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại hoặc bạn không có quyền." });
    }

    const params = [conversationId, limit];
    let afterSql = "";
    if (after) {
      params.push(after);
      afterSql = `AND m.created_at > $${params.length}::timestamptz`;
    }

    const result = await dbClient.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.kind, m.context_type, m.created_at
       FROM public.chat_messages m
       WHERE m.conversation_id = $1
         ${afterSql}
       ORDER BY m.created_at ASC
       LIMIT $2`,
      params,
    );

    return res.json({
      messages: result.rows.map((row) => mapMessageRow(row, payload.sub)),
    });
  } catch (error) {
    console.error("listMessages failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng chat. Chạy backend/sql/chat_messages.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể tải tin nhắn." });
  } finally {
    dbClient.release();
  }
}

async function sendMessage(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const conversationId = parseUuidParam(req.params.conversationId);
  const body = String(req.body?.body || "").trim();
  if (!conversationId) {
    return res.status(400).json({ message: "Mã cuộc trò chuyện không hợp lệ." });
  }
  if (!body || body.length > 4000) {
    return res.status(400).json({ message: "Nội dung tin nhắn không hợp lệ (tối đa 4000 ký tự)." });
  }

  const dbClient = await pool.connect();
  try {
    const conversation = await assertConversationAccess(dbClient, conversationId, payload.sub);
    if (!conversation) {
      return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại hoặc bạn không có quyền." });
    }

    const insert = await dbClient.query(
      `INSERT INTO public.chat_messages (conversation_id, sender_id, body, kind)
       VALUES ($1, $2, $3, 'text')
       RETURNING id, conversation_id, sender_id, body, kind, context_type, created_at`,
      [conversationId, payload.sub, body],
    );

    await dbClient.query(
      `UPDATE public.chat_conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId],
    );

    const message = mapMessageRow(insert.rows[0], payload.sub);

    notifyChatMessage(dbClient, conversation, payload.sub, body).catch((err) =>
      console.error("notifyChatMessage failed:", err.message),
    );

    return res.status(201).json({ message });
  } catch (error) {
    console.error("sendMessage failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng chat. Chạy backend/sql/chat_messages.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể gửi tin nhắn." });
  } finally {
    dbClient.release();
  }
}

module.exports = {
  listConversations,
  openConversation,
  listMessages,
  sendMessage,
  assertConversationAccess,
};
