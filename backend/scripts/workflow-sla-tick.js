#!/usr/bin/env node
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { pool } = require("../src/db/pool");
const { runWorkflowSlaTick } = require("../src/utils/workflowSla");

async function main() {
  const db = await pool.connect();
  try {
    const summary = await runWorkflowSlaTick(db);
    console.log("[workflow-sla-tick]", new Date().toISOString(), summary);
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[workflow-sla-tick] failed:", err.message);
  process.exit(1);
});
