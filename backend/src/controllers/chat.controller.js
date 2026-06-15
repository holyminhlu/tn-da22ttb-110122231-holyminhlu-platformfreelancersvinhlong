const path = require("path");
const { pool } = require("../db/pool");
const { verifyAccessToken } = require("../utils/authTokens");
const { parseUuidParam } = require("../utils/validators");
const { notifyChatMessage } = require("../utils/notificationService");
const { uploadChatAttachment, imageMime } = require("../middleware/chatAttachmentUpload");
const {
  queryClientIdentityVerified,
  IDENTITY_NOT_VERIFIED_CHAT_MESSAGE,
} = require("../utils/clientIdentityVerified");

async function assertClientCanMessage(db, role, userId, res) {
  if (String(role || "").toLowerCase() !== "client") return true;
  const verified = await queryClientIdentityVerified(db, userId);
  if (verified) return true;
  res.status(403).json({
    message: IDENTITY_NOT_VERIFIED_CHAT_MESSAGE,
    code: "IDENTITY_NOT_VERIFIED",
  });
  return false;
}

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
    attachmentUrl: row.attachment_url || null,
    attachmentName: row.attachment_name || null,
    attachmentMime: row.attachment_mime || null,
    createdAt: row.created_at,
    mine: String(row.sender_id) === String(viewerId),
  };
}

