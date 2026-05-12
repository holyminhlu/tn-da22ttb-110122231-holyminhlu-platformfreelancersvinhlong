const path = require("path");
const express = require("express");
const cors = require("cors");

require("dotenv").config({
  path: path.resolve(__dirname, "..", "..", ".env"),
});

const { pool, query } = require("./db/pool");
const authRoutes = require("./routes/auth.routes");
const jobsRoutes = require("./routes/jobs.routes");
const servicesRoutes = require("./routes/services.routes");

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
app.use("/api/jobs", jobsRoutes);
app.use("/api/services", servicesRoutes);

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
