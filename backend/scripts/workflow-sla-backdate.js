#!/usr/bin/env node
/**
 * Backdate SLA deadline để test cron (dev only).
 * Usage: node backend/scripts/workflow-sla-backdate.js <contractId> <hoursAgo>
 * Example: node backend/scripts/workflow-sla-backdate.js abc-uuid 1
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { pool } = require("../src/db/pool");

async function main() {
  const contractId = process.argv[2];
  const hoursAgo = Number(process.argv[3] || 1);
  if (!contractId) {
    console.error("Usage: workflow-sla-backdate.js <contractId> [hoursAgo=1]");
    process.exit(1);
  }

  const db = await pool.connect();
  try {
    const { rows } = await db.query(
      `SELECT id, workflow_stage, stage_deadline_at, escrow_deadline_at, delivery_review_deadline_at
       FROM public.contracts WHERE id = $1`,
      [contractId],
    );
    if (!rows[0]) {
      console.error("Contract not found:", contractId);
      process.exit(1);
    }
    const row = rows[0];
    const stage = String(row.workflow_stage || "").toLowerCase();
    const past = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    if (stage === "delivery" && row.delivery_review_deadline_at) {
      await db.query(
        `UPDATE public.contracts SET delivery_review_deadline_at = $2::timestamptz WHERE id = $1`,
        [contractId, past],
      );
      console.log("Set delivery_review_deadline_at to", past);
    } else if (stage === "escrow") {
      await db.query(
        `UPDATE public.contracts
         SET stage_deadline_at = $2::timestamptz, escrow_deadline_at = $2::timestamptz
         WHERE id = $1`,
        [contractId, past],
      );
      console.log("Set escrow deadlines to", past);
    } else {
      await db.query(
        `UPDATE public.contracts SET stage_deadline_at = $2::timestamptz WHERE id = $1`,
        [contractId, past],
      );
      console.log("Set stage_deadline_at to", past);
    }
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
