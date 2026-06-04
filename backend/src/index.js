const express = require("express");
const cors = require("cors");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn(
    "[auth] Thiếu JWT_ACCESS_SECRET hoặc JWT_REFRESH_SECRET trong .env — token sẽ không hợp lệ.",
  );
}

const { pool, query } = require("./db/pool");
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

/** Legacy: /api/auth/me/*, /api/auth/freelancers, … */
app.use("/api/auth", usersRoutes);
app.use("/api/auth", contractsLegacyRoutes);
app.use("/api/auth/freelancers", freelancersRoutes);
app.use("/api/auth", jobsLegacyRoutes);
app.use("/api/auth", servicesLegacyRoutes);

app.get("/health", async (_req, res) => {
  try {
    await query("SELECT 1 AS ok");
    res.json({ ok: true, service: "vl-connected-api", database: "connected" });
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

const server = app.listen(PORT, async () => {
  console.log(`API listening on http://localhost:${PORT}`);
  try {
    await query("SELECT current_database() AS db, version() AS version");
    console.log("PostgreSQL connection OK");
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
