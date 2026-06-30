const http = require("http");
const express = require("express");
const cors = require("cors");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn(
    "[auth] Thiếu JWT_ACCESS_SECRET hoặc JWT_REFRESH_SECRET trong .env — token sẽ không hợp lệ.",
  );
}

if (
  !process.env.GOOGLE_CLIENT_ID ||
  !process.env.GOOGLE_CLIENT_SECRET ||
  process.env.GOOGLE_CLIENT_ID === "your-google-client-id"
) {
  console.warn(
    "[auth] Google OAuth chưa cấu hình — sao chép .env.example thành .env và điền GOOGLE_CLIENT_ID/SECRET.",
  );
}

if (
  !process.env.PAYOS_CLIENT_ID ||
  !process.env.PAYOS_API_KEY ||
  !process.env.PAYOS_CHECKSUM_KEY ||
  process.env.PAYOS_CLIENT_ID === "your-payos-client-id"
) {
  console.warn(
    "[payments] payOS chưa cấu hình — nạp tiền ví cần PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY.",
  );
}

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your-gemini-api-key") {
  console.warn(
    "[ai] Gemini chưa cấu hình — gợi ý AI so sánh báo giá cần GEMINI_API_KEY trong .env (lấy tại https://aistudio.google.com/apikey).",
  );
}

const { pool, query } = require("./db/pool");
const { ensureChatMigrations, queryChatSchemaStatus } = require("./db/ensureChatMigrations");
const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const contractsRoutes = require("./routes/contracts.routes");
const contractsLegacyRoutes = require("./routes/contracts.legacy.routes");
const freelancersRoutes = require("./routes/freelancers.routes");
const jobsRoutes = require("./routes/jobs.routes");
const jobsMeRoutes = require("./routes/jobs.me.routes");
const jobsLegacyRoutes = require("./routes/jobs.legacy.routes");
const servicesRoutes = require("./routes/services.routes");
const servicesMeRoutes = require("./routes/services.me.routes");
const servicesLegacyRoutes = require("./routes/services.legacy.routes");
const paymentsRoutes = require("./routes/payments.routes");
const chatRoutes = require("./routes/chat.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const adminRoutes = require("./routes/admin.routes");
const supportRoutes = require("./routes/support.routes");
const contactRoutes = require("./routes/contact.routes");
const mapsRoutes = require("./routes/maps.routes");
const { initChatSocket } = require("./socket/chatSocket");
const { setNotificationIo } = require("./utils/notificationService");
const { runWorkflowSlaTick } = require("./utils/workflowSla");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use(express.json({ limit: "6mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/contracts", contractsRoutes);
app.use("/api/freelancers", freelancersRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/jobs/me", jobsMeRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/services/me", servicesMeRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/maps", mapsRoutes);

/** Legacy: /api/auth/me/*, /api/auth/freelancers, … */
app.use("/api/auth", usersRoutes);
app.use("/api/auth", contractsLegacyRoutes);
app.use("/api/auth/freelancers", freelancersRoutes);
app.use("/api/auth", jobsLegacyRoutes);
app.use("/api/auth", servicesLegacyRoutes);

app.get("/health", async (req, res) => {
  try {
    await query("SELECT 1 AS ok");
    const payload = { ok: true, service: "vl-connected-api", database: "connected" };
    if (String(req.query.chat || "") === "1") {
      const db = await pool.connect();
      try {
        payload.chat = await queryChatSchemaStatus(db);
        if (!payload.chat.ok) payload.ok = false;
      } finally {
        db.release();
      }
    }
    res.status(payload.ok ? 200 : 503).json(payload);
  } catch (err) {
    console.error("Health DB check failed:", err.message);
    res.status(503).json({
      ok: false,
      service: "vl-connected-api",
      database: "disconnected",
      error: err.message,
    });
  }
});

const httpServer = http.createServer(app);
const io = initChatSocket(httpServer, frontendUrl);
setNotificationIo(io);

const server = httpServer.listen(PORT, async () => {
  console.log(`API listening on http://localhost:${PORT}`);
  try {
    await query("SELECT current_database() AS db, version() AS version");
    console.log("PostgreSQL connection OK");
    await ensureChatMigrations();
  } catch (err) {
    console.error("PostgreSQL connection failed:", err.message);
  }
});

async function shutdown(signal) {
  console.log(`${signal} received, closing server and DB pool…`);
  server.close(() => {});
  await pool.end().catch(() => {});
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

const SLA_TICK_MS = Number(process.env.WORKFLOW_SLA_TICK_MS) || 60 * 60 * 1000;
if (process.env.WORKFLOW_SLA_CRON !== "0") {
  setInterval(() => {
    pool
      .connect()
      .then(async (db) => {
        try {
          const summary = await runWorkflowSlaTick(db);
          if (
            summary.expiredPreEscrow > 0 ||
            summary.autoAcceptDelivery > 0 ||
            summary.autoRefunds > 0
          ) {
            console.log("[workflow-sla-cron]", summary);
          }
        } finally {
          db.release();
        }
      })
      .catch((err) => console.error("[workflow-sla-cron] error:", err.message));
  }, SLA_TICK_MS);
  console.log(`Workflow SLA cron enabled (every ${Math.round(SLA_TICK_MS / 60000)} min)`);
}