async function isMessagingBlocked(db, userA, userB) {
  const result = await db.query(
    `SELECT 1
     FROM public.chat_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [userA, userB],
  );
  return result.rowCount > 0;
}

function getPeerIdFromConversation(conversation, viewerId) {
  return String(conversation.client_id) === String(viewerId)
    ? conversation.freelancer_id
    : conversation.client_id;
}

async function getPeerLastReadAt(db, conversation, viewerId) {
  const peerId = getPeerIdFromConversation(conversation, viewerId);
  const result = await db.query(
    `SELECT last_read_at
     FROM public.chat_conversation_user_state
     WHERE conversation_id = $1 AND user_id = $2
     LIMIT 1`,
    [conversation.id, peerId],
  );
  return result.rows[0]?.last_read_at || null;
}

async function markConversationRead(db, conversationId, userId) {
  const upsert = await db.query(
    `INSERT INTO public.chat_conversation_user_state (conversation_id, user_id, last_read_at, hidden_at)
     VALUES ($1, $2, NOW(), NULL)
     ON CONFLICT (conversation_id, user_id)
     DO UPDATE SET
       last_read_at = GREATEST(
         COALESCE(public.chat_conversation_user_state.last_read_at, '-infinity'::timestamptz),
         NOW()
       ),
       hidden_at = NULL
     RETURNING last_read_at`,
    [conversationId, userId],
  );
  return upsert.rows[0]?.last_read_at || new Date().toISOString();
}

async function getPeerBlockState(db, viewerId, peerId) {
  const blockedByMe = await db.query(
    `SELECT 1 FROM public.chat_blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1`,
    [viewerId, peerId],
  );
  const blockedByPeer = await db.query(
    `SELECT 1 FROM public.chat_blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1`,
    [peerId, viewerId],
  );
  return {
    blockedByMe: blockedByMe.rowCount > 0,
    blockedByPeer: blockedByPeer.rowCount > 0,
    isBlocked: blockedByMe.rowCount > 0 || blockedByPeer.rowCount > 0,
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
    blockedByMe: Boolean(row.blocked_by_me),
    blockedByPeer: Boolean(row.blocked_by_peer),
    lastMessageBody: row.last_message_body || null,
    lastMessageAt: row.last_message_at || null,
    lastMessageSenderId: row.last_message_sender_id || null,
    hasUnread: Boolean(row.has_unread),
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
  COALESCE(ct_fl.completed_jobs, 0)::int AS freelancer_completed_jobs,
  EXISTS (
    SELECT 1 FROM public.chat_blocks cb
    WHERE cb.blocker_id = $1
      AND cb.blocked_id = CASE WHEN c.client_id = $1 THEN c.freelancer_id ELSE c.client_id END
  ) AS blocked_by_me,
  EXISTS (
    SELECT 1 FROM public.chat_blocks cb
    WHERE cb.blocker_id = CASE WHEN c.client_id = $1 THEN c.freelancer_id ELSE c.client_id END
      AND cb.blocked_id = $1
  ) AS blocked_by_peer,
  (
    lm.sender_id IS NOT NULL
    AND lm.sender_id <> $1
    AND (
      cus.last_read_at IS NULL
      OR lm.created_at > cus.last_read_at
    )
  ) AS has_unread
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
  LEFT JOIN public.chat_conversation_user_state cus
    ON cus.conversation_id = c.id AND cus.user_id = $1
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
       WHERE (c.client_id = $1 OR c.freelancer_id = $1)
         AND (cus.hidden_at IS NULL OR lm.created_at IS NULL OR lm.created_at > cus.hidden_at)
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

    if (!(await assertClientCanMessage(dbClient, role, userId, res))) {
      return;
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
       WHERE c.id = $2
       LIMIT 1`,
      [userId, conversationId],
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
  const search = String(req.query.q || "").trim().toLowerCase();
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
    let searchSql = "";
    if (search) {
      params.push(`%${search}%`);
      searchSql = `AND (LOWER(m.body) LIKE $${params.length} OR LOWER(COALESCE(m.attachment_name, '')) LIKE $${params.length})`;
    }

    const result = await dbClient.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.kind, m.context_type,
              m.attachment_url, m.attachment_name, m.attachment_mime, m.created_at
       FROM public.chat_messages m
       WHERE m.conversation_id = $1
         ${afterSql}
         ${searchSql}
       ORDER BY m.created_at ASC
       LIMIT $2`,
      params,
    );

    const peerLastReadAt = await getPeerLastReadAt(dbClient, conversation, payload.sub);

    return res.json({
      messages: result.rows.map((row) => mapMessageRow(row, payload.sub)),
      peerLastReadAt,
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

async function persistChatMessage(
  db,
  {
    conversationId,
    senderId,
    body,
    kind = "text",
    attachmentUrl = null,
    attachmentName = null,
    attachmentMime = null,
  },
) {
  const insert = await db.query(
    `INSERT INTO public.chat_messages (
       conversation_id, sender_id, body, kind,
       attachment_url, attachment_name, attachment_mime
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, conversation_id, sender_id, body, kind, context_type,
               attachment_url, attachment_name, attachment_mime, created_at`,
    [conversationId, senderId, body, kind, attachmentUrl, attachmentName, attachmentMime],
  );

  await db.query(`UPDATE public.chat_conversations SET updated_at = NOW() WHERE id = $1`, [
    conversationId,
  ]);

  await db.query(
    `INSERT INTO public.chat_conversation_user_state (conversation_id, user_id, hidden_at)
     VALUES ($1, $2, NULL)
     ON CONFLICT (conversation_id, user_id)
     DO UPDATE SET hidden_at = NULL`,
    [conversationId, senderId],
  );

  return insert.rows[0];
}

async function sendMessage(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const conversationId = parseUuidParam(req.params.conversationId);
  const body = String(req.body?.body || "").trim();
  const kindParam = String(req.body?.kind || "text").toLowerCase();
  const attachmentUrl = String(req.body?.attachmentUrl || "").trim() || null;
  const attachmentName = String(req.body?.attachmentName || "").trim() || null;
  const attachmentMime = String(req.body?.attachmentMime || "").trim() || null;

  if (!conversationId) {
    return res.status(400).json({ message: "Mã cuộc trò chuyện không hợp lệ." });
  }

  let kind = "text";
  if (kindParam === "image" && attachmentUrl) kind = "image";
  else if (kindParam === "file" && attachmentUrl) kind = "file";

  if (kind === "text" && (!body || body.length > 4000)) {
    return res.status(400).json({ message: "Nội dung tin nhắn không hợp lệ (tối đa 4000 ký tự)." });
  }
  if ((kind === "image" || kind === "file") && !attachmentUrl) {
    return res.status(400).json({ message: "Thiếu tệp đính kèm." });
  }

  const displayBody =
    body ||
    (kind === "image" ? "Đã gửi ảnh" : kind === "file" ? attachmentName || "Đã gửi tệp" : "");

  const dbClient = await pool.connect();
  try {
    const conversation = await assertConversationAccess(dbClient, conversationId, payload.sub);
    if (!conversation) {
      return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại hoặc bạn không có quyền." });
    }

    if (!(await assertClientCanMessage(dbClient, payload.role, payload.sub, res))) {
      return;
    }

    const peerId =
      String(conversation.client_id) === String(payload.sub)
        ? conversation.freelancer_id
        : conversation.client_id;

    if (await isMessagingBlocked(dbClient, payload.sub, peerId)) {
      return res.status(403).json({ message: "Không thể gửi tin nhắn. Cuộc trò chuyện đã bị chặn." });
    }

    const row = await persistChatMessage(dbClient, {
      conversationId,
      senderId: payload.sub,
      body: displayBody,
      kind,
      attachmentUrl,
      attachmentName,
      attachmentMime,
    });

    const message = mapMessageRow(row, payload.sub);

    notifyChatMessage(dbClient, conversation, payload.sub, displayBody).catch((err) =>
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

async function markConversationReadHandler(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const conversationId = parseUuidParam(req.params.conversationId);
  if (!conversationId) {
    return res.status(400).json({ message: "Mã cuộc trò chuyện không hợp lệ." });
  }

  const dbClient = await pool.connect();
  try {
    const conversation = await assertConversationAccess(dbClient, conversationId, payload.sub);
    if (!conversation) {
      return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại hoặc bạn không có quyền." });
    }

    const readAt = await markConversationRead(dbClient, conversationId, payload.sub);
    return res.json({ ok: true, readAt });
  } catch (error) {
    console.error("markConversationRead failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng chat. Chạy backend/sql/chat_features.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể cập nhật trạng thái đã xem." });
  } finally {
    dbClient.release();
  }
}

async function hideConversation(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const conversationId = parseUuidParam(req.params.conversationId);
  if (!conversationId) {
    return res.status(400).json({ message: "Mã cuộc trò chuyện không hợp lệ." });
  }

  const dbClient = await pool.connect();
  try {
    const conversation = await assertConversationAccess(dbClient, conversationId, payload.sub);
    if (!conversation) {
      return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại hoặc bạn không có quyền." });
    }

    await dbClient.query(
      `INSERT INTO public.chat_conversation_user_state (conversation_id, user_id, hidden_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (conversation_id, user_id)
       DO UPDATE SET hidden_at = NOW()`,
      [conversationId, payload.sub],
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error("hideConversation failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng chat. Chạy backend/sql/chat_features.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể xóa hội thoại." });
  } finally {
    dbClient.release();
  }
}

async function blockPeer(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const conversationId = parseUuidParam(req.params.conversationId);
  if (!conversationId) {
    return res.status(400).json({ message: "Mã cuộc trò chuyện không hợp lệ." });
  }

  const dbClient = await pool.connect();
  try {
    const conversation = await assertConversationAccess(dbClient, conversationId, payload.sub);
    if (!conversation) {
      return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại hoặc bạn không có quyền." });
    }

    const peerId =
      String(conversation.client_id) === String(payload.sub)
        ? conversation.freelancer_id
        : conversation.client_id;

    await dbClient.query(
      `INSERT INTO public.chat_blocks (blocker_id, blocked_id)
       VALUES ($1, $2)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [payload.sub, peerId],
    );

    return res.json({ ok: true, blocked: true });
  } catch (error) {
    console.error("blockPeer failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng chat. Chạy backend/sql/chat_features.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể chặn tin nhắn." });
  } finally {
    dbClient.release();
  }
}

