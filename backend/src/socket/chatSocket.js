const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");
const { ACCESS_SECRET } = require("../utils/authTokens");
const {
  assertConversationAccess,
  persistChatMessage,
  markConversationRead,
  isMessagingBlocked,
  mapMessageRow,
} = require("../controllers/chat.controller");
const { notifyChatMessage } = require("../utils/notificationService");

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
    socket.join(`user:${socket.userId}`);

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

    socket.on("chat:read", async ({ conversationId }, ack) => {
      if (!conversationId) {
        if (typeof ack === "function") ack({ ok: false, error: "Thiếu mã cuộc trò chuyện." });
        return;
      }

      const db = await pool.connect();
      try {
        const conversation = await assertConversationAccess(db, conversationId, socket.userId);
        if (!conversation) {
          if (typeof ack === "function") ack({ ok: false, error: "Không có quyền." });
          return;
        }

        const readAt = await markConversationRead(db, conversationId, socket.userId);
        io.to(`conv:${conversationId}`).emit("chat:read", {
          conversationId,
          userId: socket.userId,
          readAt,
        });
        if (typeof ack === "function") ack({ ok: true, readAt });
      } catch (error) {
        console.error("chat:read socket failed:", error.message);
        if (typeof ack === "function") ack({ ok: false, error: "Không thể cập nhật đã xem." });
      } finally {
        db.release();
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

        const peerId =
          String(conversation.client_id) === String(socket.userId)
            ? conversation.freelancer_id
            : conversation.client_id;

        if (await isMessagingBlocked(db, socket.userId, peerId)) {
          if (typeof ack === "function") {
            ack({ ok: false, error: "Không thể gửi tin nhắn. Cuộc trò chuyện đã bị chặn." });
          }
          return;
        }

        const row = await persistChatMessage(db, {
          conversationId,
          senderId: socket.userId,
          body: text,
          kind: "text",
        });

        const message = mapMessageRow(row, socket.userId);

        io.to(`conv:${conversationId}`).emit("chat:message", message);
        notifyChatMessage(db, conversation, socket.userId, text).catch((err) =>
          console.error("notifyChatMessage failed:", err.message),
        );
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
