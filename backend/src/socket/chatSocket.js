const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");
const { ACCESS_SECRET } = require("../utils/authTokens");
const { assertConversationAccess } = require("../controllers/chat.controller");

function initChatSocket(httpServer, frontendUrl) {
  const io = new Server(httpServer, {
    cors: {
      origin: frontendUrl,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Thiếu access token."));
    }
    try {
      const payload = jwt.verify(String(token), ACCESS_SECRET);
      socket.userId = payload.sub;
      socket.userRole = payload.role;
      next();
    } catch {
      next(new Error("Access token không hợp lệ."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("chat:join", async ({ conversationId }, ack) => {
      try {
        const db = await pool.connect();
        try {
          const conversation = await assertConversationAccess(db, conversationId, socket.userId);
          if (!conversation) {
            if (typeof ack === "function") ack({ ok: false, error: "Không có quyền tham gia phòng chat." });
            return;
          }
          socket.join(`conv:${conversationId}`);
          if (typeof ack === "function") ack({ ok: true });
        } finally {
          db.release();
        }
      } catch (error) {
        if (typeof ack === "function") ack({ ok: false, error: error.message });
      }
    });

    socket.on("chat:send", async ({ conversationId, body }, ack) => {
      const text = String(body || "").trim();
      if (!conversationId || !text || text.length > 4000) {
        if (typeof ack === "function") ack({ ok: false, error: "Nội dung tin nhắn không hợp lệ." });
        return;
      }

      const db = await pool.connect();
      try {
        const conversation = await assertConversationAccess(db, conversationId, socket.userId);
        if (!conversation) {
          if (typeof ack === "function") ack({ ok: false, error: "Không có quyền gửi tin nhắn." });
          return;
        }

        const insert = await db.query(
          `INSERT INTO public.chat_messages (conversation_id, sender_id, body)
           VALUES ($1, $2, $3)
           RETURNING id, conversation_id, sender_id, body, created_at`,
          [conversationId, socket.userId, text],
        );

        await db.query(`UPDATE public.chat_conversations SET updated_at = NOW() WHERE id = $1`, [
          conversationId,
        ]);

        const row = insert.rows[0];
        const message = {
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          body: row.body,
          createdAt: row.created_at,
        };

        io.to(`conv:${conversationId}`).emit("chat:message", message);
        if (typeof ack === "function") ack({ ok: true, message });
      } catch (error) {
        console.error("chat:send socket failed:", error.message);
        if (typeof ack === "function") ack({ ok: false, error: "Không thể gửi tin nhắn." });
      } finally {
        db.release();
      }
    });
  });

  return io;
}

module.exports = { initChatSocket };