async function unblockPeer(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const conversationId = parseUuidParam(req.params.conversationId);
  if (!conversationId) {
    return res.status(400).json({ message: "Mã cuộc trò chuyện không hợp lệ." });
  }

  const dbClient = await pool.connect();
  try {
    const conversation = await assertConversationAccess(dbClient, conversationId, payload.sub);
    if (!conversation) {
      return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại hoặc bạn không có quyền." });
    }

    const peerId =
      String(conversation.client_id) === String(payload.sub)
        ? conversation.freelancer_id
        : conversation.client_id;

    await dbClient.query(
      `DELETE FROM public.chat_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [payload.sub, peerId],
    );

    return res.json({ ok: true, blocked: false });
  } catch (error) {
    console.error("unblockPeer failed:", error.message);
    if (error.code === "42P01") {
      return res.status(503).json({
        message: "Thiếu bảng chat. Chạy backend/sql/chat_features.sql trên PostgreSQL.",
      });
    }
    return res.status(500).json({ message: "Không thể bỏ chặn." });
  } finally {
    dbClient.release();
  }
}

function uploadAttachment(req, res) {
  const payload = verifyAccessToken(req, res);
  if (!payload) return;

  const conversationId = parseUuidParam(req.params.conversationId);
  if (!conversationId) {
    return res.status(400).json({ message: "Mã cuộc trò chuyện không hợp lệ." });
  }

  const handler = uploadChatAttachment.single("file");
  handler(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || "Không thể tải tệp lên." });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Thiếu tệp đính kèm." });
    }

    const dbClient = await pool.connect();
    try {
      const conversation = await assertConversationAccess(dbClient, conversationId, payload.sub);
      if (!conversation) {
        return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại hoặc bạn không có quyền." });
      }

      if (!(await assertClientCanMessage(dbClient, payload.role, payload.sub, res))) {
        return;
      }

      const mime = String(file.mimetype || "").toLowerCase();
      const kind = imageMime.has(mime) || mime.startsWith("image/") ? "image" : "file";
      const url = `/uploads/chat/${file.filename}`;

      return res.status(201).json({
        attachment: {
          url,
          name: file.originalname || file.filename,
          mime,
          kind,
        },
      });
    } catch (error) {
      console.error("uploadAttachment failed:", error.message);
      return res.status(500).json({ message: "Không thể tải tệp lên." });
    } finally {
      dbClient.release();
    }
  });
}

module.exports = {
  listConversations,
  openConversation,
  listMessages,
  sendMessage,
  markConversationReadHandler,
  hideConversation,
  blockPeer,
  unblockPeer,
  uploadAttachment,
  assertConversationAccess,
  persistChatMessage,
  markConversationRead,
  getPeerLastReadAt,
  getPeerIdFromConversation,
  isMessagingBlocked,
  mapMessageRow,
  getPeerBlockState,
};
